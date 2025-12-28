package com.spotease.service;

import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.dto.spotify.SpotifyTrack;
import org.springframework.stereotype.Service;
import se.michaelthelin.spotify.SpotifyApi;
import se.michaelthelin.spotify.model_objects.specification.Paging;
import se.michaelthelin.spotify.model_objects.specification.PlaylistSimplified;
import se.michaelthelin.spotify.model_objects.specification.PlaylistTrack;
import se.michaelthelin.spotify.model_objects.specification.Track;
import se.michaelthelin.spotify.requests.data.playlists.AddItemsToPlaylistRequest;
import se.michaelthelin.spotify.requests.data.playlists.GetListOfCurrentUsersPlaylistsRequest;
import se.michaelthelin.spotify.requests.data.playlists.GetPlaylistsItemsRequest;
import se.michaelthelin.spotify.requests.data.search.simplified.SearchTracksRequest;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SpotifyService {

  public List<SpotifyPlaylist> getPlaylists(String accessToken) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      GetListOfCurrentUsersPlaylistsRequest getPlaylistsRequest = authenticatedApi
          .getListOfCurrentUsersPlaylists()
          .limit(50)
          .build();

      Paging<PlaylistSimplified> playlistPaging = getPlaylistsRequest.execute();

      return Arrays.stream(playlistPaging.getItems())
          .map(this::mapToSpotifyPlaylist)
          .collect(Collectors.toList());
    } catch (Exception e) {
      throw new RuntimeException("Failed to get Spotify playlists", e);
    }
  }

  public List<SpotifyTrack> getPlaylistTracks(String accessToken, String playlistId) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      GetPlaylistsItemsRequest getPlaylistItemsRequest = authenticatedApi
          .getPlaylistsItems(playlistId)
          .limit(100)
          .build();

      Paging<PlaylistTrack> trackPaging = getPlaylistItemsRequest.execute();

      return Arrays.stream(trackPaging.getItems())
          .map(item -> (Track) item.getTrack())
          .filter(track -> track != null)
          .map(this::mapToSpotifyTrack)
          .collect(Collectors.toList());
    } catch (Exception e) {
      throw new RuntimeException("Failed to get playlist tracks", e);
    }
  }

  public List<SpotifyTrack> searchTrack(String accessToken, String query) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      SearchTracksRequest searchTracksRequest = authenticatedApi
          .searchTracks(query)
          .limit(10)
          .build();

      Paging<Track> trackPaging = searchTracksRequest.execute();

      return Arrays.stream(trackPaging.getItems())
          .map(this::mapToSpotifyTrack)
          .collect(Collectors.toList());
    } catch (Exception e) {
      throw new RuntimeException("Failed to search tracks", e);
    }
  }

  public void addTracksToPlaylist(String accessToken, String playlistId, List<String> trackUris) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      AddItemsToPlaylistRequest addItemsRequest = authenticatedApi
          .addItemsToPlaylist(playlistId, trackUris.toArray(new String[0]))
          .build();

      addItemsRequest.execute();
    } catch (Exception e) {
      throw new RuntimeException("Failed to add tracks to playlist", e);
    }
  }

  private SpotifyApi createAuthenticatedApi(String accessToken) {
    return new SpotifyApi.Builder()
        .setAccessToken(accessToken)
        .build();
  }

  private SpotifyPlaylist mapToSpotifyPlaylist(PlaylistSimplified playlist) {
    SpotifyPlaylist dto = new SpotifyPlaylist();
    dto.setId(playlist.getId());
    dto.setName(playlist.getName());
    dto.setDescription(playlist.getDescription());
    dto.setTrackCount(playlist.getTracks().getTotal());
    return dto;
  }

  private SpotifyTrack mapToSpotifyTrack(Track track) {
    SpotifyTrack dto = new SpotifyTrack();
    dto.setId(track.getId());
    dto.setName(track.getName());
    dto.setArtists(Arrays.stream(track.getArtists())
        .map(se.michaelthelin.spotify.model_objects.specification.ArtistSimplified::getName)
        .collect(Collectors.toList()));
    dto.setAlbum(track.getAlbum().getName());
    dto.setDurationMs(track.getDurationMs());
    dto.setIsrc(track.getExternalIds() != null && track.getExternalIds().getExternalIds() != null ?
        track.getExternalIds().getExternalIds().get("isrc") : null);
    return dto;
  }
}
