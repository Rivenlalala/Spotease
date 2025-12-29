# Image Display Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add album and track cover images throughout the application to replace placeholder icons.

**Architecture:** Add image URL fields to backend DTOs, extract images from Spotify/NetEase APIs in service layer, propagate through matching services, update frontend types, and modify UI components with fallback handling.

**Tech Stack:** Java 17, Spring Boot 3.x, Spotify Web API SDK, NetEase Cloud Music API, TypeScript, React, Tailwind CSS

---

## Task 1: Add Image URL to SpotifyTrack DTO

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/dto/spotify/SpotifyTrack.java:1-22`

**Step 1: Add albumImageUrl field to SpotifyTrack**

Add the field after the existing fields:

```java
private String albumImageUrl;
```

**Step 2: Commit**

```bash
cd spotease-backend
git add src/main/java/com/spotease/dto/spotify/SpotifyTrack.java
git commit -m "feat: add albumImageUrl field to SpotifyTrack DTO"
```

---

## Task 2: Add Image URL to SpotifyPlaylist DTO

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/dto/spotify/SpotifyPlaylist.java:1-14`

**Step 1: Add coverImageUrl field to SpotifyPlaylist**

Add the field after the existing fields:

```java
private String coverImageUrl;
```

**Step 2: Commit**

```bash
cd spotease-backend
git add src/main/java/com/spotease/dto/spotify/SpotifyPlaylist.java
git commit -m "feat: add coverImageUrl field to SpotifyPlaylist DTO"
```

---

## Task 3: Map NetEase coverImgUrl to coverImageUrl

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/dto/netease/NeteasePlaylist.java:1-16`

**Step 1: Add coverImageUrl field**

The class already has `coverImgUrl` from the API response. Add a computed field that normalizes the naming:

```java
// Add after coverImgUrl field
public String getCoverImageUrl() {
  return coverImgUrl;
}
```

**Step 2: Commit**

```bash
cd spotease-backend
git add src/main/java/com/spotease/dto/netease/NeteasePlaylist.java
git commit -m "feat: add getCoverImageUrl method to NeteasePlaylist for naming consistency"
```

---

## Task 4: Add Image URLs to TrackMatchDto

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/dto/TrackMatchDto.java:1-27`

**Step 1: Add image URL fields**

Add these fields after the existing track information fields (around line 19, after sourceAlbum):

```java
private String sourceImageUrl;
```

And after destinationArtist (around line 23):

```java
private String destinationImageUrl;
```

**Step 2: Commit**

```bash
cd spotease-backend
git add src/main/java/com/spotease/dto/TrackMatchDto.java
git commit -m "feat: add image URL fields to TrackMatchDto"
```

---

## Task 5: Add Image Selection Helper to SpotifyService

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/service/SpotifyService.java:172-184`
- Test: `spotease-backend/src/test/java/com/spotease/service/SpotifyServiceTest.java`

**Step 1: Write test for selectMediumImage helper**

Add to SpotifyServiceTest after the existing tests:

```java
@Test
void shouldSelectMediumImageFromMultiple() {
  // Given
  Image small = mock(Image.class);
  when(small.getWidth()).thenReturn(64);
  when(small.getUrl()).thenReturn("http://small.jpg");

  Image medium = mock(Image.class);
  when(medium.getWidth()).thenReturn(300);
  when(medium.getUrl()).thenReturn("http://medium.jpg");

  Image large = mock(Image.class);
  when(large.getWidth()).thenReturn(640);
  when(large.getUrl()).thenReturn("http://large.jpg");

  Image[] images = {large, medium, small};

  // When
  String result = spotifyService.selectMediumImage(images);

  // Then
  assertThat(result).isEqualTo("http://medium.jpg");
}

@Test
void shouldReturnNullForEmptyImageArray() {
  // When
  String result = spotifyService.selectMediumImage(new Image[0]);

  // Then
  assertThat(result).isNull();
}

@Test
void shouldReturnNullForNullImageArray() {
  // When
  String result = spotifyService.selectMediumImage(null);

  // Then
  assertThat(result).isNull();
}

