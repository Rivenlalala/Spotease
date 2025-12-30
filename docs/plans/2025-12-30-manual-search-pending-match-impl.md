# Manual Search in Pending Match Cards - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a manual search feature to pending match cards that searches the destination platform and lets users select alternative tracks.

**Architecture:** The feature adds search state management to `TrackMatchCard.tsx`, uses existing backend search API, and modifies the approve endpoint to accept alternative destination tracks. The search view replaces the destination section when active.

**Tech Stack:** React, TypeScript, Spring Boot, Tailwind CSS, TanStack Query

---

## Task 1: Create ApproveMatchRequest DTO (Backend)

**Files:**
- Create: `spotease-backend/src/main/java/com/spotease/dto/ApproveMatchRequest.java`

**Step 1: Create the DTO file**

```java
package com.spotease.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveMatchRequest {
  private String destinationTrackId;
  private String destinationTrackName;
  private String destinationArtist;
  private Integer destinationDuration;
  private String destinationAlbumImageUrl;
}
```

**Step 2: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/dto/ApproveMatchRequest.java
git commit -m "feat: add ApproveMatchRequest DTO for manual track selection"
```

---

## Task 2: Modify approve endpoint to accept request body (Backend)

**Files:**
- Modify: `spotease-backend/src/main/java/com/spotease/controller/ReviewController.java:94-165`

**Step 1: Update the approveMatch method signature and logic**

Change the method to accept an optional `@RequestBody`:

```java
@PostMapping("/{matchId}/approve")
@Transactional
public ResponseEntity<Void> approveMatch(
    @PathVariable Long jobId,
    @PathVariable Long matchId,
    @RequestBody(required = false) ApproveMatchRequest request,
    HttpSession session) {

  Long userId = getUserIdFromSession(session);
  if (userId == null) {
    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
  }

  log.info("Approving match {} for job {} by user {}", matchId, jobId, userId);

  // Fetch job
  ConversionJob job = jobRepository.findById(jobId).orElse(null);
  if (job == null) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
  }

  // Verify ownership
  if (!job.getUser().getId().equals(userId)) {
    log.warn("User {} attempted to approve match in job {} owned by user {}",
        userId, jobId, job.getUser().getId());
    return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
  }

  // Fetch match
  TrackMatch match = matchRepository.findById(matchId).orElse(null);
  if (match == null) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
  }

  // Verify match belongs to job
  if (!match.getConversionJob().getId().equals(jobId)) {
    log.warn("Match {} does not belong to job {}", matchId, jobId);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
  }

  // If request body provided, update destination track info
  if (request != null && request.getDestinationTrackId() != null) {
    log.info("Updating destination track for match {} to {}", matchId, request.getDestinationTrackId());
    match.setDestinationTrackId(request.getDestinationTrackId());
    match.setDestinationTrackName(request.getDestinationTrackName());
    match.setDestinationArtist(request.getDestinationArtist());
    match.setDestinationDuration(request.getDestinationDuration());
    // Update confidence to 1.0 since user manually selected
    match.setMatchConfidence(1.0);
  }

  // Verify match has destination track (either original or from request)
  if (match.getDestinationTrackId() == null) {
    log.warn("Match {} has no destination track ID", matchId);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
  }

  try {
    // Get user from job
    User user = job.getUser();

    // Add track to destination playlist
    addTrackToPlaylist(job, match, user);

    // Update match status
    match.setStatus(MatchStatus.USER_APPROVED);
    match.setReviewedAt(LocalDateTime.now());
    match.setAppliedAt(LocalDateTime.now());
    matchRepository.save(match);

    // Check if all matches are now reviewed
    checkAndUpdateJobStatus(job);

    log.info("Successfully approved match {} and added track to playlist", matchId);
    return ResponseEntity.ok().build();

  } catch (IllegalArgumentException e) {
    log.error("Invalid request for approving match {}: {}", matchId, e.getMessage());
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
  } catch (Exception e) {
    log.error("Failed to approve match {}: {}", matchId, e.getMessage(), e);
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
  }
}
```

**Step 2: Add import for ApproveMatchRequest at top of file**

```java
import com.spotease.dto.ApproveMatchRequest;
```

**Step 3: Run existing tests to ensure backward compatibility**

Run: `cd spotease-backend && ./mvnw test -Dtest=ReviewControllerTest -q`
Expected: All existing tests should PASS (request body is optional)

**Step 4: Commit**

```bash
git add spotease-backend/src/main/java/com/spotease/controller/ReviewController.java
git commit -m "feat: allow approve endpoint to accept alternative destination track"
```

---

## Task 3: Add test for approve with alternative track (Backend)

**Files:**
- Modify: `spotease-backend/src/test/java/com/spotease/controller/ReviewControllerTest.java`

**Step 1: Add test method for approving with alternative destination**

Add after `shouldApproveMatchAndAddTrackToSpotify` test:

```java
@Test
void shouldApproveMatchWithAlternativeDestination() throws Exception {
  // Given: Failed match with no destination
  failedMatch.setDestinationTrackId(null);
  failedMatch.setDestinationTrackName(null);
  failedMatch.setDestinationArtist(null);
  failedMatch.setStatus(MatchStatus.FAILED);

  when(jobRepository.findById(1L)).thenReturn(Optional.of(job));
  when(matchRepository.findById(2L)).thenReturn(Optional.of(failedMatch));
  when(tokenEncryption.decrypt("encrypted_cookie")).thenReturn("decrypted_cookie");

  String requestBody = """
      {
        "destinationTrackId": "alt-netease-track-123",
        "destinationTrackName": "Alternative Track",
        "destinationArtist": "Alternative Artist",
        "destinationDuration": 240
      }
      """;

  // When & Then
  mockMvc.perform(post("/api/conversions/1/matches/2/approve")
          .session(authenticatedSession)
          .contentType("application/json")
          .content(requestBody))
      .andExpect(status().isOk());

  // Verify match was updated with new destination
  ArgumentCaptor<TrackMatch> matchCaptor = ArgumentCaptor.forClass(TrackMatch.class);
  verify(matchRepository).save(matchCaptor.capture());
  TrackMatch savedMatch = matchCaptor.getValue();
  assertEquals("alt-netease-track-123", savedMatch.getDestinationTrackId());
  assertEquals("Alternative Track", savedMatch.getDestinationTrackName());
  assertEquals("Alternative Artist", savedMatch.getDestinationArtist());
  assertEquals(240, savedMatch.getDestinationDuration());
  assertEquals(1.0, savedMatch.getMatchConfidence());
  assertEquals(MatchStatus.USER_APPROVED, savedMatch.getStatus());

  // Verify track was added to NetEase playlist with new ID
  verify(neteaseService).addTracksToPlaylist(
      eq("decrypted_cookie"),
      eq("netease-playlist-456"),
      eq(List.of("alt-netease-track-123"))
  );
}
```

**Step 2: Add import for MediaType**

```java
import org.springframework.http.MediaType;
```

**Step 3: Run the test**

Run: `cd spotease-backend && ./mvnw test -Dtest=ReviewControllerTest#shouldApproveMatchWithAlternativeDestination -q`
Expected: PASS

