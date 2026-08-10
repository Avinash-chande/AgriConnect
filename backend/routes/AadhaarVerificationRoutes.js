import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/authMiddleware.js';
import { uploadAadhaarKyc, getMyKycStatus } from '../controllers/AadhaarVerificationController.js';
import { validateAadhaarKycUpload } from '../validators/AadhaarVerificationValidator.js';

const router = express.Router();

// Memory storage for secure, ephemeral buffer processing (zero disk storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max ZIP upload
  fileFilter: (req, file, cb) => {
    if (file.mimetype.includes('zip') || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed for Aadhaar Offline e-KYC.'), false);
    }
  },
});

router.post('/upload', protect, upload.single('zipFile'), validateAadhaarKycUpload, uploadAadhaarKyc);
router.get('/status', protect, getMyKycStatus);

export default router;
