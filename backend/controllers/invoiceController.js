import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { getInvoiceByIdService, downloadInvoicePDFService } from '../services/invoiceService.js';

/**
 * @desc    Get JSON Invoice Metadata for a Transaction
 * @route   GET /api/v1/invoices/:transactionId
 * @access  Private (Invoice Owner / Admin)
 */
export const getInvoiceDetails = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const invoice = await getInvoiceByIdService(transactionId, req.user._id);

  return sendResponse(res, 200, 'Invoice metadata retrieved successfully', invoice);
});

/**
 * @desc    Download PDF Invoice File
 * @route   GET /api/v1/invoices/:transactionId/pdf
 * @access  Private (Invoice Owner / Admin)
 */
export const downloadInvoicePDF = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;
  const { pdfBuffer, filename } = await downloadInvoicePDFService(transactionId, req.user);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBuffer.length);

  return res.status(200).send(pdfBuffer);
});