**Step 4: Commit**

```bash
git add spotease-backend/src/test/java/com/spotease/controller/ReviewControllerTest.java
git commit -m "test: add test for approve with alternative destination track"
```

---

## Task 4: Add SearchTrack type for frontend (Frontend)

**Files:**
- Modify: `spotease-frontend/src/types/track.ts`

**Step 1: Add SearchTrack interface**

Add at end of file:

```typescript
// Search result from destination platform
export interface SearchTrack {
  id: string;
  name: string;
  artists: string[];
  album: string;
  albumImageUrl?: string;
  duration: number; // in milliseconds
}
```

**Step 2: Commit**

```bash
git add spotease-frontend/src/types/track.ts
git commit -m "feat: add SearchTrack type for search results"
```

---

## Task 5: Fix frontend API client to match backend (Frontend)

**Files:**
- Modify: `spotease-frontend/src/api/conversions.ts`

**Step 1: Fix searchAlternatives to use GET and correct endpoint**

Replace the `searchAlternatives` method:

```typescript
// Search for alternative matches on destination platform
searchAlternatives: async (
  jobId: number,
  query: string
): Promise<SearchTrack[]> => {
  const response = await apiClient.get<SearchTrack[]>(
    `/api/conversions/${jobId}/matches/search`,
    { params: { query } }
  );
  return response.data;
},
```

