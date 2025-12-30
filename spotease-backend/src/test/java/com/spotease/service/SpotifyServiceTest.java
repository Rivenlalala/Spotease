package com.spotease.service;

import com.spotease.dto.spotify.SpotifyPlaylist;
import com.spotease.dto.spotify.SpotifyTrack;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import se.michaelthelin.spotify.SpotifyApi;
import se.michaelthelin.spotify.model_objects.miscellaneous.PlaylistTracksInformation;
import se.michaelthelin.spotify.model_objects.specification.*;
import se.michaelthelin.spotify.requests.data.playlists.GetListOfCurrentUsersPlaylistsRequest;
import se.michaelthelin.spotify.requests.data.search.simplified.SearchTracksRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SpotifyServiceTest {

    @Mock
    private SpotifyApi spotifyApi;

    @Mock
    private SpotifyApi authenticatedApi;

    @Spy
    private SpotifyService spotifyService = new SpotifyService(spotifyApi);

    @BeforeEach
    void setUp() {
        // Mock the createAuthenticatedApi method to return our mock
        // Use lenient() because not all tests use this stub (e.g., selectMediumImage tests)
        lenient().doReturn(authenticatedApi).when(spotifyService).createAuthenticatedApi(anyString());
    }

    @Test
    void shouldGetPlaylists() throws Exception {
        // Given
        PlaylistSimplified mockPlaylist = mock(PlaylistSimplified.class);
        when(mockPlaylist.getId()).thenReturn("playlist123");
        when(mockPlaylist.getName()).thenReturn("Test Playlist");
        when(mockPlaylist.getDescription()).thenReturn("Description");

        PlaylistTracksInformation mockTracks = mock(PlaylistTracksInformation.class);
        when(mockTracks.getTotal()).thenReturn(10);
        when(mockPlaylist.getTracks()).thenReturn(mockTracks);

        Paging<PlaylistSimplified> mockPaging = mock(Paging.class);
        when(mockPaging.getItems()).thenReturn(new PlaylistSimplified[]{mockPlaylist});

        GetListOfCurrentUsersPlaylistsRequest mockRequest = mock(GetListOfCurrentUsersPlaylistsRequest.class);
        when(mockRequest.execute()).thenReturn(mockPaging);

        GetListOfCurrentUsersPlaylistsRequest.Builder mockBuilder = mock(GetListOfCurrentUsersPlaylistsRequest.Builder.class);
        when(mockBuilder.limit(50)).thenReturn(mockBuilder);
        when(mockBuilder.build()).thenReturn(mockRequest);

        when(authenticatedApi.getListOfCurrentUsersPlaylists()).thenReturn(mockBuilder);

        // When
        List<SpotifyPlaylist> result = spotifyService.getPlaylists("test-token");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("playlist123");
        assertThat(result.get(0).getName()).isEqualTo("Test Playlist");
        assertThat(result.get(0).getTotalTracks()).isEqualTo(10);
    }

    @Test
    void shouldSearchTracks() throws Exception {
        // Given
        Track mockTrack = mock(Track.class);
        when(mockTrack.getId()).thenReturn("track123");
        when(mockTrack.getName()).thenReturn("Test Track");
        when(mockTrack.getDurationMs()).thenReturn(180000);

        ArtistSimplified mockArtist = mock(ArtistSimplified.class);
        when(mockArtist.getName()).thenReturn("Test Artist");
        when(mockTrack.getArtists()).thenReturn(new ArtistSimplified[]{mockArtist});

        AlbumSimplified mockAlbum = mock(AlbumSimplified.class);
        when(mockAlbum.getName()).thenReturn("Test Album");
        when(mockTrack.getAlbum()).thenReturn(mockAlbum);

        Paging<Track> mockPaging = mock(Paging.class);
        when(mockPaging.getItems()).thenReturn(new Track[]{mockTrack});

        SearchTracksRequest mockRequest = mock(SearchTracksRequest.class);
        when(mockRequest.execute()).thenReturn(mockPaging);

        SearchTracksRequest.Builder mockBuilder = mock(SearchTracksRequest.Builder.class);
        when(mockBuilder.limit(5)).thenReturn(mockBuilder);
        when(mockBuilder.build()).thenReturn(mockRequest);

        when(authenticatedApi.searchTracks(anyString())).thenReturn(mockBuilder);

        // When
        List<SpotifyTrack> result = spotifyService.searchTrack("test-token", "test query");

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo("track123");
        assertThat(result.get(0).getName()).isEqualTo("Test Track");
        assertThat(result.get(0).getArtists()).containsExactly("Test Artist");
    }

    @Test
    void shouldSelectMediumImageFromMultiple() {
        // Given - with 3+ images, selectMediumImage takes the middle one
        Image medium = mock(Image.class);
        when(medium.getUrl()).thenReturn("http://medium.jpg");

        Image[] images = {mock(Image.class), medium, mock(Image.class)};

        // When - directly call the method, no API auth needed
        SpotifyService service = new SpotifyService(spotifyApi);
        String result = service.selectMediumImage(images);

        // Then
        assertThat(result).isEqualTo("http://medium.jpg");
    }

    @Test
    void shouldReturnNullForEmptyImageArray() {
        // When
        SpotifyService service = new SpotifyService(spotifyApi);
        String result = service.selectMediumImage(new Image[0]);

        // Then
        assertThat(result).isNull();
    }

    @Test
    void shouldReturnNullForNullImageArray() {
        // When
        SpotifyService service = new SpotifyService(spotifyApi);
        String result = service.selectMediumImage(null);

        // Then
        assertThat(result).isNull();
    }

    @Test
    void shouldSelectMiddleImageWhenThreeOrMore() {
        // Given
        Image img2 = mock(Image.class);
        when(img2.getUrl()).thenReturn("http://second.jpg");

        Image[] images = {mock(Image.class), img2, mock(Image.class)};

        // When
        SpotifyService service = new SpotifyService(spotifyApi);
        String result = service.selectMediumImage(images);

        // Then
        assertThat(result).isEqualTo("http://second.jpg");
    }

    @Test
    void shouldSelectClosestTo300pxWhenLessThanThreeImages() {
        // Given - with fewer than 3 images, it finds the closest to 300px
        // 64 is 236 away from 300, 640 is 340 away from 300, so small wins
        Image small = mock(Image.class);
        lenient().when(small.getWidth()).thenReturn(64);
        lenient().when(small.getUrl()).thenReturn("http://small.jpg");

        Image large = mock(Image.class);
        lenient().when(large.getWidth()).thenReturn(640);
        lenient().when(large.getUrl()).thenReturn("http://large.jpg");

        Image[] images = {large, small};

        // When
        SpotifyService service = new SpotifyService(spotifyApi);
        String result = service.selectMediumImage(images);

        // Then
        assertThat(result).isEqualTo("http://small.jpg");
    }
}
