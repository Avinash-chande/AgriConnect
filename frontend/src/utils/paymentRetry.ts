/**
 * Payment System Error Response Contract
 */
export interface PaymentApiErrorResponse {
  success: false;
  message: string;
  code: string;
}

/**
 * Determines whether a payment request is safe to retry.
 * Creation operations (Order creation, Checkout initiation) MUST NEVER be retried blindly!
 */
export const isSafeToRetryPaymentOperation = (operationType: 'CREATE_ORDER' | 'VERIFY_PAYMENT' | 'FETCH_HISTORY' | 'FETCH_STATUS' | 'DOWNLOAD_INVOICE'): boolean => {
  if (operationType === 'CREATE_ORDER') {
    // NEVER retry order creation automatically to avoid duplicate order generation & charges
    return false;
  }
  if (operationType === 'VERIFY_PAYMENT') {
    // Payment verification is idempotent on backend, can be safely checked once
    return false;
  }
  return true;
};

/**
 * Execute safe async operation with exponential backoff retry logic.
 */
export const executeSafePaymentRetry = async <T>(
  fn: () => Promise<T>,
  operationType: 'CREATE_ORDER' | 'VERIFY_PAYMENT' | 'FETCH_HISTORY' | 'FETCH_STATUS' | 'DOWNLOAD_INVOICE',
  maxRetries = 3,
  delayMs = 1000
): Promise<T> => {
  if (!isSafeToRetryPaymentOperation(operationType)) {
    return await fn();
  }

  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt - 1)));
      }
    }
  }
  throw lastError;
};
