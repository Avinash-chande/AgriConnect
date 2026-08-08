import express from 'express';
import { getInvoiceDetails, downloadInvoicePDF } from '../controllers/invoiceController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get JSON Invoice Metadata
router.get('/:transactionId', protect, getInvoiceDetails);

// Download PDF Invoice File
router.get('/:transactionId/pdf', protect, downloadInvoicePDF);

export default router;
