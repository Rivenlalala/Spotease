package com.spotease.util;

public class StringSimilarity {

  /**
   * Calculate Levenshtein distance between two strings.
   * Uses dynamic programming with space optimization.
   *
   * @param s1 first string
   * @param s2 second string
   * @return minimum number of single-character edits (insertions, deletions, substitutions)
   */
  public static int levenshteinDistance(String s1, String s2) {
    if (s1 == null) s1 = "";
    if (s2 == null) s2 = "";

    int len1 = s1.length();
    int len2 = s2.length();

    // Early exit for empty strings
    if (len1 == 0) return len2;
    if (len2 == 0) return len1;

    // Use two rows instead of full matrix for space efficiency
    int[] previousRow = new int[len2 + 1];
    int[] currentRow = new int[len2 + 1];

    // Initialize first row
    for (int j = 0; j <= len2; j++) {
      previousRow[j] = j;
    }

    // Calculate distances
    for (int i = 1; i <= len1; i++) {
      currentRow[0] = i;

      for (int j = 1; j <= len2; j++) {
        int cost = (s1.charAt(i - 1) == s2.charAt(j - 1)) ? 0 : 1;

        currentRow[j] = Math.min(
            Math.min(
                currentRow[j - 1] + 1,      // insertion
                previousRow[j] + 1          // deletion
            ),
            previousRow[j - 1] + cost       // substitution
        );
      }

      // Swap rows
      int[] temp = previousRow;
      previousRow = currentRow;
      currentRow = temp;
    }

    return previousRow[len2];
  }
}
