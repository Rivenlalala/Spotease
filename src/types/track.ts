export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  position?: number; // Make position optional since search results don't have it
}
