package com.spotease.util;

import java.util.Objects;

/**
 * Utility class for string similarity calculations.
 *
 * <p>This class provides static methods for calculating similarity between strings using various
 * algorithms such as Levenshtein distance.
 */
public final class StringSimilarity {

  private StringSimilarity() {
    throw new UnsupportedOperationException("Utility class");
  }

  /**
   * Calculate Levenshtein distance between two strings.
   *
   * <p>The Levenshtein distance is the minimum number of single-character edits (insertions,
   * deletions, or substitutions) required to change one string into the other. This implementation
   * uses dynamic programming with space optimization.
   *
   * <p>Null inputs are treated as empty strings.
   *
   * <p><b>Time Complexity:</b> O(m * n) where m and n are the lengths of the input strings.
   *
   * <p><b>Space Complexity:</b> O(min(m, n)) due to array optimization.
   *
   * <p><b>Usage Examples:</b>
   *
   * <pre>{@code
   * int distance = StringSimilarity.levenshteinDistance("kitten", "sitting");
   * // Returns: 3 (substitute k->s, e->i, insert g)
   *
   * int distance = StringSimilarity.levenshteinDistance("hello", "hello");
   * // Returns: 0 (identical strings)
   *
   * int distance = StringSimilarity.levenshteinDistance(null, "test");
   * // Returns: 4 (null treated as empty string)
   * }</pre>
   *
   * @param s1 first string (null treated as empty string)
   * @param s2 second string (null treated as empty string)
   * @return minimum number of single-character edits required to transform s1 into s2
   */
  public static int levenshteinDistance(String s1, String s2) {
    s1 = Objects.requireNonNullElse(s1, "");
    s2 = Objects.requireNonNullElse(s2, "");

    int len1 = s1.length();
    int len2 = s2.length();

    // Early exit for empty strings
    if (len1 == 0) {
      return len2;
    }
    if (len2 == 0) {
      return len1;
    }

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

  /**
   * Normalize string for comparison.
   *
   * <p>Performs the following transformations:
   * <ul>
   *   <li>Convert to lowercase</li>
   *   <li>Trim leading/trailing whitespace</li>
   *   <li>Remove special characters (.,!?;:()"'-)</li>
   *   <li>Normalize featuring variants ("featuring", "ft.", "feat.") to "feat"</li>
   *   <li>Collapse multiple spaces to single space</li>
   * </ul>
   *
   * <p>Null inputs are treated as empty strings.
   *
   * @param input string to normalize (null treated as empty string)
   * @return normalized string (empty if input was null/empty/whitespace)
   */
  public static String normalize(String input) {
    if (input == null || input.trim().isEmpty()) {
      return "";
    }

    String result = input.toLowerCase().trim();

    // Normalize featuring variants first (before removing special chars)
    result = normalizeFeaturing(result);

    // Remove special characters and collapse whitespace
    result = removeSpecialChars(result);

    return result;
  }

  /**
   * Normalize featuring variants to standard "feat"
   */
  private static String normalizeFeaturing(String input) {
    return input
        .replaceAll("\\bfeaturing\\b", "feat")
        .replaceAll("\\bft\\.", "feat")
        .replaceAll("\\bfeat\\.", "feat");
  }

  /**
   * Remove special characters and collapse whitespace
   */
  private static String removeSpecialChars(String input) {
    // Remove: . , ! ? ; : ( ) " ' -
    return input
        .replaceAll("[.,!?;:()\"'\\-]", " ")
        .replaceAll("\\s+", " ")
        .trim();
  }
}