**Step 2: Update approveMatch to accept optional destination track**

Replace the `approveMatch` method:

```typescript
// Approve a match (optionally with alternative destination)
approveMatch: async (
  jobId: number,
  matchId: number,
  alternativeTrack?: {
    destinationTrackId: string;
    destinationTrackName: string;
    destinationArtist: string;
    destinationDuration: number;
    destinationAlbumImageUrl?: string;
  }
): Promise<void> => {
  await apiClient.post(
    `/api/conversions/${jobId}/matches/${matchId}/approve`,
    alternativeTrack || {}
  );
},
```

**Step 3: Add import for SearchTrack**

Add to imports:

```typescript
import type { ConversionJob, CreateConversionRequest } from "@/types/conversion";
import type { TrackMatch, SearchTrack } from "@/types/track";
```

**Step 4: Commit**

```bash
git add spotease-frontend/src/api/conversions.ts spotease-frontend/src/types/track.ts
git commit -m "fix: align frontend API client with backend endpoints"
```

---

## Task 6: Add search state to TrackMatchCard (Frontend)

**Files:**
- Modify: `spotease-frontend/src/components/conversions/TrackMatchCard.tsx`

**Step 1: Add state variables and imports**

Replace the imports and add state:

```typescript
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TrackMatch, SearchTrack } from '@/types/track';
import { Music, Check, X, Search } from 'lucide-react';

interface TrackMatchCardProps {
  match: TrackMatch;
  onApprove: (alternativeTrack?: {
    destinationTrackId: string;
    destinationTrackName: string;
    destinationArtist: string;
    destinationDuration: number;
    destinationAlbumImageUrl?: string;
  }) => void;
  onSkip: () => void;
  onSearch: (query: string) => Promise<SearchTrack[]>;
  isProcessing?: boolean;
}

const TrackMatchCard = ({ match, onApprove, onSkip, onSearch, isProcessing = false }: TrackMatchCardProps) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<SearchTrack | null>(null);
```

**Step 2: Commit partial progress**

```bash
git add spotease-frontend/src/components/conversions/TrackMatchCard.tsx
git commit -m "feat: add search state variables to TrackMatchCard"
```

---

## Task 7: Add search handlers to TrackMatchCard (Frontend)

**Files:**
- Modify: `spotease-frontend/src/components/conversions/TrackMatchCard.tsx`

**Step 1: Add handler functions after state declarations**

Add after the state declarations, before `formatDuration`:

```typescript
const handleOpenSearch = async () => {
  setIsSearching(true);
  setSearchError(null);
  const initialQuery = `${match.sourceTrackName} ${match.sourceArtist}`;
  setSearchQuery(initialQuery);
  await performSearch(initialQuery);
};

const handleCloseSearch = () => {
  setIsSearching(false);
  setSearchResults([]);
  setSearchQuery('');
  setSearchError(null);
};

const performSearch = async (query: string) => {
  if (!query.trim()) return;

  setIsLoading(true);
  setSearchError(null);
  try {
    const results = await onSearch(query);
    setSearchResults(results);
  } catch {
    setSearchError('Search failed. Please try again.');
    setSearchResults([]);
  } finally {
    setIsLoading(false);
  }
};

const handleSearchSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  performSearch(searchQuery);
};

const handleSelectTrack = (track: SearchTrack) => {
  setSelectedTrack(track);
  setIsSearching(false);
  setSearchResults([]);
};

const handleApprove = () => {
  if (selectedTrack) {
    onApprove({
      destinationTrackId: selectedTrack.id,
      destinationTrackName: selectedTrack.name,
      destinationArtist: selectedTrack.artists.join(', '),
      destinationDuration: Math.round(selectedTrack.duration / 1000), // Convert ms to seconds
      destinationAlbumImageUrl: selectedTrack.albumImageUrl,
    });
  } else {
    onApprove();
  }
};
```

