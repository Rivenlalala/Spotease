# Image Display Fix - Album and Track Cover Images

**Date:** 2025-12-30
**Status:** Approved Design
**Priority:** High

## Problem Statement

Album and track cover images are not displaying anywhere in the application. Currently, placeholder music icons are shown instead of actual artwork from Spotify and NetEase Music APIs.

## Root Cause Analysis

1. **Spotify DTOs**: Missing image URL fields entirely, even though Spotify API provides them
2. **NetEase DTOs**: Has `picUrl` in nested `NeteaseAlbum` class but not propagated through data pipeline
3. **TrackMatch DTOs**: No image URL fields for source/destination tracks
4. **Playlist DTOs**: No cover image fields for playlist artwork
5. **Frontend Types**: TypeScript interfaces lack image URL properties
6. **UI Components**: Hardcoded to show placeholder icons instead of images

## Solution Design

### 1. Backend Data Layer Changes

#### 1.1 Update SpotifyTrack DTO
**File:** `spotease-backend/src/main/java/com/spotease/dto/spotify/SpotifyTrack.java`

Add field:
```java
private String albumImageUrl;
```

#### 1.2 Update SpotifyPlaylist DTO
**File:** `spotease-backend/src/main/java/com/spotease/dto/spotify/SpotifyPlaylist.java`

Add field:
```java
private String coverImageUrl;
```

#### 1.3 Update NeteasePlaylist DTO
**File:** `spotease-backend/src/main/java/com/spotease/dto/netease/NeteasePlaylist.java`

Add field:
```java
private String coverImageUrl;
```

Note: `NeteaseTrack` already has `picUrl` in the nested `NeteaseAlbum` class - no changes needed.

#### 1.4 Update TrackMatchDto
**File:** `spotease-backend/src/main/java/com/spotease/dto/TrackMatchDto.java`

Add fields:
```java
private String sourceImageUrl;
private String destinationImageUrl;
```

### 2. Backend Service Layer Changes

#### 2.1 SpotifyService - Track Mapping
**File:** `spotease-backend/src/main/java/com/spotease/service/SpotifyService.java`

Update `mapToSpotifyTrack()` method:
- Extract images from `track.getAlbum().getImages()`
- Spotify returns array of images sorted by size (typically 640x640, 300x300, 64x64)
- Select image closest to 300px width:
  - If array has 3+ images, use middle index (usually 300x300)
  - Otherwise find closest to 300px by comparing widths
  - Fallback to first image if selection logic fails
- Set `albumImageUrl` field

#### 2.2 SpotifyService - Playlist Mapping
Update `mapToSpotifyPlaylist()` method (both overloads):
- Extract images from `playlist.getImages()`
- Use same selection logic (prefer ~300x300)
- Set `coverImageUrl` field

#### 2.3 NeteaseService - Track Mapping
**File:** `spotease-backend/src/main/java/com/spotease/service/NeteaseService.java`

When mapping NetEase tracks:
- Extract `picUrl` from `track.getAlbum().getPicUrl()`
- No additional transformation needed

#### 2.4 NeteaseService - Playlist Mapping
When mapping NetEase playlists:
- Extract cover image URL from NetEase playlist API response
- Map to `coverImageUrl` field

#### 2.5 Matching/Conversion Services
**Files:** `MatchingService.java`, `ConversionWorker.java`

When creating `TrackMatchDto`:
- Populate `sourceImageUrl` from source track's image URL
- Populate `destinationImageUrl` from destination track's image URL
- Handle both Spotify→NetEase and NetEase→Spotify directions

### 3. Frontend Type System Changes

#### 3.1 Track Types
**File:** `spotease-frontend/src/types/track.ts`

Update interfaces:
```typescript
export interface Track {
  id: string;
  name: string;
  artists: string[];
  album?: string;
  duration: number;
  isrc?: string;
  imageUrl?: string;  // ADD THIS
}

export interface TrackMatch {
  matchId: number;
  sourceTrackId: string;
  sourceTrackName: string;
  sourceArtist: string;
  sourceAlbum?: string;
  sourceDuration: number;
  sourceISRC?: string;
  sourceImageUrl?: string;  // ADD THIS
  destinationTrackId?: string;
  destinationTrackName?: string;
  destinationArtist?: string;
  destinationImageUrl?: string;  // ADD THIS
  matchConfidence: number;
  status: MatchStatus;
  errorMessage?: string;
}
```

#### 3.2 Playlist Types
**File:** `spotease-frontend/src/types/playlist.ts`

Add `coverImageUrl?: string` to playlist interface(s).

### 4. Frontend UI Component Changes

#### 4.1 TrackMatchCard Component
**File:** `spotease-frontend/src/components/conversions/TrackMatchCard.tsx`

**Source Track Section (lines 39-42):**
Replace placeholder div with:
```tsx
{match.sourceImageUrl ? (
  <img
    src={match.sourceImageUrl}
    alt={match.sourceTrackName}
    className="w-12 h-12 rounded object-cover"
    onError={(e) => {
      e.currentTarget.style.display = 'none';
      e.currentTarget.nextElementSibling?.classList.remove('hidden');
    }}
  />
) : null}
<div className={match.sourceImageUrl ? 'hidden' : 'w-12 h-12 bg-blue-200 rounded flex items-center justify-center flex-shrink-0'}>
  <Music className="w-6 h-6 text-blue-600" />
</div>
```

