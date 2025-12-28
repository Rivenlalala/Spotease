package com.spotease.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StringSimilarityTest {

  @Test
  void testLevenshteinDistance() {
    // Classic examples
    assertThat(StringSimilarity.levenshteinDistance("kitten", "sitting")).isEqualTo(3);
    assertThat(StringSimilarity.levenshteinDistance("hello", "hello")).isEqualTo(0);
    assertThat(StringSimilarity.levenshteinDistance("abc", "xyz")).isEqualTo(3);
  }

  @Test
  void testLevenshteinDistanceEdgeCases() {
    // Empty strings
    assertThat(StringSimilarity.levenshteinDistance("", "test")).isEqualTo(4);
    assertThat(StringSimilarity.levenshteinDistance("test", "")).isEqualTo(4);
    assertThat(StringSimilarity.levenshteinDistance("", "")).isEqualTo(0);

    // Null inputs (treated as empty strings)
    assertThat(StringSimilarity.levenshteinDistance(null, "test")).isEqualTo(4);
    assertThat(StringSimilarity.levenshteinDistance("test", null)).isEqualTo(4);
    assertThat(StringSimilarity.levenshteinDistance(null, null)).isEqualTo(0);

    // Single character strings
    assertThat(StringSimilarity.levenshteinDistance("a", "b")).isEqualTo(1);
    assertThat(StringSimilarity.levenshteinDistance("a", "a")).isEqualTo(0);
    assertThat(StringSimilarity.levenshteinDistance("a", "")).isEqualTo(1);
  }

  @Test
  void testLevenshteinDistanceWithRealisticTrackNames() {
    // Exact matches
    assertThat(StringSimilarity.levenshteinDistance(
        "Bohemian Rhapsody",
        "Bohemian Rhapsody"
    )).isEqualTo(0);

    // Minor variations (typos, case)
    assertThat(StringSimilarity.levenshteinDistance(
        "Stairway to Heaven",
        "Stairway to Heavan"
    )).isEqualTo(1);

    // Different versions of same song
    assertThat(StringSimilarity.levenshteinDistance(
        "Let It Be",
        "Let It Be - Remastered"
    )).isEqualTo(13);

    // Similar but different songs
    assertThat(StringSimilarity.levenshteinDistance(
        "Imagine",
        "Imaginary"
    )).isEqualTo(3);

    // Completely different songs
    assertThat(StringSimilarity.levenshteinDistance(
        "Hotel California",
        "Smells Like Teen Spirit"
    )).isEqualTo(19);
  }
}
