import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { storage } from '../firebase';

export interface UploadProgressCallback {
  (progress: number): void;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates file type and size before upload
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file type (${file.type}). Please upload a JPEG, PNG, or WebP image.`
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 5 MB.`
    };
  }

  return { isValid: true };
}

/**
 * Upload an asset image to Firebase Storage at `assets/{assetId}/{filename}`
 */
export async function uploadAssetImage(
  assetId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // Create clean filename with timestamp prefix to prevent collisions
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storagePath = `assets/${assetId}/${Date.now()}_${cleanName}`;
  const storageRef = ref(storage, storagePath);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(progress);
        }
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        reject(new Error(`Image upload failed: ${error.message}`));
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadUrl);
        } catch (err: any) {
          reject(new Error(`Failed to retrieve download URL: ${err.message}`));
        }
      }
    );
  });
}

/**
 * Delete an image from Firebase Storage given its full download URL or path
 */
export async function deleteStorageImage(imageUrl: string): Promise<void> {
  if (!imageUrl || !imageUrl.includes('firebasestorage.app') && !imageUrl.includes('googleapis.com')) {
    return; // Not a Firebase Storage URL
  }

  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (err: any) {
    console.warn('Could not delete storage image (might already be removed):', err.message);
  }
}
