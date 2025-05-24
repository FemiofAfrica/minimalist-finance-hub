import imageCompression from 'browser-image-compression';

// Maximum size for OCR.space API - set to 4.9MB to stay safely under their 5MB limit
export const MAX_FILE_SIZE = 4.9 * 1024 * 1024; // 4.9MB in bytes

/**
 * Compresses an image file if it exceeds the maximum file size
 * @param file The image file to compress
 * @returns A promise that resolves to the compressed file or the original file if no compression was needed
 */
export async function compressImageIfNeeded(file: File): Promise<File> {
  // If file is not an image or is under the size limit, return it as is
  if (!file.type.startsWith('image/') || file.size <= MAX_FILE_SIZE) {
    return file;
  }

  // Determine compression options based on file size
  const options = {
    maxSizeMB: MAX_FILE_SIZE / (1024 * 1024), // Convert to MB
    maxWidthOrHeight: 1920, // Reasonable size that maintains quality for OCR
    useWebWorker: true,
    fileType: file.type,
  };

  try {
    // Compress the image
    const compressedFile = await imageCompression(file, options);
    console.log('Image compressed from', file.size, 'to', compressedFile.size, 'bytes');
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    // Return original file if compression fails
    return file;
  }
} 