**Step 2: Commit**

```bash
git add spotease-frontend/src/components/conversions/TrackMatchCard.tsx
git commit -m "feat: add search handler functions to TrackMatchCard"
```

---

## Task 8: Add skeleton loading component (Frontend)

**Files:**
- Modify: `spotease-frontend/src/components/conversions/TrackMatchCard.tsx`

**Step 1: Add SearchResultSkeleton component inside TrackMatchCard**

Add after the handler functions, before `formatDuration`:

```typescript
const SearchResultSkeleton = () => (
  <div className="space-y-2">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
        <div className="w-12 h-12 bg-gray-300 rounded flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-4 bg-gray-200 rounded w-10" />
      </div>
    ))}
  </div>
);
```

**Step 2: Commit**

```bash
git add spotease-frontend/src/components/conversions/TrackMatchCard.tsx
git commit -m "feat: add skeleton loading component for search results"
```

---

## Task 9: Add search results view UI (Frontend)

**Files:**
- Modify: `spotease-frontend/src/components/conversions/TrackMatchCard.tsx`

**Step 1: Add SearchResultsView component inside TrackMatchCard**

Add after `SearchResultSkeleton`:

```typescript
const SearchResultsView = () => (
  <div className="bg-gray-50 rounded-lg p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-900">Search Results</h3>
      <button
        onClick={handleCloseSearch}
        className="text-gray-500 hover:text-gray-700"
        aria-label="Close search"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-4">
      <Input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search for tracks..."
        className="flex-1"
      />
      <Button type="submit" size="icon" variant="outline" disabled={isLoading}>
        <Search className="w-4 h-4" />
      </Button>
    </form>

    {isLoading ? (
      <SearchResultSkeleton />
    ) : searchError ? (
      <p className="text-sm text-red-600 text-center py-4">{searchError}</p>
    ) : searchResults.length === 0 ? (
      <p className="text-sm text-gray-600 text-center py-4">
        No tracks found. Try different keywords.
      </p>
    ) : (
      <div className="space-y-1">
        {searchResults.map((track) => (
          <button
            key={track.id}
            onClick={() => handleSelectTrack(track)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left"
          >
            {track.albumImageUrl ? (
              <img
                src={track.albumImageUrl}
                alt={track.album}
                className="w-12 h-12 rounded flex-shrink-0 object-cover"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                <Music className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{track.name}</p>
              <p className="text-sm text-gray-600 truncate">
                {track.artists.join(', ')} • {track.album}
              </p>
            </div>
            <span className="text-sm text-gray-500 flex-shrink-0">
              {formatDuration(Math.round(track.duration / 1000))}
            </span>
          </button>
        ))}
      </div>
    )}

    <div className="mt-4 flex justify-center">
      <Button variant="outline" onClick={handleCloseSearch}>
        Cancel
      </Button>
    </div>
  </div>
);
```

**Step 2: Commit**

```bash
git add spotease-frontend/src/components/conversions/TrackMatchCard.tsx
git commit -m "feat: add search results view UI component"
```

---

## Task 10: Update destination section to show selected track or search view (Frontend)

**Files:**
- Modify: `spotease-frontend/src/components/conversions/TrackMatchCard.tsx`

