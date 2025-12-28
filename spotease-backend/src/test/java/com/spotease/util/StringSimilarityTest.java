package com.spotease.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StringSimilarityTest {

  @Test
  void shouldCalculateLevenshteinDistance() {
    // Classic examples
    assertThat(StringSimilarity.levenshteinDistance("kitten", "sitting")).isEqualTo(3);
    assertThat(StringSimilarity.levenshteinDistance("hello", "hello")).isEqualTo(0);
    assertThat(StringSimilarity.levenshteinDistance("abc", "xyz")).isEqualTo(3);
    assertThat(StringSimilarity.levenshteinDistance("", "test")).isEqualTo(4);
    assertThat(StringSimilarity.levenshteinDistance("test", "")).isEqualTo(4);
  }
}
