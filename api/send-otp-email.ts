import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
};

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate OTP email HTML
const generateOTPEmailHtml = (otp: string, adminEmail: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: #fbbf24; margin: 0; font-size: 24px;">🔐 Two-Factor Authentication</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 14px;">Admin Panel Access</p>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">
        Hello,
      </p>
      
      <p style="margin: 0 0 20px 0; color: #374151; font-size: 14px; line-height: 1.6;">
        You're attempting to sign in to the SIM-Lab Kenya Admin Panel. Enter the following one-time code to complete your login. This code expires in 10 minutes.
      </p>
      
      <!-- OTP Code -->
      <div style="margin: 30px 0; text-align: center;">
        <div style="background: #f0f9ff; border: 2px dashed #2563eb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #1e40af; font-size: 32px; font-weight: bold; letter-spacing: 6px; font-family: 'Courier New', monospace;">
            ${otp}
          </p>
        </div>
        <p style="margin: 0; color: #6b7280; font-size: 12px;">This code is for: ${adminEmail}</p>
      </div>
      
      <!-- Security Notice -->
      <div style="margin: 25px 0; padding: 15px; background: #fef3c7; border-left: 4px solid #fbbf24; border-radius: 4px;">
        <p style="margin: 0; color: #92400e; font-size: 13px; font-weight: 600;">
          ⚠️ Security Notice
        </p>
        <p style="margin: 8px 0 0 0; color: #92400e; font-size: 12px;">
          Never share this code with anyone. SIM-Lab Kenya staff will never ask for your OTP code.
        </p>
      </div>
      
      <!-- Footer -->
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">
          © 2026 SIM-Lab Kenya. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;
};

interface SendOTPRequest {
  email: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body as SendOTPRequest;

    // Validate email
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Check if email is authorized for admin access
    const ADMIN_EMAILS = ['simlabkenya@gmail.com'];
    if (!ADMIN_EMAILS.includes(email)) {
      // Don't reveal whether email is admin or not (security best practice)
      return res.status(200).json({ 
        success: true, 
        message: 'If this email is registered for admin access, you will receive an OTP.' 
      });
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in database
    const { error: dbError } = await supabase
      .from('admin_2fa_otp')
      .insert({
        admin_email: email,
        otp_code: otp,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to generate OTP' });
    }

    // Send OTP email
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: '🔐 Your SIM-Lab Kenya Admin 2FA Code',
      html: generateOTPEmailHtml(otp, email),
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ error: 'Failed to send OTP email' });
  }
}
