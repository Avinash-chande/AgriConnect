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
