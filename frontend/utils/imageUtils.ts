import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Converts any image (HEIC, HEIF, PNG, etc.) to JPEG before upload.
 * Supabase Storage rejects non-JPEG/PNG types like image/heic.
 */
export async function convertToJpeg(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.uri;
}
