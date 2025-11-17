-- DropForeignKey
ALTER TABLE "Playlist" DROP CONSTRAINT IF EXISTS "Playlist_pairedWithId_fkey";
ALTER TABLE "Playlist" DROP CONSTRAINT IF EXISTS "Playlist_userId_fkey";
ALTER TABLE "PlaylistTrack" DROP CONSTRAINT IF EXISTS "PlaylistTrack_playlistId_fkey";
ALTER TABLE "PlaylistTrack" DROP CONSTRAINT IF EXISTS "PlaylistTrack_trackId_fkey";
ALTER TABLE "Track" DROP CONSTRAINT IF EXISTS "Track_pairedId_fkey";

-- DropTable
DROP TABLE IF EXISTS "PlaylistTrack";
DROP TABLE IF EXISTS "Track";
DROP TABLE IF EXISTS "Playlist";

-- DropEnum
DROP TYPE IF EXISTS "Platform";
DROP TYPE IF EXISTS "SyncStatus";

-- CreateTable
CREATE TABLE "PlaylistPairing" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "spotifyPlaylistId" TEXT NOT NULL,
    "neteasePlaylistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaylistPairing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackPairing" (
    "id" TEXT NOT NULL,
    "spotifyTrackId" TEXT NOT NULL,
    "neteaseTrackId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackPairing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistPairing_userId_spotifyPlaylistId_key" ON "PlaylistPairing"("userId", "spotifyPlaylistId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaylistPairing_userId_neteasePlaylistId_key" ON "PlaylistPairing"("userId", "neteasePlaylistId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackPairing_spotifyTrackId_key" ON "TrackPairing"("spotifyTrackId");

-- CreateIndex
CREATE UNIQUE INDEX "TrackPairing_neteaseTrackId_key" ON "TrackPairing"("neteaseTrackId");

-- AddForeignKey
ALTER TABLE "PlaylistPairing" ADD CONSTRAINT "PlaylistPairing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