@Test
void shouldSelectMiddleImageWhenThreeOrMore() {
  // Given
  Image img1 = mock(Image.class);
  when(img1.getUrl()).thenReturn("http://first.jpg");

  Image img2 = mock(Image.class);
  when(img2.getUrl()).thenReturn("http://second.jpg");

  Image img3 = mock(Image.class);
  when(img3.getUrl()).thenReturn("http://third.jpg");

  Image[] images = {img1, img2, img3};

  // When
  String result = spotifyService.selectMediumImage(images);

  // Then
  assertThat(result).isEqualTo("http://second.jpg");
}
```

**Step 2: Run tests to verify they fail**

Run: `cd spotease-backend && ./mvnw test -Dtest=SpotifyServiceTest#shouldSelectMediumImageFromMultiple,shouldReturnNullForEmptyImageArray,shouldReturnNullForNullImageArray,shouldSelectMiddleImageWhenThreeOrMore`

Expected: FAIL with "Method selectMediumImage does not exist"

**Step 3: Add selectMediumImage helper method**

Add this method to SpotifyService (after the createAuthenticatedApi method, around line 45):

```java
/**
 * Select a medium-sized image (~300px) from an array of Spotify images.
 * Spotify typically returns images sorted by size: [640x640, 300x300, 64x64]
 *
 * @param images array of Spotify Image objects
 * @return URL of the medium-sized image, or null if no images available
 */
protected String selectMediumImage(Image[] images) {
  if (images == null || images.length == 0) {
    return null;
  }

  // If we have 3+ images, the middle one is typically 300x300
  if (images.length >= 3) {
    return images[1].getUrl();
  }

  // Otherwise find the image closest to 300px width
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

**Step 4: Add import for Image class**

Add to imports at the top of the file:

```java
import se.michaelthelin.spotify.model_objects.specification.Image;
```

**Step 5: Run tests to verify they pass**

Run: `cd spotease-backend && ./mvnw test -Dtest=SpotifyServiceTest#shouldSelectMediumImageFromMultiple,shouldReturnNullForEmptyImageArray,shouldReturnNullForNullImageArray,shouldSelectMiddleImageWhenThreeOrMore`

Expected: PASS (all 4 tests)

**Step 6: Commit**

```bash
cd spotease-backend
git add src/main/java/com/spotease/service/SpotifyService.java src/test/java/com/spotease/service/SpotifyServiceTest.java
git commit -m "feat: add selectMediumImage helper to SpotifyService with tests"
```

---

## Task 6: Update mapToSpotifyTrack to Extract Album Image

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/service/SpotifyService.java:172-184`
- Test: `spotease-backend/src/test/java/com/spotease/service/SpotifyServiceTest.java`

**Step 1: Write test for track mapping with image**

Add to SpotifyServiceTest:

```java
@Test
void shouldMapTrackWithAlbumImage() throws Exception {
  // Given
  Track mockTrack = mock(Track.class);
  when(mockTrack.getId()).thenReturn("track123");
  when(mockTrack.getName()).thenReturn("Test Song");

  ArtistSimplified mockArtist = mock(ArtistSimplified.class);
  when(mockArtist.getName()).thenReturn("Test Artist");
  when(mockTrack.getArtists()).thenReturn(new ArtistSimplified[]{mockArtist});

  AlbumSimplified mockAlbum = mock(AlbumSimplified.class);
  when(mockAlbum.getName()).thenReturn("Test Album");

  Image mockImage = mock(Image.class);
  when(mockImage.getUrl()).thenReturn("http://album-cover.jpg");
  when(mockImage.getWidth()).thenReturn(300);
  when(mockAlbum.getImages()).thenReturn(new Image[]{mockImage});

  when(mockTrack.getAlbum()).thenReturn(mockAlbum);
  when(mockTrack.getDurationMs()).thenReturn(180000);

  ExternalId mockExternalId = mock(ExternalId.class);
  when(mockExternalId.getExternalIds()).thenReturn(Map.of("isrc", "TEST123"));
  when(mockTrack.getExternalIds()).thenReturn(mockExternalId);

  PlaylistTrack mockPlaylistTrack = mock(PlaylistTrack.class);
  when(mockPlaylistTrack.getTrack()).thenReturn(mockTrack);

  Paging<PlaylistTrack> mockPaging = mock(Paging.class);
  when(mockPaging.getItems()).thenReturn(new PlaylistTrack[]{mockPlaylistTrack});

  GetPlaylistsItemsRequest mockRequest = mock(GetPlaylistsItemsRequest.class);
  when(mockRequest.execute()).thenReturn(mockPaging);
  when(authenticatedApi.getPlaylistsItems(anyString())).thenReturn(
      mock(GetPlaylistsItemsRequest.Builder.class));
  when(authenticatedApi.getPlaylistsItems(anyString()).limit(100)).thenReturn(
      mock(GetPlaylistsItemsRequest.Builder.class));
  when(authenticatedApi.getPlaylistsItems(anyString()).limit(100).build()).thenReturn(mockRequest);

  // When
  List<SpotifyTrack> result = spotifyService.getPlaylistTracks("token", "playlist123");

  // Then
  assertThat(result).hasSize(1);
  SpotifyTrack track = result.get(0);
  assertThat(track.getAlbumImageUrl()).isEqualTo("http://album-cover.jpg");
}
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=SpotifyServiceTest#shouldMapTrackWithAlbumImage`

