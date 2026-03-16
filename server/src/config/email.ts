import nodemailer from 'nodemailer';

export const createTransporter = () => {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error('Missing email configuration: GMAIL_USER and GMAIL_APP_PASSWORD are required');
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.GMAIL_USER || '';
export const ADMIN_DASHBOARD_URL = process.env.ADMIN_DASHBOARD_URL || 'http://localhost:8080/admin';
export const SUPPORT_PHONE = '+254727054994';
export const SUPPORT_EMAIL = 'simlabkenya@gmail.com';
