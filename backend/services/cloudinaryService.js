import { cloudinary } from '../config/cloudinary.js';
import { AppError } from '../utils/appError.js';

/**
 * Extracts public_id from a Cloudinary secure_url
 */
export const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;
    const pathAfterUpload = parts.slice(uploadIndex + 2).join('/');
    const publicIdWithExt = pathAfterUpload.split('.')[0];
    return publicIdWithExt;
  } catch {
    return null;
  }
};

/**
 * Upload single image buffer to Cloudinary with automatic compression & optimization
 */
export const uploadImageBuffer = (fileBuffer, folder = 'agriconnect/general', options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'image',
      quality: 'auto:good',
      fetch_format: 'auto',
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(new AppError(`Cloudinary Upload Failure: ${error.message}`, 500));
      }
      resolve(result);
    });

    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload Chat File Attachment (Images, PDFs, Word docs) to Cloudinary
 */
export const uploadAttachmentBuffer = (fileBuffer, mimetype, originalname, folder = 'agriconnect/chat_attachments') => {
  return new Promise((resolve, reject) => {
    const isImage = mimetype.startsWith('image/');
    const resource_type = isImage ? 'image' : 'auto';

    const uploadOptions = {
      folder,
      resource_type,
      public_id: `${Date.now()}_${originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
    };

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(new AppError(`Cloudinary Attachment Upload Failure: ${error.message}`, 500));
      }
      resolve({
        url: result.secure_url,
        public_id: result.public_id,
        fileType: isImage ? 'image' : mimetype.includes('pdf') ? 'pdf' : 'document',
        fileName: originalname,
        fileSize: result.bytes,
      });
    });

    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload Profile Photo with face cropping & 400x400 thumbnail compression
 */
export const uploadProfilePhotoService = async (fileBuffer) => {
  return await uploadImageBuffer(fileBuffer, 'agriconnect/avatars', {
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' },
    ],
  });
};

/**
 * Upload Farm Gallery Images with 1920px max width compression
 */
export const uploadFarmImagesService = async (fileBuffers) => {
  const promises = fileBuffers.map((buffer) =>
    uploadImageBuffer(buffer, 'agriconnect/farms', {
      transformation: [
        { width: 1920, crop: 'limit' },
        { quality: 'auto:good' },
      ],
    })
  );
  return await Promise.all(promises);
};

/**
 * Upload Certificate Credentials with 1600px max width compression
 */
export const uploadCertificateImagesService = async (fileBuffers) => {
  const promises = fileBuffers.map((buffer) =>
    uploadImageBuffer(buffer, 'agriconnect/certificates', {
      transformation: [
        { width: 1600, crop: 'limit' },
        { quality: 'auto:good' },
      ],
    })
  );
  return await Promise.all(promises);
};

/**
 * Delete image from Cloudinary by URL or Public ID
 */
export const deleteCloudinaryImage = async (urlOrPublicId) => {
  if (!urlOrPublicId) return false;

  const publicId = urlOrPublicId.startsWith('http')
    ? extractPublicId(urlOrPublicId)
    : urlOrPublicId;

  if (!publicId) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (err) {
    console.warn(`⚠️ Could not destroy Cloudinary asset ${publicId}:`, err.message);
    return false;
  }
};

export const deleteImageService = deleteCloudinaryImage;