Expected: FAIL (albumImageUrl will be null)

**Step 3: Update mapToSpotifyTrack method**

Modify the mapToSpotifyTrack method (around line 172) to include image extraction. Add this line after setting the album:

```java
dto.setAlbumImageUrl(selectMediumImage(track.getAlbum().getImages()));
```

The complete updated method should look like:

```java
private SpotifyTrack mapToSpotifyTrack(Track track) {
  SpotifyTrack dto = new SpotifyTrack();
  dto.setId(track.getId());
  dto.setName(track.getName());
  dto.setArtists(Arrays.stream(track.getArtists())
      .map(se.michaelthelin.spotify.model_objects.specification.ArtistSimplified::getName)
      .collect(Collectors.toList()));
  dto.setAlbum(track.getAlbum().getName());
  dto.setAlbumImageUrl(selectMediumImage(track.getAlbum().getImages()));
  dto.setDurationMs(track.getDurationMs());
  dto.setIsrc(track.getExternalIds() != null && track.getExternalIds().getExternalIds() != null ?
      track.getExternalIds().getExternalIds().get("isrc") : null);
  return dto;
}
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=SpotifyServiceTest#shouldMapTrackWithAlbumImage`

Expected: PASS

**Step 5: Commit**

```bash
cd spotease-backend
git add src/main/java/com/spotease/service/SpotifyService.java src/test/java/com/spotease/service/SpotifyServiceTest.java
git commit -m "feat: extract album image URL in mapToSpotifyTrack"
```

---

## Task 7: Update mapToSpotifyPlaylist to Extract Cover Image

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/service/SpotifyService.java:163-170`
- Test: `spotease-backend/src/test/java/com/spotease/service/SpotifyServiceTest.java`

**Step 1: Write test for playlist mapping with cover image**

Add to SpotifyServiceTest:

```java
@Test
void shouldMapPlaylistWithCoverImage() throws Exception {
  // Given
  PlaylistSimplified mockPlaylist = mock(PlaylistSimplified.class);
  when(mockPlaylist.getId()).thenReturn("playlist123");
  when(mockPlaylist.getName()).thenReturn("Test Playlist");
  when(mockPlaylist.getDescription()).thenReturn("Description");

  Image mockImage = mock(Image.class);
  when(mockImage.getUrl()).thenReturn("http://playlist-cover.jpg");
  when(mockImage.getWidth()).thenReturn(300);
  when(mockPlaylist.getImages()).thenReturn(new Image[]{mockImage});

  PlaylistTracksInformation mockTracks = mock(PlaylistTracksInformation.class);
  when(mockTracks.getTotal()).thenReturn(10);
  when(mockPlaylist.getTracks()).thenReturn(mockTracks);

  Paging<PlaylistSimplified> mockPaging = mock(Paging.class);
  when(mockPaging.getItems()).thenReturn(new PlaylistSimplified[]{mockPlaylist});

  GetListOfCurrentUsersPlaylistsRequest mockRequest = mock(GetListOfCurrentUsersPlaylistsRequest.class);
  when(mockRequest.execute()).thenReturn(mockPaging);
  when(authenticatedApi.getListOfCurrentUsersPlaylists()).thenReturn(
      mock(GetListOfCurrentUsersPlaylistsRequest.Builder.class));
  when(authenticatedApi.getListOfCurrentUsersPlaylists().limit(50)).thenReturn(
      mock(GetListOfCurrentUsersPlaylistsRequest.Builder.class));
  when(authenticatedApi.getListOfCurrentUsersPlaylists().limit(50).build()).thenReturn(mockRequest);

  // When
  List<SpotifyPlaylist> result = spotifyService.getPlaylists("token");

  // Then
  assertThat(result).hasSize(1);
  SpotifyPlaylist playlist = result.get(0);
  assertThat(playlist.getCoverImageUrl()).isEqualTo("http://playlist-cover.jpg");
}
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=SpotifyServiceTest#shouldMapPlaylistWithCoverImage`

