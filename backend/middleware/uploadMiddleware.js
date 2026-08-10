import multer from 'multer';
import path from 'path';
import { AppError } from '../utils/appError.js';

// Configure memory storage for streaming buffers to Cloudinary
const storage = multer.memoryStorage();

/**
 * Strict MIME Type and File Extension Matcher
 */
const ALLOWED_IMAGE_TYPES = {
  mimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif', 'image/gif'],
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'],
};

const ALLOWED_ATTACHMENT_TYPES = {
  mimes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.pdf', '.doc', '.docx', '.txt'],
};

const ALLOWED_VERIFICATION_TYPES = {
  mimes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/xml',
    'application/xml',
    'application/zip',
  ],
  extensions: ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.xml', '.zip'],
};

/**
 * Helper to validate file extension and MIME type against whitelist
 */
const validateFileMimeAndExt = (file, allowedConfig) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype.toLowerCase();

  const isMimeAllowed = allowedConfig.mimes.includes(mimeType) || mimeType.startsWith('image/');
  const isExtAllowed = allowedConfig.extensions.includes(fileExt);

  return isMimeAllowed && isExtAllowed;
};

// 1. General Image File Filter
const imageFilter = (req, file, cb) => {
  if (validateFileMimeAndExt(file, ALLOWED_IMAGE_TYPES)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid image file type or extension! Allowed formats: JPEG, JPG, PNG, WEBP, AVIF.',
        400
      ),
      false
    );
  }
};

// 2. Chat Attachment File Filter
const attachmentFilter = (req, file, cb) => {
  if (validateFileMimeAndExt(file, ALLOWED_ATTACHMENT_TYPES)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid attachment file type! Allowed formats: Images, PDFs, Word docs (.doc/.docx), and text files up to 10MB.',
        400
      ),
      false
    );
  }
};

// 3. Private Verification Document File Filter
const verificationFilter = (req, file, cb) => {
  if (validateFileMimeAndExt(file, ALLOWED_VERIFICATION_TYPES)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid verification document type! Allowed formats: JPEG, PNG, WEBP, PDF, and Aadhaar offline XML/ZIP files.',
        400
      ),
      false
    );
  }
};

// Multer Upload Instances
export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max file size
  },
});

export const uploadSingleImage = upload.single('image');
export const uploadMultipleImages = upload.array('images', 5); // Max 5 images per request
export const uploadJobImages = upload.fields([
  { name: 'farmImages', maxCount: 5 },
  { name: 'jobImages', maxCount: 5 },
]);

export const uploadAttachmentMulter = multer({
  storage,
  fileFilter: attachmentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max file size
  },
});

export const uploadSingleAttachment = uploadAttachmentMulter.single('file');

export const uploadVerificationMulter = multer({
  storage,
  fileFilter: verificationFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max file size
  },
});

export const uploadSingleVerificationDocument = uploadVerificationMulter.single('document');
export const uploadMultipleVerificationDocuments = uploadVerificationMulter.array('documents', 3);
