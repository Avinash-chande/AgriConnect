import nodemailer from 'nodemailer';

/**
 * Creates and verifies Nodemailer SMTP Transporter
 */
export const createEmailTransporter = () => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });

  return transporter;
};

/**
 * Send Email helper function
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  if (process.env.NODE_ENV === 'test') {
    return { messageId: 'test-email-id-mock' };
  }

  const transporter = createEmailTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'AgriConnect Platform <no-reply@agriconnect.com>',
    to,
    subject,
    text,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};
