import { sendEmail } from '../config/email.js';

/**
 * Send OTP Code Email
 */
export const sendOTPEmail = async (email, otpCode) => {
  const subject = 'AgriConnect - Your Security OTP Code';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; background-color: #F8FAFC;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #E5E7EB;">
        <h2 style="color: #16A34A; margin-top: 0;">AgriConnect Verification</h2>
        <p style="font-size: 14px; color: #4B5563;">Use the following 6-digit security code to verify your account or complete password reset:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #16A34A; background: #DCFCE7; padding: 12px 24px; border-radius: 12px; display: inline-block;">
            ${otpCode}
          </span>
        </div>
        <p style="font-size: 12px; color: #6B7280;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      </div>
    </div>
  `;
  return await sendEmail({ to: email, subject, html });
};

/**
 * Send Welcome Email
 */
export const sendWelcomeEmail = async (email, name, role) => {
  const subject = `Welcome to AgriConnect, ${name}!`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
      <h2>Welcome aboard AgriConnect!</h2>
      <p>Hi ${name}, your account has been created successfully as a <strong>${role}</strong>.</p>
      <p>Start exploring agricultural employment opportunities and hiring verified farm talent today.</p>
    </div>
  `;
  return await sendEmail({ to: email, subject, html });
};
