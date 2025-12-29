package com.spotease.service;

import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.dto.spotify.SpotifyTrack;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import se.michaelthelin.spotify.SpotifyApi;
import se.michaelthelin.spotify.model_objects.specification.Image;
import se.michaelthelin.spotify.model_objects.specification.Paging;
import se.michaelthelin.spotify.model_objects.specification.Playlist;
import se.michaelthelin.spotify.model_objects.specification.PlaylistSimplified;
import se.michaelthelin.spotify.model_objects.specification.PlaylistTrack;
import se.michaelthelin.spotify.model_objects.specification.Track;
import se.michaelthelin.spotify.requests.data.playlists.AddItemsToPlaylistRequest;
import se.michaelthelin.spotify.requests.data.playlists.CreatePlaylistRequest;
import se.michaelthelin.spotify.requests.data.playlists.GetListOfCurrentUsersPlaylistsRequest;
import se.michaelthelin.spotify.requests.data.playlists.GetPlaylistRequest;
import se.michaelthelin.spotify.requests.data.playlists.GetPlaylistsItemsRequest;
import se.michaelthelin.spotify.requests.data.search.simplified.SearchTracksRequest;
import se.michaelthelin.spotify.requests.data.users_profile.GetCurrentUsersProfileRequest;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpotifyService {

  private final SpotifyApi spotifyApi;

  /**
   * Creates a new SpotifyApi instance with the provided access token.
   * This ensures thread-safety by avoiding mutation of the singleton bean.
   *
   * @param accessToken the user's access token
   * @return a new SpotifyApi instance configured with the access token
   */
  protected SpotifyApi createAuthenticatedApi(String accessToken) {
    return new SpotifyApi.Builder()
        .setClientId(spotifyApi.getClientId())
        .setClientSecret(spotifyApi.getClientSecret())
        .setRedirectUri(spotifyApi.getRedirectURI())
        .setAccessToken(accessToken)
        .build();
  }

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

  public SpotifyPlaylist getPlaylistById(String accessToken, String playlistId) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      GetPlaylistRequest getPlaylistRequest = authenticatedApi
          .getPlaylist(playlistId)
          .build();

      se.michaelthelin.spotify.model_objects.specification.Playlist playlist = getPlaylistRequest.execute();

      SpotifyPlaylist dto = new SpotifyPlaylist();
      dto.setId(playlist.getId());
      dto.setName(playlist.getName());
      dto.setDescription(playlist.getDescription());
      dto.setTotalTracks(playlist.getTracks().getTotal());
      return dto;
    } catch (Exception e) {
      throw new RuntimeException("Failed to get Spotify playlist", e);
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
          .limit(5)
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

  public String createPlaylist(String accessToken, String playlistName) {
    try {
      SpotifyApi authenticatedApi = createAuthenticatedApi(accessToken);

      // Get current user ID
      GetCurrentUsersProfileRequest profileRequest = authenticatedApi.getCurrentUsersProfile()
          .build();
      String userId = profileRequest.execute().getId();

      // Create playlist
      CreatePlaylistRequest createPlaylistRequest = authenticatedApi
          .createPlaylist(userId, playlistName)
          .public_(false)
          .build();

      Playlist playlist = createPlaylistRequest.execute();
      return playlist.getId();
    } catch (Exception e) {
      throw new RuntimeException("Failed to create Spotify playlist", e);
    }
  }

  private SpotifyPlaylist mapToSpotifyPlaylist(PlaylistSimplified playlist) {
    SpotifyPlaylist dto = new SpotifyPlaylist();
    dto.setId(playlist.getId());
    dto.setName(playlist.getName());
    dto.setDescription(playlist.getDescription());
    dto.setTotalTracks(playlist.getTracks().getTotal());
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
    dto.setAlbumImageUrl(selectMediumImage(track.getAlbum().getImages()));
    dto.setDurationMs(track.getDurationMs());
    dto.setIsrc(track.getExternalIds() != null && track.getExternalIds().getExternalIds() != null ?
        track.getExternalIds().getExternalIds().get("isrc") : null);
    return dto;
  }
}
