import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

interface AbstractEmailData {
  schoolName: string;
  studentName: string;
  teacherName: string;
  teacherEmail: string;
  teacherContact: string;
  projectTitle: string;
  projectDescription: string;
  projectCategory: string;
  fileName: string;
  viewUrl: string;
}

const createTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
};

const generateAdminEmailHtml = (data: AbstractEmailData): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#fbbf24;margin:0;font-size:24px;">New Abstract Submitted!</h1>
      <p style="color:white;margin:10px 0 0 0;font-size:16px;">${data.projectTitle}</p>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <div style="margin-bottom:25px;padding:15px;background:#fef3c7;border-radius:8px;border-left:4px solid #fbbf24;">
        <p style="margin:0;color:#92400e;font-weight:600;">Action Required: Review this abstract submission</p>
      </div>

      <h2 style="color:#1e3a5f;font-size:18px;margin-bottom:15px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">Project Details</h2>
      <table style="width:100%;margin-bottom:25px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">School:</td><td style="padding:8px 0;font-weight:600;">${data.schoolName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Student:</td><td style="padding:8px 0;font-weight:600;">${data.studentName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Teacher/Patron:</td><td style="padding:8px 0;">${data.teacherName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Contact:</td><td style="padding:8px 0;">${data.teacherContact}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Category:</td><td style="padding:8px 0;"><span style="background:#eff6ff;color:#2563eb;padding:2px 10px;border-radius:12px;font-size:13px;">${data.projectCategory}</span></td></tr>
      </table>

      <h2 style="color:#1e3a5f;font-size:18px;margin-bottom:15px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">Description</h2>
      <p style="color:#374151;line-height:1.6;background:#f9fafb;padding:15px;border-radius:8px;margin-bottom:25px;">${data.projectDescription}</p>

      <div style="text-align:center;">
        <a href="${data.viewUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:5px;">View Abstract PDF</a>
        <a href="${process.env.ADMIN_DASHBOARD_URL || 'http://localhost:5173/admin'}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:5px;">Open Dashboard</a>
      </div>
    </div>
    <div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
      <p style="margin:0;">SIM-Lab Kenya Science Fair</p>
      <p style="margin:5px 0 0 0;">This is an automated notification from the abstract submission system.</p>
    </div>
  </div>
</body>
</html>
`;

const generateConfirmationEmailHtml = (data: AbstractEmailData, teacherEmail: string): string => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:linear-gradient(135deg,#1e3a5f 0%,#2563eb 100%);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
      <div style="width:60px;height:60px;background:#22c55e;border-radius:50%;margin:0 auto 15px;line-height:60px;text-align:center;">
        <span style="font-size:30px;color:white;">✓</span>
      </div>
      <h1 style="color:white;margin:0;font-size:24px;">Abstract Received!</h1>
    </div>
    <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
      <p style="font-size:16px;color:#374151;margin-bottom:20px;">
        Hello <strong>${data.teacherName}</strong>,
      </p>
      <p style="font-size:16px;color:#374151;margin-bottom:25px;">
        We have received the science fair abstract for <strong>${data.studentName}</strong> from <strong>${data.schoolName}</strong>. Our team will review it and get back to you with results.
      </p>

      <div style="background:#eff6ff;padding:20px;border-radius:8px;margin-bottom:25px;border-left:4px solid #2563eb;">
        <h2 style="color:#1e3a5f;margin:0 0 15px 0;font-size:16px;">Submission Summary</h2>
        <table style="width:100%;">
          <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Project:</td><td style="padding:6px 0;font-weight:600;">${data.projectTitle}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Category:</td><td style="padding:6px 0;">${data.projectCategory}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Student:</td><td style="padding:6px 0;">${data.studentName}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">File:</td><td style="padding:6px 0;">${data.fileName}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280;">Status:</td><td style="padding:6px 0;"><span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:13px;">Pending Review</span></td></tr>
        </table>
      </div>

      <div style="text-align:center;padding:20px;background:#1e3a5f;border-radius:8px;">
        <h3 style="color:white;margin:0 0 15px 0;">Questions? Contact Us</h3>
        <a href="https://wa.me/254727054994" style="display:inline-block;background:#25D366;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:5px;">WhatsApp</a>
        <a href="mailto:simlabkenya@gmail.com" style="display:inline-block;background:#fbbf24;color:#1e3a5f;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:5px;">Email Us</a>
      </div>
    </div>
    <div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
      <p style="margin:0;font-weight:600;">SIM-Lab Kenya Science Fair</p>
      <p style="margin:5px 0;">IOME001 Innovation Hub, Mombasa, Kenya</p>
      <p style="margin:5px 0 0 0;">
        <a href="mailto:simlabkenya@gmail.com" style="color:#2563eb;">simlabkenya@gmail.com</a> |
        <a href="tel:+254727054994" style="color:#2563eb;">+254 727 054 994</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Missing email configuration');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const data: AbstractEmailData = req.body;

    if (!data.studentName || !data.projectTitle || !data.teacherEmail) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transporter = createTransporter();

    const timeout = (ms: number) =>
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`SMTP timeout after ${ms}ms`)), ms)
      );

    // Send admin notification (12s hard timeout)
    await Promise.race([
      transporter.sendMail({
        from: `"SIM-Lab Science Fair" <${process.env.GMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
        subject: `New Abstract: ${data.projectTitle} — ${data.studentName} (${data.schoolName})`,
        html: generateAdminEmailHtml(data),
      }),
      timeout(12000),
    ]);

    // Send confirmation to teacher/patron
    await Promise.race([
      transporter.sendMail({
        from: `"SIM-Lab Kenya" <${process.env.GMAIL_USER}>`,
        to: data.teacherEmail,
        subject: `Abstract Received: ${data.projectTitle} — SIM-Lab Science Fair`,
        html: generateConfirmationEmailHtml(data, data.teacherEmail),
      }),
      timeout(12000),
    ]);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Abstract email error:', error);
    return res.status(500).json({
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
