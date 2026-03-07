import express from "express";
import nodemailer from "nodemailer";
import { config } from "dotenv";

config(); // Load .env

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

const createTransporter = () =>
  nodemailer.createTransport({
    host: "smtp.gmail.com",
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

app.post("/api/send-abstract-email", async (req, res) => {
  const { schoolName, studentName, teacherName, teacherContact, projectTitle, projectDescription, projectCategory, fileName, viewUrl } = req.body;

  if (!studentName || !projectTitle || !teacherContact) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(500).json({ error: "Email service not configured" });
  }

  try {
    const transporter = createTransporter();

    const timeout = (ms: number) =>
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`SMTP timeout after ${ms}ms`)), ms)
      );

    // Admin notification email
    const adminHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1e3a5f;padding:24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fbbf24;margin:0;font-size:22px;">New Abstract Submitted</h1>
          <p style="color:white;margin:8px 0 0;">${projectTitle}</p>
        </div>
        <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#6b7280;width:140px;">School:</td><td style="font-weight:600;">${schoolName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Student:</td><td style="font-weight:600;">${studentName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Teacher/Patron:</td><td>${teacherName}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Contact:</td><td>${teacherContact}</td></tr>
            <tr><td style="padding:8px 0;color:#6b7280;">Category:</td><td>${projectCategory}</td></tr>
          </table>
          <p style="color:#374151;background:#f9fafb;padding:12px;border-radius:6px;margin-top:16px;">${projectDescription}</p>
          <div style="margin-top:20px;text-align:center;">
            <a href="${viewUrl}" style="background:#2563eb;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:4px;display:inline-block;">View PDF</a>
            <a href="${process.env.ADMIN_DASHBOARD_URL || "http://localhost:5173/admin"}" style="background:#1e3a5f;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin:4px;display:inline-block;">Dashboard</a>
          </div>
        </div>
      </div>`;

    await Promise.race([
      transporter.sendMail({
        from: `"SIM-Lab Science Fair" <${process.env.GMAIL_USER}>`,
        to: process.env.ADMIN_EMAIL || process.env.GMAIL_USER,
        subject: `New Abstract: ${projectTitle} — ${studentName} (${schoolName})`,
        html: adminHtml,
      }),
      timeout(12000),
    ]);

    // Confirmation to teacher if contact is an email
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(teacherContact);
    if (isEmail) {
      const confirmHtml = `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#1e3a5f;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;">Abstract Received!</h1>
          </div>
          <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-radius:0 0 8px 8px;">
            <p>Hello <strong>${teacherName}</strong>,</p>
            <p>We have received the abstract for <strong>${studentName}</strong> from <strong>${schoolName}</strong>. Our team will review it and get back to you with results.</p>
            <div style="background:#eff6ff;padding:16px;border-radius:8px;border-left:4px solid #2563eb;">
              <p style="margin:0 0 8px;"><strong>Project:</strong> ${projectTitle}</p>
              <p style="margin:0 0 8px;"><strong>Category:</strong> ${projectCategory}</p>
              <p style="margin:0;"><strong>File:</strong> ${fileName}</p>
            </div>
          </div>
        </div>`;

      await Promise.race([
        transporter.sendMail({
          from: `"SIM-Lab Kenya" <${process.env.GMAIL_USER}>`,
          to: teacherContact,
          subject: `Abstract Received: ${projectTitle} — SIM-Lab Science Fair`,
          html: confirmHtml,
        }),
        timeout(12000),
      ]);
    }

    console.log(`✓ Email sent for abstract: ${projectTitle}`);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({
      error: "Failed to send email",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Email server running on http://localhost:${PORT}`);
});
