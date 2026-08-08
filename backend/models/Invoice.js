import mongoose from 'mongoose';
import { INVOICE_STATUS } from '../constants/index.js';
import { softDeletePlugin } from './schemas/commonSchemas.js';

const invoiceItemSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, 'Item description is required'],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Item quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
    },
    amount: {
      type: Number,
      required: [true, 'Item amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for invoice'],
      index: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: [true, 'Transaction reference is required for invoice'],
      unique: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Total invoice amount is required'],
      min: [0, 'Total amount cannot be negative'],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, 'Tax amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    items: {
      type: [invoiceItemSchema],
      required: [true, 'Invoice line items are required'],
      validate: {
        validator: function (items) {
          return Array.isArray(items) && items.length > 0;
        },
        message: 'Invoice must contain at least one line item',
      },
    },
    status: {
      type: String,
      enum: {
        values: Object.values(INVOICE_STATUS),
        message: '{VALUE} is not a valid invoice status',
      },
      default: INVOICE_STATUS.ISSUED,
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Apply Soft Delete Plugin
invoiceSchema.plugin(softDeletePlugin);

// Compound Indexes
invoiceSchema.index({ user: 1, issuedAt: -1 });

export const Invoice = mongoose.model('Invoice', invoiceSchema);
