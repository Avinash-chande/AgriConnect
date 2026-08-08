import { asyncHandler } from '../utils/asyncHandler.js';
import { sendResponse } from '../utils/apiResponse.js';
import { processRazorpayWebhookService } from '../services/webhookService.js';

/**
 * @desc    Razorpay Webhook Handler Endpoint
 * @route   POST /api/v1/payments/webhook
 * @access  Public (Signature Verified)
 */
export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.body; // Buffer from express.raw({ type: 'application/json' })

  const result = await processRazorpayWebhookService({
    rawBody,
    signature,
  });

  return sendResponse(res, 200, result.message || 'Webhook event processed', result);
});