Expected: FAIL (coverImageUrl will be null)

**Step 3: Update mapToSpotifyPlaylist method**

Modify the mapToSpotifyPlaylist method (around line 163) to include image extraction. Add this line after setting the description:

```java
dto.setCoverImageUrl(selectMediumImage(playlist.getImages()));
```

The complete updated method should look like:

```java
private SpotifyPlaylist mapToSpotifyPlaylist(PlaylistSimplified playlist) {
  SpotifyPlaylist dto = new SpotifyPlaylist();
  dto.setId(playlist.getId());
  dto.setName(playlist.getName());
  dto.setDescription(playlist.getDescription());
  dto.setCoverImageUrl(selectMediumImage(playlist.getImages()));
  dto.setTotalTracks(playlist.getTracks().getTotal());
  return dto;
}
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=SpotifyServiceTest#shouldMapPlaylistWithCoverImage`

Expected: PASS

**Step 5: Commit**

```bash
cd spotease-backend
git add src/main/java/com/spotease/service/SpotifyService.java src/test/java/com/spotease/service/SpotifyServiceTest.java
git commit -m "feat: extract cover image URL in mapToSpotifyPlaylist"
```

---

## Task 8: Add Image URL Helper Methods to MatchingService

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/service/MatchingService.java:217-290`

**Step 1: Add getImageUrl helper method**

Add this method after the existing helper methods (around line 280, after the getIsrc method):

```java
/**
 * Extract image URL from a track.
 *
 * @param track the track (SpotifyTrack or NeteaseTrack)
 * @return the image URL, or null if not available
 */
private String getImageUrl(Object track) {
  if (track == null) {
    return null;
  }

  if (track instanceof SpotifyTrack) {
    return ((SpotifyTrack) track).getAlbumImageUrl();
  } else if (track instanceof NeteaseTrack) {
    NeteaseTrack neteaseTrack = (NeteaseTrack) track;
    if (neteaseTrack.getAlbum() != null) {
      return neteaseTrack.getAlbum().getPicUrl();
    }
    return null;
  }

  throw new IllegalArgumentException("Unsupported track type: " + track.getClass().getName());
}
```

**Step 2: Commit**

```bash
cd spotease-backend
git add src/main/java/com/spotease/service/MatchingService.java
git commit -m "feat: add getImageUrl helper to MatchingService"
```

---

## Task 9: Update createTrackMatch to Include Image URLs

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/service/MatchingService.java:371-405`
- Test: `spotease-backend/src/test/java/com/spotease/service/MatchingServiceTest.java`

**Step 1: Write test for track match with images**

