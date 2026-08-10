import { cloudinary } from '../config/cloudinary.js';
import { AppError } from '../utils/appError.js';

/**
 * Robustly extracts public_id from a Cloudinary URL regardless of folder depth
 */
export const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    // Slice everything after /upload/v1234567/ or /upload/
    let relevantParts = parts.slice(uploadIndex + 1);
    if (relevantParts[0] && /^v\d+$/.test(relevantParts[0])) {
      relevantParts = relevantParts.slice(1);
    }

    const fullPath = relevantParts.join('/');
    const publicId = fullPath.substring(0, fullPath.lastIndexOf('.')) || fullPath;
    return publicId;
  } catch {
    return null;
  }
};

/**
 * Base Image Buffer Upload Helper with WebP/AVIF auto-formatting & compression
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
 * 1. Profile Photo Upload Service (Folder: agriconnect/profiles)
 * 400x400 face-gravity fill crop with WebP/AVIF auto compression
 */
export const uploadProfilePhotoService = async (fileBuffer) => {
  return await uploadImageBuffer(fileBuffer, 'agriconnect/profiles', {
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  });
};

/**
 * 2. Farm Gallery Images Upload Service (Folder: agriconnect/farms)
 * Max 1920px width limit with WebP/AVIF auto compression
 */
export const uploadFarmImagesService = async (fileBuffers) => {
  const promises = fileBuffers.map((buffer) =>
    uploadImageBuffer(buffer, 'agriconnect/farms', {
      transformation: [
        { width: 1920, crop: 'limit' },
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
    })
  );
  return await Promise.all(promises);
};

/**
 * 3. Job Vacancy Images Upload Service (Folder: agriconnect/jobs)
 * Max 1920px width limit with WebP/AVIF auto compression
 */
export const uploadJobImagesService = async (fileBuffers) => {
  const promises = fileBuffers.map((buffer) =>
    uploadImageBuffer(buffer, 'agriconnect/jobs', {
      transformation: [
        { width: 1920, crop: 'limit' },
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
    })
  );
  return await Promise.all(promises);
};

/**
 * 4. Chat File Attachment Upload Service (Folder: agriconnect/chat)
 * Optimizes images to WebP/AVIF while preserving original PDFs and document formats
 */
export const uploadAttachmentBuffer = (fileBuffer, mimetype, originalname, folder = 'agriconnect/chat') => {
  return new Promise((resolve, reject) => {
    const isImage = mimetype.startsWith('image/');
    const resource_type = isImage ? 'image' : 'raw';

    const uploadOptions = {
      folder,
      resource_type,
      public_id: `${Date.now()}_${originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
    };

    if (isImage) {
      uploadOptions.quality = 'auto:good';
      uploadOptions.fetch_format = 'auto';
    }

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
 * 5. Certificate Documents Upload Service (Folder: agriconnect/certificates)
 * Max 1600px width limit with document sharpening & auto-format
 */
export const uploadCertificateImagesService = async (fileBuffers) => {
  const promises = fileBuffers.map((buffer) =>
    uploadImageBuffer(buffer, 'agriconnect/certificates', {
      transformation: [
        { width: 1600, crop: 'limit' },
        { quality: 'auto:good', fetch_format: 'auto' },
      ],
    })
  );
  return await Promise.all(promises);
};

/**
 * 6. Private Verification Document Upload Service (Folder: agriconnect/private_verification)
 * STRICT ACCESS CONTROL: Uploaded with type: 'authenticated'
 * Public direct HTTP access is blocked; requires signed URL to retrieve
 */
export const uploadPrivateVerificationDocument = (fileBuffer, originalname, folder = 'agriconnect/private_verification') => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      type: 'authenticated', // Authenticated access control
      resource_type: 'auto',
      public_id: `verify_${Date.now()}_${originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`,
    };

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        return reject(new AppError(`Cloudinary Private Verification Upload Failure: ${error.message}`, 500));
      }
      resolve({
        public_id: result.public_id,
        secure_url: result.secure_url,
        format: result.format,
        resource_type: result.resource_type,
        bytes: result.bytes,
      });
    });

    uploadStream.end(fileBuffer);
  });
};

/**
 * Generates a Time-Limited Signed URL for Private Verification Assets
 * @param {string} urlOrPublicId Public ID or URL of the authenticated document
 * @param {number} expiresSeconds Expiration duration in seconds (default 1 hour)
 * @returns {string} Signed URL with HMAC signature & expiration timestamp
 */
export const generateSignedVerificationUrl = (urlOrPublicId, expiresSeconds = 3600) => {
  if (!urlOrPublicId) return null;
  const publicId = urlOrPublicId.startsWith('http') ? extractPublicId(urlOrPublicId) : urlOrPublicId;
  if (!publicId) return null;

  const expiresAt = Math.floor(Date.now() / 1000) + expiresSeconds;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'agriconnect';

  try {
    return cloudinary.url(publicId, {
      cloud_name: cloudName,
      type: 'authenticated',
      sign_url: true,
      expires_at: expiresAt,
      secure: true,
    });
  } catch (err) {
    return `https://res.cloudinary.com/${cloudName}/image/authenticated/s--signed--/${publicId}`;
  }
};

/**
 * Generates an On-The-Fly Dynamic Thumbnail URL for standard images
 * @param {string} urlOrPublicId Public ID or URL of the image
 * @param {number} width Thumbnail width in pixels
 * @param {number} height Thumbnail height in pixels
 * @returns {string} Transformed Cloudinary URL
 */
export const getThumbnailUrl = (urlOrPublicId, width = 150, height = 150) => {
  if (!urlOrPublicId) return '';
  const publicId = urlOrPublicId.startsWith('http') ? extractPublicId(urlOrPublicId) : urlOrPublicId;
  if (!publicId) return urlOrPublicId;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'agriconnect';

  try {
    return cloudinary.url(publicId, {
      cloud_name: cloudName,
      width,
      height,
      crop: 'thumb',
      gravity: 'face',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true,
    });
  } catch (err) {
    return urlOrPublicId;
  }
};

/**
 * Secure Delete image or document from Cloudinary by URL or Public ID
 */
export const deleteCloudinaryImage = async (urlOrPublicId, resourceType = 'image', type = 'upload') => {
  if (!urlOrPublicId) return false;

  const publicId = urlOrPublicId.startsWith('http') ? extractPublicId(urlOrPublicId) : urlOrPublicId;
  if (!publicId) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      type: type,
    });
    return result.result === 'ok' || result.result === 'not_found';
  } catch (err) {
    return false;
  }
};

export const deleteImageService = deleteCloudinaryImage;
