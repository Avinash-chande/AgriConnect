import mongoose from 'mongoose';
import { createInvoiceRepo } from '../repositories/paymentRepository.js';
import { Invoice } from '../models/Invoice.js';
import { Transaction } from '../models/Transaction.js';
import { AppError } from '../utils/appError.js';
import { logger } from '../utils/logger.js';
import { INVOICE_STATUS } from '../constants/index.js';
import { generateInvoicePDFBuffer } from '../utils/pdfGenerator.js';

/**
 * Helper to resolve Transaction document from ObjectId string or custom transactionId
 */
const findTransactionDoc = async (transactionId) => {
  if (!transactionId) return null;
  if (mongoose.Types.ObjectId.isValid(transactionId)) {
    const txn = await Transaction.findById(transactionId);
    if (txn) return txn;
  }
  return await Transaction.findOne({ transactionId });
};

/**
 * Generate & store Invoice for completed transaction
 */
export const generateInvoiceService = async ({ user, transaction, payment, planDetails }) => {
  if (!user || !transaction || !payment) {
    throw new AppError('User, Transaction, and Payment objects are required to generate invoice.', 400);
  }

  const transactionObjId = transaction._id || transaction;

  // Idempotency: Return existing invoice if generated previously for this transaction
  const existingInvoice = await Invoice.findOne({ transaction: transactionObjId });
  if (existingInvoice) {
    logger.info(`[InvoiceService] Returning existing invoice ${existingInvoice.invoiceNumber} for transaction ${transactionObjId}`);
    return existingInvoice;
  }

  // Generate unique invoice number: e.g., INV-202608-8492
  const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

  const basePrice = payment.amount || 0;
  // Compute 18% GST for Indian agricultural platform invoices
  const taxAmount = Math.round(basePrice * 0.18 * 100) / 100;
  const totalAmount = Math.round((basePrice + taxAmount) * 100) / 100;

  const lineItems = [
    {
      description: `AgriConnect ${planDetails?.name || 'Pro Membership'} Subscription`,
      quantity: 1,
      unitPrice: basePrice,
      amount: basePrice,
    },
  ];

  const invoice = await createInvoiceRepo({
    invoiceNumber,
    user: user._id || user,
    transaction: transaction._id || transaction,
    amount: totalAmount,
    tax: taxAmount,
    currency: payment.currency || 'INR',
    items: lineItems,
    status: INVOICE_STATUS.PAID,
    issuedAt: new Date(),
  });

  logger.info(`[InvoiceService] Generated Invoice ${invoiceNumber} for user ${user._id || user}`);
  return invoice;
};

/**
 * Get Invoice details for downloading/viewing
 */
export const getInvoiceByIdService = async (transactionId, userId) => {
  const txnDoc = await findTransactionDoc(transactionId);
  if (!txnDoc) {
    throw new AppError('Associated transaction not found.', 404);
  }

  const invoice = await Invoice.findOne({
    transaction: txnDoc._id,
    user: userId,
  }).populate('user transaction');

  if (!invoice) {
    throw new AppError('Invoice not found or access denied.', 404);
  }
  return invoice;
};

/**
 * Generate & Return Downloadable PDF Invoice Buffer
 */
export const downloadInvoicePDFService = async (transactionId, currentUser) => {
  const txnDoc = await findTransactionDoc(transactionId);
  if (!txnDoc) {
    throw new AppError('Associated transaction not found.', 404);
  }

  const invoice = await Invoice.findOne({ transaction: txnDoc._id }).populate('user transaction');
  if (!invoice) {
    throw new AppError('Invoice not found for the specified transaction.', 404);
  }

  const invoiceUserId = invoice.user?._id ? invoice.user._id.toString() : invoice.user.toString();
  const currentUserId = currentUser._id ? currentUser._id.toString() : currentUser.toString();

  // Authorization Check: User must own invoice or be Admin
  if (invoiceUserId !== currentUserId && currentUser.role !== 'Admin') {
    throw new AppError('You are not authorized to download this invoice.', 403);
  }

  const pdfBuffer = await generateInvoicePDFBuffer(invoice);

  return {
    pdfBuffer,
    filename: `Invoice_${invoice.invoiceNumber}.pdf`,
    invoiceNumber: invoice.invoiceNumber,
  };
};