**Destination Track Section (lines 70-73):**
Apply same pattern:
```tsx
{match.destinationImageUrl ? (
  <img
    src={match.destinationImageUrl}
    alt={match.destinationTrackName || 'Track'}
    className="w-12 h-12 rounded object-cover"
    onError={(e) => {
      e.currentTarget.style.display = 'none';
      e.currentTarget.nextElementSibling?.classList.remove('hidden');
    }}
  />
) : null}
<div className={match.destinationImageUrl ? 'hidden' : 'w-12 h-12 bg-green-200 rounded flex items-center justify-center flex-shrink-0'}>
  <Music className="w-6 h-6 text-green-600" />
</div>
```

#### 4.2 Other Components
Update any playlist display components to show `coverImageUrl` with similar fallback pattern.

### 5. Image Selection Logic

**Spotify Image Selection Algorithm:**

```java
private String selectMediumImage(Image[] images) {
  if (images == null || images.length == 0) {
    return null;
  }

  // If we have multiple images, prefer the one closest to 300px
  if (images.length >= 3) {
    return images[1].getUrl(); // Middle image is typically 300x300
  }

  // Find image closest to 300px width
  Image closest = images[0];
  int targetWidth = 300;
  int minDiff = Math.abs(images[0].getWidth() - targetWidth);

  for (Image image : images) {
    int diff = Math.abs(image.getWidth() - targetWidth);
    if (diff < minDiff) {
      minDiff = diff;
      closest = image;
    }
  }

  return closest.getUrl();
}
```

**NetEase Image Handling:**
- NetEase provides single `picUrl` - use as-is
- No size selection needed

### 6. Error Handling & Fallbacks

**Backend:**
- If image array is empty/null, set image URL field to `null`
- No exceptions should be thrown for missing images
- Log warnings for debugging if needed

**Frontend:**
- Use `onError` handler on `<img>` tags to fall back to icon
- Hide failed image and show icon placeholder
- Maintain existing UI layout regardless of image availability

**Image Loading States:**
- Browser handles loading state natively
- Consider adding subtle loading skeleton if images load slowly (optional enhancement)

## Implementation Checklist

### Backend (Java/Spring Boot)
- [ ] Add `albumImageUrl` to `SpotifyTrack.java`
- [ ] Add `coverImageUrl` to `SpotifyPlaylist.java`
- [ ] Add `coverImageUrl` to `NeteasePlaylist.java`
- [ ] Add `sourceImageUrl` and `destinationImageUrl` to `TrackMatchDto.java`
- [ ] Implement `selectMediumImage()` helper in `SpotifyService.java`
- [ ] Update `mapToSpotifyTrack()` to extract album images
- [ ] Update `mapToSpotifyPlaylist()` to extract playlist cover
- [ ] Update NetEase playlist mapping to extract cover images
- [ ] Update `MatchingService` to populate image URLs in matches
- [ ] Update `ConversionWorker` to populate image URLs in matches

### Frontend (TypeScript/React)
- [ ] Add `imageUrl` to `Track` interface in `track.ts`
- [ ] Add `sourceImageUrl` and `destinationImageUrl` to `TrackMatch` in `track.ts`
- [ ] Add `coverImageUrl` to playlist type(s)
- [ ] Update `TrackMatchCard` source track section with image
- [ ] Update `TrackMatchCard` destination track section with image
- [ ] Update playlist display components (if any)

### Testing
- [ ] Test Spotify track images display correctly
- [ ] Test NetEase track images display correctly
- [ ] Test playlist cover images display
- [ ] Test fallback behavior when images are missing
- [ ] Test fallback behavior when images fail to load (404)
- [ ] Test both Spotify→NetEase and NetEase→Spotify conversions

## Technical Considerations

**Image URLs:**
- Spotify CDN: `i.scdn.co` domain
- NetEase CDN: Various NetEase Music CDN domains
- Both are HTTPS and support CORS for browser display

**Performance:**
- ~300x300 images are ~20-50KB each
- Browser caching will handle repeated loads
- No backend image processing needed (use CDN URLs directly)

**Security:**
- All image URLs are from trusted CDNs (Spotify, NetEase)
- No user-uploaded content
- Standard img tag security applies

## Future Enhancements

1. **Image caching:** Consider service worker for offline viewing
2. **Lazy loading:** Implement intersection observer for large lists
3. **Placeholder animation:** Add skeleton loader while images load
4. **Responsive images:** Different sizes for mobile vs desktop
5. **WebP support:** Check if CDNs support WebP for better compression

## Success Criteria

- ✅ Album artwork displays in track match review cards
- ✅ Playlist cover images display in playlist views
- ✅ Graceful fallback to icon when images unavailable
- ✅ No layout shifts when images load
- ✅ Works for both Spotify and NetEase content
- ✅ Works in both conversion directions

## References

- Spotify Web API - Track Object: https://developer.spotify.com/documentation/web-api/reference/get-track
- Spotify Web API - Album Images: Multiple sizes provided, largest first
- NetEase Cloud Music API: `picUrl` field in album objects