**Step 1: Replace the destination track section in the return statement**

Replace the `{/* Destination Track */}` section (lines ~66-92 in original) with:

```tsx
{/* Destination Track or Search View */}
{isSearching ? (
  <SearchResultsView />
) : selectedTrack ? (
  <div className="bg-purple-50 rounded-lg p-4">
    <h3 className="text-sm font-semibold text-purple-900 mb-2">Selected Track (Manual)</h3>
    <div className="flex items-start gap-3">
      {selectedTrack.albumImageUrl ? (
        <img
          src={selectedTrack.albumImageUrl}
          alt={selectedTrack.album}
          className="w-12 h-12 rounded flex-shrink-0 object-cover"
        />
      ) : (
        <div className="w-12 h-12 bg-purple-200 rounded flex items-center justify-center flex-shrink-0">
          <Music className="w-6 h-6 text-purple-600" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{selectedTrack.name}</p>
        <p className="text-sm text-gray-600">{selectedTrack.artists.join(', ')}</p>
        <p className="text-sm text-gray-500">{selectedTrack.album}</p>
        <p className="text-xs text-gray-500 mt-1">
          Duration: {formatDuration(Math.round(selectedTrack.duration / 1000))}
        </p>
      </div>
    </div>
  </div>
) : match.destinationTrackId ? (
  <div className="bg-green-50 rounded-lg p-4">
    <h3 className="text-sm font-semibold text-green-900 mb-2">Suggested Match</h3>
    <div className="flex items-start gap-3">
      <div className="w-12 h-12 bg-green-200 rounded flex items-center justify-center flex-shrink-0">
        <Music className="w-6 h-6 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900">{match.destinationTrackName}</p>
        <p className="text-sm text-gray-600">{match.destinationArtist}</p>
        {match.destinationDuration && (
          <p className="text-xs text-gray-500 mt-1">
            Duration: {formatDuration(match.destinationDuration)}
          </p>
        )}
      </div>
    </div>
  </div>
) : (
  <div className="bg-red-50 rounded-lg p-4">
    <h3 className="text-sm font-semibold text-red-900 mb-2">No Match Found</h3>
    <p className="text-sm text-gray-600">
      {match.errorMessage || 'Could not find a matching track on the destination platform'}
    </p>
  </div>
)}
```

**Step 2: Commit**

```bash
git add spotease-frontend/src/components/conversions/TrackMatchCard.tsx
git commit -m "feat: update destination section to show selected track or search view"
```

---

## Task 11: Add Search Alternative button and update actions (Frontend)

**Files:**
- Modify: `spotease-frontend/src/components/conversions/TrackMatchCard.tsx`

**Step 1: Replace the Actions section**

Replace the `{/* Actions */}` section with:

```tsx
{/* Actions */}
{!isSearching && (
  <div className="space-y-3">
    <Button
      onClick={handleOpenSearch}
      variant="outline"
      className="w-full"
      disabled={isProcessing}
    >
      <Search className="w-4 h-4 mr-2" />
      Search Alternative
    </Button>
    <div className="flex gap-4">
      <Button
        onClick={onSkip}
        variant="outline"
        className="flex-1"
        disabled={isProcessing}
      >
        <X className="w-4 h-4 mr-2" />
        Skip
      </Button>
      <Button
        onClick={handleApprove}
        className="flex-1"
        disabled={isProcessing || (!match.destinationTrackId && !selectedTrack)}
      >
        <Check className="w-4 h-4 mr-2" />
        Approve Match
      </Button>
    </div>
  </div>
)}
```

**Step 2: Commit**

```bash
git add spotease-frontend/src/components/conversions/TrackMatchCard.tsx
git commit -m "feat: add Search Alternative button and update actions"
```

---

## Task 12: Update ReviewMatches page to pass search handler (Frontend)

**Files:**
- Modify: `spotease-frontend/src/pages/ReviewMatches.tsx`

**Step 1: Add search handler and update TrackMatchCard props**