Add to MatchingServiceTest (you'll need to find or create this file):

```java
@Test
void shouldIncludeImageUrlsInTrackMatch() {
  // Given
  SpotifyTrack sourceTrack = new SpotifyTrack();
  sourceTrack.setId("spotify123");
  sourceTrack.setName("Test Song");
  sourceTrack.setArtists(List.of("Test Artist"));
  sourceTrack.setAlbum("Test Album");
  sourceTrack.setDurationMs(180000);
  sourceTrack.setAlbumImageUrl("http://spotify-image.jpg");

  NeteaseTrack.NeteaseAlbum neteaseAlbum = new NeteaseTrack.NeteaseAlbum();
  neteaseAlbum.setId("456");
  neteaseAlbum.setName("Test Album");
  neteaseAlbum.setPicUrl("http://netease-image.jpg");

  NeteaseTrack destinationTrack = new NeteaseTrack();
  destinationTrack.setId("netease456");
  destinationTrack.setName("Test Song");
  destinationTrack.setArtists(List.of(new NeteaseTrack.NeteaseArtist()));
  destinationTrack.getArtists().get(0).setName("Test Artist");
  destinationTrack.setAlbum(neteaseAlbum);
  destinationTrack.setDuration(180000);

  ConversionJob job = new ConversionJob();
  job.setId(1L);

  when(neteaseService.searchTrack(anyString(), anyString()))
      .thenReturn(List.of(destinationTrack));

  // When
  TrackMatch result = matchingService.findBestMatch(
      sourceTrack,
      Platform.NETEASE,
      "token",
      job
  );

  // Then
  assertThat(result.getSourceImageUrl()).isEqualTo("http://spotify-image.jpg");
  assertThat(result.getDestinationImageUrl()).isEqualTo("http://netease-image.jpg");
}
```

**Step 2: Run test to verify it fails**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest#shouldIncludeImageUrlsInTrackMatch`

Expected: FAIL (image URLs will be null)

**Step 3: Update createTrackMatch method**

Modify the createTrackMatch method (around line 371) to populate image URLs. Add these lines after setting the match confidence (around line 396):

```java
// Image URLs
match.setSourceImageUrl(getImageUrl(sourceTrack));
match.setDestinationImageUrl(getImageUrl(destinationTrack));
```

The relevant section should look like:

```java
// Match metadata
match.setMatchConfidence(score);
match.setStatus(status);

// Image URLs
match.setSourceImageUrl(getImageUrl(sourceTrack));
match.setDestinationImageUrl(getImageUrl(destinationTrack));

if (status == MatchStatus.AUTO_MATCHED) {
  match.setAppliedAt(java.time.LocalDateTime.now());
}
```

**Step 4: Run test to verify it passes**

Run: `cd spotease-backend && ./mvnw test -Dtest=MatchingServiceTest#shouldIncludeImageUrlsInTrackMatch`

Expected: PASS

**Step 5: Run all backend tests**

Run: `cd spotease-backend && ./mvnw test`

Expected: All tests PASS

**Step 6: Commit**

```bash
cd spotease-backend
git add src/main/java/com/spotease/service/MatchingService.java src/test/java/com/spotease/service/MatchingServiceTest.java
git commit -m "feat: populate image URLs in createTrackMatch"
```

---

## Task 10: Update Frontend Track Types

**Files:**
- Modify: `spotease-frontend/src/types/track.ts:9-38`

**Step 1: Add imageUrl to Track interface**

Add the field after `isrc` (line 15):

```typescript
imageUrl?: string;
```

**Step 2: Add image URLs to TrackMatch interface**

Add after `sourceISRC` (line 25):

```typescript
sourceImageUrl?: string;
```

And add after `destinationArtist` (line 28):

```typescript
destinationImageUrl?: string;
```

The complete updated interfaces should look like:

```typescript
export interface Track {
  id: string;
  name: string;
  artists: string[];
  album?: string;
  duration: number;
  isrc?: string;
  imageUrl?: string;
}

export interface TrackMatch {
  matchId: number;
  sourceTrackId: string;
  sourceTrackName: string;
  sourceArtist: string;
  sourceAlbum?: string;
  sourceDuration: number;
  sourceISRC?: string;
  sourceImageUrl?: string;
  destinationTrackId?: string;
  destinationTrackName?: string;
  destinationArtist?: string;
  destinationImageUrl?: string;
  matchConfidence: number;
  status: MatchStatus;
  errorMessage?: string;
}
```

**Step 3: Commit**

```bash
cd spotease-frontend
git add src/types/track.ts
git commit -m "feat: add image URL fields to Track and TrackMatch types"
```

---

## Task 11: Update TrackMatchCard Component - Source Track Image

**Files:**
- Modify: `spotease-frontend/src/components/conversions/TrackMatchCard.tsx:39-53`

**Step 1: Replace source track placeholder with image + fallback**

Replace lines 40-42 (the placeholder div) with:

```tsx
{match.sourceImageUrl ? (
  <img
    src={match.sourceImageUrl}
    alt={match.sourceTrackName}
    className="w-12 h-12 rounded object-cover flex-shrink-0"
    onError={(e) => {
      e.currentTarget.style.display = "none";
      const fallback = e.currentTarget.nextElementSibling;
      if (fallback) {
        fallback.classList.remove("hidden");
      }
    }}
  />
) : null}
<div className={match.sourceImageUrl ? "hidden w-12 h-12 bg-blue-200 rounded flex items-center justify-center flex-shrink-0" : "w-12 h-12 bg-blue-200 rounded flex items-center justify-center flex-shrink-0"}>
  <Music className="w-6 h-6 text-blue-600" />
</div>
```

**Step 2: Verify TypeScript compilation**

Run: `cd spotease-frontend && npm run check-types`

Expected: No type errors

**Step 3: Commit**

```bash
cd spotease-frontend
git add src/components/conversions/TrackMatchCard.tsx
git commit -m "feat: display source track album image with fallback in TrackMatchCard"
```

---

## Task 12: Update TrackMatchCard Component - Destination Track Image

**Files:**
- Modify: `spotease-frontend/src/components/conversions/TrackMatchCard.tsx:70-78`

**Step 1: Replace destination track placeholder with image + fallback**

Replace lines 71-73 (the placeholder div) with:

```tsx
{match.destinationImageUrl ? (
  <img
    src={match.destinationImageUrl}
    alt={match.destinationTrackName || "Track"}
    className="w-12 h-12 rounded object-cover flex-shrink-0"
    onError={(e) => {
      e.currentTarget.style.display = "none";
      const fallback = e.currentTarget.nextElementSibling;
      if (fallback) {
        fallback.classList.remove("hidden");
      }
    }}
  />
) : null}
<div className={match.destinationImageUrl ? "hidden w-12 h-12 bg-green-200 rounded flex items-center justify-center flex-shrink-0" : "w-12 h-12 bg-green-200 rounded flex items-center justify-center flex-shrink-0"}>
  <Music className="w-6 h-6 text-green-600" />
</div>
```

**Step 2: Verify TypeScript compilation**

Run: `cd spotease-frontend && npm run check-types`

Expected: No type errors

**Step 3: Test frontend build**

Run: `cd spotease-frontend && npm run build`

Expected: Build succeeds

**Step 4: Commit**

```bash
cd spotease-frontend
git add src/components/conversions/TrackMatchCard.tsx
git commit -m "feat: display destination track album image with fallback in TrackMatchCard"
```

---

## Task 13: Build and Verify Full Application

**Files:**
- N/A (verification task)

**Step 1: Build backend**

Run: `cd spotease-backend && ./mvnw clean package -DskipTests`

Expected: BUILD SUCCESS

**Step 2: Build frontend**

Run: `cd spotease-frontend && npm run build`

Expected: Build completes without errors

**Step 3: Run all tests**

Run: `cd spotease-backend && ./mvnw test`

Expected: All tests PASS

**Step 4: Format and lint frontend**

Run:
```bash
cd spotease-frontend
npm run format
npm run lint:fix
```

Expected: No errors

**Step 5: Verify type checking**

Run: `cd spotease-frontend && npm run check-types`

Expected: No type errors

**Step 6: Final commit**

```bash
cd /home/riven/Spotease/.worktrees/spotease-rework
git add -A
git status
# Verify no unexpected changes
git commit -m "chore: verify builds and tests after image display implementation"
```

---

## Manual Testing Checklist

After implementation is complete, manually test:

1. **Start the application:**
   ```bash
   cd spotease-backend && ./mvnw spring-boot:run
   cd spotease-frontend && npm run dev
   ```

2. **Test Spotify→NetEase conversion:**
   - Link a Spotify playlist with a NetEase playlist
   - Start conversion
   - Verify source track images appear in match review cards
   - Verify destination track images appear in match review cards
   - Verify fallback icons appear when images fail to load

3. **Test NetEase→Spotify conversion:**
   - Link a NetEase playlist with a Spotify playlist
   - Start conversion
   - Verify images display correctly in both directions

4. **Test edge cases:**
   - Tracks with no album art
   - Network failures (disconnect network briefly)
   - Invalid image URLs

5. **Check browser console:**
   - No JavaScript errors
   - No 404s for image URLs
   - Images load from Spotify CDN (`i.scdn.co`) and NetEase CDN

---

## Notes

- **DRY:** Image selection logic is centralized in `selectMediumImage()` method
- **YAGNI:** No premature optimization; using simple `<img>` tags, not complex image libraries
- **TDD:** Tests written before implementation for critical backend logic
- **Frequent commits:** Each task results in a commit for easy rollback if needed

## Rollback Strategy

If issues occur:

```bash
# Rollback last commit
git reset --soft HEAD~1

# Rollback to specific commit
git reset --hard <commit-hash>

# Rebuild
cd spotease-backend && ./mvnw clean install
cd spotease-frontend && npm run build
```
