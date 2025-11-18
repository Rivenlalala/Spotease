// In-memory cache with TTL for API responses
// This reduces API calls while keeping data fresh

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTLSeconds: number = 60) {
    this.defaultTTL = defaultTTLSeconds * 1000;
  }

  set<T>(key: string, data: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Singleton cache instance with 30-second default TTL
// Short TTL ensures relatively fresh data while reducing API load
export const apiCache = new MemoryCache(30);

// Cache key generators
export const cacheKeys = {
  spotifyPlaylists: (userId: string) => `spotify:playlists:${userId}`,
  neteasePlaylists: (userId: string) => `netease:playlists:${userId}`,
  spotifyTracks: (playlistId: string) => `spotify:tracks:${playlistId}`,
  neteaseTracks: (playlistId: string) => `netease:tracks:${playlistId}`,
  trackPairings: () => "track:pairings:all",
  linkedPlaylists: (userId: string) => `linked:playlists:${userId}`,
};

// Cleanup expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      apiCache.cleanup();
    },
    5 * 60 * 1000,
  );
}
