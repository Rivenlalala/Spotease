# Manual Search in Pending Match Cards - Design Document

## Overview

Add a manual search option to pending match cards that allows users to search for the source track on the destination platform and select from the top 5 results.

## User Flow

1. User clicks "Search Alternative" button on any `TrackMatchCard`
2. Destination section transforms into search results view
3. Auto-search triggers immediately using source track info
4. Pre-filled search input allows refining the query
5. Up to 5 results display with album art, track name, artist, album, and duration
6. User clicks a track to select it → returns to default view with new destination
7. User clicks "Approve Match" to confirm

**State transitions:**
```
[Default View] → click "Search Alternative" → [Search Results View]
[Search Results View] → select track → [Default View with new destination]
[Search Results View] → cancel/X → [Default View with original destination]
```

## UI Design

### Search Results View

```
┌─────────────────────────────────────────────────┐
│ [X]                                             │
│ ┌─────────────────────────────────────┐ [🔍]   │
│ │ track name artist                   │        │
│ └─────────────────────────────────────┘        │
│                                                 │
│ ┌─────────────────────────────────────────────┐│
│ │ [IMG] Track Name 1                    3:42  ││
│ │       Artist 1 • Album Name                 ││
│ └─────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────┐│
│ │ [IMG] Track Name 2                    3:45  ││
│ │       Artist 2 • Album Name                 ││
│ └─────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────┐│
│ │ [IMG] Track Name 3                    3:40  ││
│ │       Artist 3 • Album Name                 ││
│ └─────────────────────────────────────────────┘│
│                                                 │
│                 [Cancel]                        │
└─────────────────────────────────────────────────┘
```

### Search Result Item

Each result displays:
- Album artwork thumbnail (40-48px)
- Track name (primary text)
- Artist(s) + Album name (secondary text, muted)
- Duration (right-aligned)
- Hover state for clickable feedback

### Loading State

Skeleton loading with pulsing grey boxes (consistent with existing playlist loading):
- 5 skeleton rows with `animate-pulse`
- Grey boxes matching layout of actual results

### Empty/Error States

- **No results:** "No tracks found. Try different keywords."
- **API error:** "Search failed. Please try again."

## Component Changes

### `TrackMatchCard.tsx`

**New state variables:**
```typescript
isSearching: boolean        // controls which view is shown
searchQuery: string         // input value
searchResults: Track[]      // API response
selectedTrack: Track | null // user's selection (before approve)
isLoading: boolean          // for skeleton loading
```

**New UI elements:**
1. "Search Alternative" button - secondary styling, always visible
2. Search input - pre-filled with `${sourceTrackName} ${sourceArtist}`
3. Search button (icon)
4. X icon (top-right corner)
5. Cancel button (bottom)
6. Clickable track result rows

## API Changes

### Existing Endpoint (no changes needed)

```
GET /api/conversions/{jobId}/matches/search?query=...
```

Returns `SpotifyTrack[]` or `NeteaseTrack[]` based on destination platform.

### Modified Endpoint

```
POST /api/conversions/{jobId}/matches/{matchId}/approve
```

**Current behavior:** Approves with existing destination track.

**New behavior:** Accept optional request body:

```json
{
  "destinationTrackId": "string",
  "destinationTrackName": "string",
  "destinationArtist": "string",
  "destinationDuration": number,
  "destinationAlbumImageUrl": "string"
}
```

- If body is empty → approve with existing destination (backward compatible)
- If body has track → update destination first, then approve

### Frontend API Client

Verify `conversionsApi.searchAlternatives()` matches backend signature. May need update to pass `jobId` and `query` correctly.

## Image Sources

- **Spotify:** `track.album.images[2].url` (64px thumbnail)
- **NetEase:** `track.album.picUrl` + `?param=64y64` for thumbnail

## Implementation Tasks

### Backend
1. Modify approve endpoint to accept optional destination track body
2. Update TrackMatch entity with new destination info before approval
3. Verify search endpoint returns album image URLs

### Frontend
1. Add component state for search mode
2. Add "Search Alternative" button
3. Implement search results view with input, results list, cancel/X
4. Add skeleton loading state
5. Handle track selection → update local state → return to default view
6. Update approve action to send new destination if changed
7. Handle empty results and error states

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Button visibility | Always visible | Users may want to override even high-confidence matches |
| Results display | Replace destination section | Keeps everything in-card, no modals |
| Initial search | Auto-search + editable input | Fast results with flexibility to refine |
| Selection behavior | Click returns to default view | Simple, direct interaction |
| Confirmation | Still requires "Approve Match" | Safety net against accidental selection |
| Cancel options | Both X icon and Cancel button | Multiple clear exit paths |
| Loading | Skeleton pulse | Consistent with existing playlist loading UI |
| Result count | Show whatever exists (1-5) | Simple, no empty state unless truly zero |
