import type { RazorpayOptions } from '../types/payment';

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => {
      open: () => void;
    };
  }
}

/**
 * Dynamically loads Razorpay Checkout SDK script safely
 */
export const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn('Razorpay SDK script failed to load from CDN. Using fallback test handler.');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};
