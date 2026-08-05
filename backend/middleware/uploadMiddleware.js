import multer from 'multer';
import { AppError } from '../utils/appError.js';

// Configure memory storage for streaming buffers to Cloudinary
const storage = multer.memoryStorage();

// File filter to enforce image files only
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type! Only JPEG, PNG, JPG, and WEBP image files are allowed.', 400), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
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

// Attachment upload filter for Chat (Images, PDFs, Word docs up to 10MB)
const attachmentFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ];

  if (allowedMimeTypes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type! Only images, PDFs, Word docs (.doc/.docx), and text files up to 10MB are allowed.', 400), false);
  }
};

export const uploadAttachmentMulter = multer({
  storage,
  fileFilter: attachmentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max file size
  },
});

export const uploadSingleAttachment = uploadAttachmentMulter.single('file');
