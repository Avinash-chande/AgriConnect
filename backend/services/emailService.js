import { sendEmail } from '../config/email.js';

/**
 * Send OTP Code Email
 */
export const sendOTPEmail = async (email, otpCode) => {
  const subject = 'AgriConnect - Your Account Registration Security OTP Code';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; background-color: #F8FAFC;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #E5E7EB;">
        <h2 style="color: #16A34A; margin-top: 0;">AgriConnect Account Registration</h2>
        <p style="font-size: 14px; color: #4B5563;">Use the following 6-digit security code to verify your new account registration:</p>
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
 * Send Password Reset OTP Email
 */
export const sendPasswordResetOTPEmail = async (email, otpCode) => {
  const subject = 'AgriConnect - Your Password Reset OTP Code';
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; background-color: #F8FAFC;">
      <div style="max-width: 500px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #E5E7EB;">
        <h2 style="color: #16A34A; margin-top: 0;">AgriConnect Password Reset</h2>
        <p style="font-size: 14px; color: #4B5563;">Use the following 6-digit security code to reset your AgriConnect password:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #16A34A; background: #DCFCE7; padding: 12px 24px; border-radius: 12px; display: inline-block;">
            ${otpCode}
          </span>
        </div>
        <p style="font-size: 12px; color: #6B7280;">This code is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this message.</p>
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

/**
 * Send Job Application Notification Email to Farmer
 */
export const sendJobApplicationNotificationEmail = async ({
  farmerEmail,
  farmerName,
  workerName,
  jobTitle,
  applicationId,
}) => {
  const subject = `🌾 New Job Application Received for "${jobTitle}" - AgriConnect`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; background-color: #F8FAFC;">
      <div style="max-width: 550px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #E5E7EB;">
        <h2 style="color: #16A34A; margin-top: 0;">New Application Received!</h2>
        <p style="font-size: 15px; color: #374151;">Hello <strong>${farmerName || 'Farmer'}</strong>,</p>
        <p style="font-size: 14px; color: #4B5563; line-height: 1.6;">
          <strong>${workerName}</strong> has just submitted a job application for your posting:
        </p>
        <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #15803D; font-size: 16px;">${jobTitle}</h3>
          <p style="margin: 0; font-size: 13px; color: #166534;">Application Ref ID: #${applicationId}</p>
        </div>
        <p style="font-size: 14px; color: #4B5563;">
          Log into your AgriConnect farmer dashboard to review the worker profile, cover letter, and shortlist or contact the candidate.
        </p>
      </div>
    </div>
  `;
  return await sendEmail({ to: farmerEmail, subject, html });
};

/**
 * Send Application Withdrawal Notification Email to Farmer
 */
export const sendApplicationWithdrawalNotificationEmail = async ({
  farmerEmail,
  farmerName,
  workerName,
  jobTitle,
  applicationId,
}) => {
  const subject = `Notice: Job Application Withdrawn for "${jobTitle}" - AgriConnect`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; background-color: #F8FAFC;">
      <div style="max-width: 550px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #E5E7EB;">
        <h2 style="color: #DC2626; margin-top: 0;">Application Withdrawn</h2>
        <p style="font-size: 15px; color: #374151;">Hello <strong>${farmerName || 'Farmer'}</strong>,</p>
        <p style="font-size: 14px; color: #4B5563; line-height: 1.6;">
          <strong>${workerName}</strong> has withdrawn their job application for your posting:
        </p>
        <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #991B1B; font-size: 16px;">${jobTitle}</h3>
          <p style="margin: 0; font-size: 13px; color: #B91C1C;">Application Ref ID: #${applicationId}</p>
        </div>
        <p style="font-size: 14px; color: #4B5563;">
          Your job's total application count has been updated automatically. You can review other candidates on your AgriConnect dashboard.
        </p>
      </div>
    </div>
  `;
  return await sendEmail({ to: farmerEmail, subject, html });
};

/**
 * Send Application Acceptance Notification Email to Worker
 */
export const sendApplicationAcceptanceNotificationEmail = async ({
  workerEmail,
  workerName,
  farmerName,
  jobTitle,
  applicationId,
  feedback,
}) => {
  const subject = `🎉 Congratulations! Your Application for "${jobTitle}" has been Accepted - AgriConnect`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; background-color: #F8FAFC;">
      <div style="max-width: 550px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #E5E7EB;">
        <h2 style="color: #16A34A; margin-top: 0;">Application Accepted!</h2>
        <p style="font-size: 15px; color: #374151;">Hello <strong>${workerName || 'Worker'}</strong>,</p>
        <p style="font-size: 14px; color: #4B5563; line-height: 1.6;">
          Great news! <strong>${farmerName || 'The Farmer'}</strong> has accepted your application for:
        </p>
        <div style="background-color: #F0FDF4; border-left: 4px solid #16A34A; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #15803D; font-size: 16px;">${jobTitle}</h3>
          <p style="margin: 0; font-size: 13px; color: #166534;">Ref ID: #${applicationId}</p>
          ${feedback ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #15803D;"><em>Farmer Note: "${feedback}"</em></p>` : ''}
        </div>
        <p style="font-size: 14px; color: #4B5563;">
          Log into AgriConnect to view job instructions and contact the farmer directly.
        </p>
      </div>
    </div>
  `;
  return await sendEmail({ to: workerEmail, subject, html });
};

/**
 * Send Application Rejection Notification Email to Worker
 */
export const sendApplicationRejectionNotificationEmail = async ({
  workerEmail,
  workerName,
  farmerName,
  jobTitle,
  applicationId,
  reason,
}) => {
  const subject = `Update regarding your application for "${jobTitle}" - AgriConnect`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; background-color: #F8FAFC;">
      <div style="max-width: 550px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #E5E7EB;">
        <h2 style="color: #4B5563; margin-top: 0;">Application Update</h2>
        <p style="font-size: 15px; color: #374151;">Hello <strong>${workerName || 'Worker'}</strong>,</p>
        <p style="font-size: 14px; color: #4B5563; line-height: 1.6;">
          Thank you for applying to <strong>${jobTitle}</strong> posted by <strong>${farmerName || 'the farmer'}</strong>.
        </p>
        <div style="background-color: #F3F4F6; border-left: 4px solid #9CA3AF; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #374151;">
            Unfortunately, your application was not selected for this position at this time.
          </p>
          ${reason ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #4B5563;"><em>Feedback / Reason: "${reason}"</em></p>` : ''}
        </div>
        <p style="font-size: 14px; color: #4B5563;">
          We encourage you to explore and apply for other active agricultural jobs on AgriConnect.
        </p>
      </div>
    </div>
  `;
  return await sendEmail({ to: workerEmail, subject, html });
};

/**
 * Send Application Shortlist Notification Email to Worker
 */
export const sendApplicationShortlistNotificationEmail = async ({
  workerEmail,
  workerName,
  farmerName,
  jobTitle,
  applicationId,
}) => {
  const subject = `⭐ You have been Shortlisted for "${jobTitle}" - AgriConnect`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; background-color: #F8FAFC;">
      <div style="max-width: 550px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #E5E7EB;">
        <h2 style="color: #2563EB; margin-top: 0;">You're Shortlisted!</h2>
        <p style="font-size: 15px; color: #374151;">Hello <strong>${workerName || 'Worker'}</strong>,</p>
        <p style="font-size: 14px; color: #4B5563; line-height: 1.6;">
          Good news! <strong>${farmerName || 'The Farmer'}</strong> has shortlisted your profile for the following posting:
        </p>
        <div style="background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #1D4ED8; font-size: 16px;">${jobTitle}</h3>
          <p style="margin: 0; font-size: 13px; color: #1E40AF;">Ref ID: #${applicationId}</p>
        </div>
        <p style="font-size: 14px; color: #4B5563;">
          Keep your phone available! The farmer may contact you directly or proceed to finalize hiring.
        </p>
      </div>
    </div>
  `;
  return await sendEmail({ to: workerEmail, subject, html });
};

/**
 * Send Cancel Hiring Notification Email to Worker
 */
export const sendCancelHiringNotificationEmail = async ({
  workerEmail,
  workerName,
  farmerName,
  jobTitle,
  applicationId,
  reason,
}) => {
  const subject = `Update on Your Hiring for "${jobTitle}" - AgriConnect`;
  const html = `
    <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827; background-color: #F8FAFC;">
      <div style="max-width: 550px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #E5E7EB;">
        <h2 style="color: #92400E; margin-top: 0;">Hiring Update — Position Cancelled</h2>
        <p style="font-size: 15px; color: #374151;">Hello <strong>${workerName || 'Worker'}</strong>,</p>
        <p style="font-size: 14px; color: #4B5563; line-height: 1.6;">
          We regret to inform you that <strong>${farmerName || 'the farmer'}</strong> has cancelled your hiring for:
        </p>
        <div style="background-color: #FFFBEB; border-left: 4px solid #D97706; padding: 16px; margin: 20px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #92400E; font-size: 16px;">${jobTitle}</h3>
          <p style="margin: 0; font-size: 13px; color: #B45309;">Ref ID: #${applicationId}</p>
          ${reason ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #92400E;"><em>Reason: "${reason}"</em></p>` : ''}
        </div>
        <p style="font-size: 14px; color: #4B5563;">
          We encourage you to explore other active agricultural job listings on AgriConnect. We apologize for any inconvenience.
        </p>
      </div>
    </div>
  `;
  return await sendEmail({ to: workerEmail, subject, html });
};