Add after the `skipMutation`:

```typescript
const handleSearch = async (query: string) => {
  if (!jobId) throw new Error('No job ID');
  return conversionsApi.searchAlternatives(Number(jobId), query);
};
```

**Step 2: Update the handleApprove function**

Replace `handleApprove`:

```typescript
const handleApprove = (alternativeTrack?: {
  destinationTrackId: string;
  destinationTrackName: string;
  destinationArtist: string;
  destinationDuration: number;
  destinationAlbumImageUrl?: string;
}) => {
  if (!currentMatch || !jobId) return;
  approveMutation.mutate({
    jobId: Number(jobId),
    matchId: currentMatch.matchId,
    alternativeTrack
  });
};
```

**Step 3: Update approveMutation to handle alternative track**

Replace `approveMutation`:

```typescript
const approveMutation = useMutation({
  mutationFn: ({ jobId, matchId, alternativeTrack }: {
    jobId: number;
    matchId: number;
    alternativeTrack?: {
      destinationTrackId: string;
      destinationTrackName: string;
      destinationArtist: string;
      destinationDuration: number;
      destinationAlbumImageUrl?: string;
    };
  }) =>
    conversionsApi.approveMatch(jobId, matchId, alternativeTrack),
  onSuccess: () => {
    toast({
      title: 'Match approved',
      description: 'Track added to destination playlist',
    });
    moveToNext();
  },
  onError: () => {
    toast({
      title: 'Error',
      description: 'Failed to approve match',
      variant: 'destructive',
    });
  },
});
```

**Step 4: Update TrackMatchCard usage in JSX**

Replace the TrackMatchCard component usage:

```tsx
{currentMatch && (
  <TrackMatchCard
    match={currentMatch}
    onApprove={handleApprove}
    onSkip={handleSkip}
    onSearch={handleSearch}
    isProcessing={isProcessing}
  />
)}
```

**Step 5: Add import for SearchTrack type**

Update imports:

```typescript
import type { SearchTrack } from '@/types/track';
```

**Step 6: Commit**

```bash
git add spotease-frontend/src/pages/ReviewMatches.tsx
git commit -m "feat: connect search handler to ReviewMatches page"
```

---

## Task 13: Run full test suite and verify (Verification)

**Step 1: Run backend tests**

Run: `cd spotease-backend && ./mvnw test -q`
Expected: All tests PASS

**Step 2: Run frontend type check**

Run: `cd spotease-frontend && npm run type-check`
Expected: No type errors

**Step 3: Run frontend lint**

Run: `cd spotease-frontend && npm run lint`
Expected: No lint errors

**Step 4: Manual test in browser**

1. Start backend: `cd spotease-backend && ./mvnw spring-boot:run`
2. Start frontend: `cd spotease-frontend && npm run dev`
3. Navigate to a conversion job with pending matches
4. Click "Search Alternative" button
5. Verify search auto-triggers with source track info
6. Verify results display with album images
7. Click a result to select it
8. Verify selected track shows in purple section
9. Click "Approve Match"
10. Verify track is added to destination playlist

**Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues found during testing"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Create ApproveMatchRequest DTO | Backend DTO |
| 2 | Modify approve endpoint | ReviewController.java |
| 3 | Add test for approve with alternative | ReviewControllerTest.java |
| 4 | Add SearchTrack type | track.ts |
| 5 | Fix frontend API client | conversions.ts |
| 6 | Add search state | TrackMatchCard.tsx |
| 7 | Add search handlers | TrackMatchCard.tsx |
| 8 | Add skeleton loading | TrackMatchCard.tsx |
| 9 | Add search results UI | TrackMatchCard.tsx |
| 10 | Update destination section | TrackMatchCard.tsx |
| 11 | Add Search Alternative button | TrackMatchCard.tsx |
| 12 | Connect to ReviewMatches | ReviewMatches.tsx |
| 13 | Run tests and verify | All |
