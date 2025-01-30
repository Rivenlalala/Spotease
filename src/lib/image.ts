/**
 * Fetches an image from a URL and returns it as a base64 string
 * @param url The URL of the image to fetch
 * @returns Promise<string> The base64 encoded image string
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const arrayBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const base64String = Buffer.from(arrayBuffer).toString('base64');
    
    return `data:${contentType};base64,${base64String}`;
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return ''; // Return empty string if conversion fails
  }
}

/**
 * Checks if a string is a valid base64 encoded image
 * @param str The string to check
 * @returns boolean
 */
export function isBase64Image(str: string): boolean {
  return str.startsWith('data:image/') && str.includes(';base64,');
}

/**
 * Gets the content type from a base64 encoded image string
 * @param base64String The base64 encoded image string
 * @returns string The content type or null if invalid
 */
export function getContentTypeFromBase64(base64String: string): string | null {
  const match = base64String.match(/^data:([^;]+);base64,/);
  return match ? match[1] : null;
}
