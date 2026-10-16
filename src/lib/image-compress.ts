// src/lib/image-compress.ts

/**
 * Compresses and resizes an image file in the browser before upload,
 * reducing a 5MB-10MB mobile photo down to ~200-400KB while preserving high clinical clarity.
 */
export async function compressImageIfNeeded(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<File> {
  // If not in browser or not an image, return original file
  if (typeof window === 'undefined' || !file.type.startsWith('image/')) {
    return file;
  }

  // If already under 350KB, no need to compress
  if (file.size < 350 * 1024) {
    return file;
  }

  return new Promise<File>((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Use jpeg for photos for best compression ratio
          const targetMime = file.type === 'image/png' ? 'image/jpeg' : file.type;
          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                resolve(file);
              } else {
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                  type: targetMime,
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              }
            },
            targetMime,
            quality
          );
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
}
