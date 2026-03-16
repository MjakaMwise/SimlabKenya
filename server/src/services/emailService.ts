import { createTransporter, ADMIN_EMAIL, ADMIN_DASHBOARD_URL, SUPPORT_PHONE } from '../config/email.js';
import { Order, AbstractSubmission } from '../types/index.js';

const EMAIL_TIMEOUT_MS = 12000;

const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Email timeout after ${ms}ms`)), ms)
    ),
  ]);

// ── Helpers ──────────────────────────────────────────────────────────────────

export const formatPhoneForWhatsApp = (phone: string): string => {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.slice(1);
  if (!cleaned.startsWith('+')) cleaned = cleaned.startsWith('254') ? '+' + cleaned : '+254' + cleaned;
  return cleaned.replace('+', '');
};

const getPaymentInfo = (method: string, location?: string): string => {
  if (method === 'pickup') return 'Pay on collection at IOME001 Innovation Hub (Cash or M-Pesa)';
  if (location === 'mombasa') return 'Pay on Delivery (Cash or M-Pesa)';
  return 'Payment required before shipping (M-Pesa or Bank Transfer)';
};

// ── Order Emails ──────────────────────────────────────────────────────────────

const buildOrderItemsHtml = (items: Order['items'], showPrice = true): string =>
  items
    .map(
      (item) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;">${item.name}${item.size ? ` (${item.size})` : ''}</td>
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
      ${showPrice ? `<td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">KES ${item.price.toLocaleString()}</td>` : ''}
      <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">KES ${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`
    )
    .join('');

const buildAdminOrderHtml = (order: Order): string => {
  const wa = formatPhoneForWhatsApp(order.customer_phone);
  const waMsg = encodeURIComponent(
    `Hello ${order.customer_name}, this is SIM-Lab Kenya regarding your order #${order.order_number}. We're reaching out to confirm your order details.`
  );
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fbbf24;margin:0;font-size:24px;">New Order Received!</h1>
    <p style="color:white;margin:10px 0 0;font-size:18px;">Order #${order.order_number}</p>
  </div>
  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div style="margin-bottom:25px;padding:15px;background:#fef3c7;border-radius:8px;border-left:4px solid #fbbf24;">
      <p style="margin:0;color:#92400e;font-weight:600;">Action Required: Contact customer within 24 hours</p>
    </div>
    <h2 style="color:#1e3a5f;font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">Customer Information</h2>
    <table style="width:100%;margin-bottom:25px;">
      <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Name:</td><td style="font-weight:600;">${order.customer_name}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Email:</td><td><a href="mailto:${order.customer_email}" style="color:#2563eb;">${order.customer_email}</a></td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Phone:</td><td><a href="tel:${order.customer_phone}" style="color:#2563eb;">${order.customer_phone}</a></td></tr>
    </table>
    <div style="margin-bottom:25px;text-align:center;">
      <a href="https://wa.me/${wa}?text=${waMsg}" style="display:inline-block;background:#25D366;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:5px;">WhatsApp</a>
      <a href="tel:${order.customer_phone}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:5px;">Call</a>
    </div>
    <h2 style="color:#1e3a5f;font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">Delivery Details</h2>
    <table style="width:100%;margin-bottom:25px;">
      <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Method:</td><td style="font-weight:600;">${order.delivery_method === 'pickup' ? 'Pickup at IOME001 Hub' : 'Delivery'}</td></tr>
      ${order.delivery_location ? `<tr><td style="padding:8px 0;color:#6b7280;">Location:</td><td>${order.delivery_location === 'mombasa' ? 'Within Mombasa' : 'Outside Mombasa'}</td></tr>` : ''}
      ${order.delivery_address ? `<tr><td style="padding:8px 0;color:#6b7280;">Address:</td><td>${order.delivery_address}</td></tr>` : ''}
      <tr><td style="padding:8px 0;color:#6b7280;">Payment:</td><td style="font-weight:600;color:#059669;">${getPaymentInfo(order.delivery_method, order.delivery_location)}</td></tr>
    </table>
    <h2 style="color:#1e3a5f;font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">Items Ordered</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="padding:12px;text-align:left;color:#374151;">Item</th>
        <th style="padding:12px;text-align:center;color:#374151;">Qty</th>
        <th style="padding:12px;text-align:right;color:#374151;">Price</th>
        <th style="padding:12px;text-align:right;color:#374151;">Subtotal</th>
      </tr></thead>
      <tbody>${buildOrderItemsHtml(order.items)}</tbody>
    </table>
    <div style="background:#1e3a5f;padding:20px;border-radius:8px;text-align:right;">
      <span style="color:white;font-size:18px;">Total: </span>
      <span style="color:#fbbf24;font-size:24px;font-weight:bold;">KES ${order.total_amount.toLocaleString()}</span>
    </div>
    ${order.additional_notes ? `<div style="margin-top:25px;padding:15px;background:#f3f4f6;border-radius:8px;"><h3 style="color:#1e3a5f;margin:0 0 10px;font-size:14px;">Additional Notes:</h3><p style="margin:0;color:#4b5563;">${order.additional_notes}</p></div>` : ''}
  </div>
  <div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
    <p style="margin:0;">SIM-Lab Kenya — Automated shop notification</p>
  </div>
</div>
</body></html>`;
};

const buildCustomerOrderHtml = (order: Order): string => `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;">Order Confirmed!</h1>
    <p style="color:#fbbf24;margin:10px 0 0;font-size:18px;font-weight:bold;">#${order.order_number}</p>
  </div>
  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <p style="font-size:16px;color:#374151;">Hello <strong>${order.customer_name}</strong>,</p>
    <p style="font-size:16px;color:#374151;margin-bottom:25px;">Thank you for your order! We've received your request and will contact you within 24 hours.</p>
    <div style="background:#eff6ff;padding:20px;border-radius:8px;margin-bottom:25px;border-left:4px solid #2563eb;">
      <h2 style="color:#1e3a5f;margin:0 0 15px;font-size:16px;">What Happens Next?</h2>
      <ol style="margin:0;padding-left:20px;color:#374151;">
        <li style="margin-bottom:8px;">We'll contact you within <strong>24 hours</strong> to confirm your order</li>
        <li style="margin-bottom:8px;">We'll verify availability and confirm the final price</li>
        <li>We'll arrange payment and ${order.delivery_method === 'pickup' ? 'pickup' : 'delivery'} details</li>
      </ol>
    </div>
    <h2 style="color:#1e3a5f;font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">Order Summary</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead><tr style="background:#f3f4f6;">
        <th style="padding:12px;text-align:left;color:#374151;">Item</th>
        <th style="padding:12px;text-align:center;color:#374151;">Qty</th>
        <th style="padding:12px;text-align:right;color:#374151;">Subtotal</th>
      </tr></thead>
      <tbody>${buildOrderItemsHtml(order.items, false)}</tbody>
    </table>
    <div style="background:#fef3c7;padding:15px;border-radius:8px;margin-bottom:25px;">
      <table style="width:100%;">
        <tr><td style="color:#374151;">Subtotal:</td><td style="text-align:right;">KES ${order.total_amount.toLocaleString()}</td></tr>
        <tr><td style="color:#374151;">Delivery:</td><td style="text-align:right;">TBD</td></tr>
        <tr><td style="padding-top:10px;border-top:1px solid #fbbf24;font-weight:bold;color:#1e3a5f;">Total:</td><td style="padding-top:10px;border-top:1px solid #fbbf24;text-align:right;font-weight:bold;color:#1e3a5f;font-size:18px;">KES ${order.total_amount.toLocaleString()}</td></tr>
      </table>
    </div>
    <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin-bottom:25px;">
      <h3 style="color:#1e3a5f;margin:0 0 10px;font-size:14px;">Delivery Method</h3>
      <p style="margin:0 0 15px;color:#374151;">${order.delivery_method === 'pickup' ? 'Pickup at IOME001 Innovation Hub' : `Delivery${order.delivery_location ? ` (${order.delivery_location === 'mombasa' ? 'Within Mombasa' : 'Outside Mombasa'})` : ''}`}</p>
      <h3 style="color:#1e3a5f;margin:0 0 10px;font-size:14px;">Payment</h3>
      <p style="margin:0;color:#374151;">${getPaymentInfo(order.delivery_method, order.delivery_location)}</p>
    </div>
    <div style="text-align:center;padding:20px;background:#1e3a5f;border-radius:8px;">
      <h3 style="color:white;margin:0 0 15px;">Need Help?</h3>
      <a href="https://wa.me/${SUPPORT_PHONE.replace('+', '')}" style="display:inline-block;background:#25D366;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:5px;">WhatsApp</a>
      <a href="tel:${SUPPORT_PHONE}" style="display:inline-block;background:#fbbf24;color:#1e3a5f;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin:5px;">Call Us</a>
    </div>
  </div>
  <div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
    <p style="margin:0;font-weight:600;">SIM-Lab Kenya</p>
    <p style="margin:5px 0;font-style:italic;">Science in Motion</p>
    <p style="margin:10px 0 0;">IOME001 Innovation Hub, Mombasa, Kenya</p>
  </div>
</div>
</body></html>`;

export const sendOrderEmails = async (order: Order): Promise<void> => {
  const transporter = createTransporter();
  const from = `"SIM-Lab Kenya" <${process.env.GMAIL_USER}>`;

  await withTimeout(
    transporter.sendMail({
      from: `"SIM-Lab Shop" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `New Order #${order.order_number} — ${order.customer_name}`,
      html: buildAdminOrderHtml(order),
    }),
    EMAIL_TIMEOUT_MS
  );

  await withTimeout(
    transporter.sendMail({
      from,
      to: order.customer_email,
      subject: `Order Confirmation — SIM-Lab Kenya #${order.order_number}`,
      html: buildCustomerOrderHtml(order),
    }),
    EMAIL_TIMEOUT_MS
  );
};

// ── Abstract Emails ───────────────────────────────────────────────────────────

export const sendAbstractEmails = async (
  data: AbstractSubmission & { fileName: string; viewUrl: string }
): Promise<void> => {
  const transporter = createTransporter();
  const studentLabel = data.studentNames.length === 1 ? 'Student' : 'Students';
  const studentList = data.studentNames.join(', ');
  const studentListHtml = data.studentNames.length === 1
    ? data.studentNames[0]
    : data.studentNames.map((n) => `<li style="margin:2px 0;">${n}</li>`).join('');
  const studentDisplay = data.studentNames.length === 1
    ? studentListHtml
    : `<ul style="margin:4px 0;padding-left:18px;">${studentListHtml}</ul>`;

  const adminHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fbbf24;margin:0;font-size:24px;">New Abstract Submitted!</h1>
    <p style="color:white;margin:10px 0 0;font-size:16px;">${data.projectTitle}</p>
  </div>
  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <div style="margin-bottom:25px;padding:15px;background:#fef3c7;border-radius:8px;border-left:4px solid #fbbf24;">
      <p style="margin:0;color:#92400e;font-weight:600;">Action Required: Review this abstract submission</p>
    </div>
    <h2 style="color:#1e3a5f;font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">Project Details</h2>
    <table style="width:100%;margin-bottom:25px;">
      <tr><td style="padding:8px 0;color:#6b7280;width:140px;">School:</td><td style="font-weight:600;">${data.schoolName}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;vertical-align:top;">${studentLabel}:</td><td style="font-weight:600;">${studentDisplay}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Teacher/Patron:</td><td>${data.teacherName}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Contact:</td><td>${data.teacherContact}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7280;">Category:</td><td><span style="background:#eff6ff;color:#2563eb;padding:2px 10px;border-radius:12px;font-size:13px;">${data.projectCategory}</span></td></tr>
    </table>
    <h2 style="color:#1e3a5f;font-size:18px;border-bottom:2px solid #e5e7eb;padding-bottom:10px;">Description</h2>
    <p style="color:#374151;line-height:1.6;background:#f9fafb;padding:15px;border-radius:8px;margin-bottom:25px;">${data.projectDescription}</p>
    <div style="text-align:center;">
      <a href="${data.viewUrl}" style="display:inline-block;background:#2563eb;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:5px;">View Submitted File</a>
      <a href="${ADMIN_DASHBOARD_URL}" style="display:inline-block;background:#1e3a5f;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:5px;">Open Dashboard</a>
    </div>
  </div>
</div>
</body></html>`;

  const teacherHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;">Abstract Received!</h1>
  </div>
  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <p style="font-size:16px;color:#374151;">Hello <strong>${data.teacherName}</strong>,</p>
    <p style="font-size:16px;color:#374151;margin-bottom:25px;">We have received the science fair abstract for <strong>${studentList}</strong> from <strong>${data.schoolName}</strong>. Our team will review it and get back to you with results.</p>
    <div style="background:#eff6ff;padding:20px;border-radius:8px;border-left:4px solid #2563eb;">
      <h2 style="color:#1e3a5f;margin:0 0 15px;font-size:16px;">Submission Summary</h2>
      <table style="width:100%;">
        <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Project:</td><td style="font-weight:600;">${data.projectTitle}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Category:</td><td>${data.projectCategory}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">${studentLabel}:</td><td>${studentDisplay}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">File:</td><td>${data.fileName}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Status:</td><td><span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:12px;font-size:13px;">Pending Review</span></td></tr>
      </table>
    </div>
  </div>
</div>
</body></html>`;

  await withTimeout(
    transporter.sendMail({
      from: `"SIM-Lab Science Fair" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      subject: `New Abstract: ${data.projectTitle} — ${studentList} (${data.schoolName})`,
      html: adminHtml,
    }),
    EMAIL_TIMEOUT_MS
  );

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.teacherEmail);
  if (isEmail) {
    await withTimeout(
      transporter.sendMail({
        from: `"SIM-Lab Kenya" <${process.env.GMAIL_USER}>`,
        to: data.teacherEmail,
        subject: `Abstract Received: ${data.projectTitle} — SIM-Lab Science Fair`,
        html: teacherHtml,
      }),
      EMAIL_TIMEOUT_MS
    );
  }
};

// ── Abstract Status Update Email ──────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:  { bg: '#fef3c7', color: '#92400e', label: 'Pending Review' },
  reviewed: { bg: '#dbeafe', color: '#1e40af', label: 'Reviewed' },
  accepted: { bg: '#d1fae5', color: '#065f46', label: 'Accepted' },
  rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
};

export const sendAbstractStatusEmail = async (data: {
  teacherName: string;
  teacherEmail: string;
  studentNames: string[];
  schoolName: string;
  projectTitle: string;
  projectCategory: string;
  status: string;
}): Promise<void> => {
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.teacherEmail);
  if (!isEmail) return;

  const style = STATUS_STYLES[data.status] ?? { bg: '#f3f4f6', color: '#374151', label: data.status };
  const studentLabel = data.studentNames.length === 1 ? 'Student' : 'Students';
  const studentList = data.studentNames.join(', ');
  const studentDisplay = data.studentNames.length === 1
    ? data.studentNames[0]
    : `<ul style="margin:4px 0;padding-left:18px;">${data.studentNames.map((n) => `<li style="margin:2px 0;">${n}</li>`).join('')}</ul>`;

  const isAccepted = data.status === 'accepted';
  const isRejected = data.status === 'rejected';

  const messageBody = isAccepted
    ? `We are pleased to inform you that the abstract for <strong>${studentList}</strong>'s project has been <strong>accepted</strong>. Our team will be in touch with further details regarding participation.`
    : isRejected
    ? `We regret to inform you that the abstract for <strong>${studentList}</strong>'s project was not selected at this time. We encourage you to refine the project and resubmit in future events.`
    : `The review status for <strong>${studentList}</strong>'s abstract has been updated. Please see the details below.`;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:white;margin:0;font-size:24px;">Abstract Status Update</h1>
    <p style="color:#fbbf24;margin:10px 0 0;font-size:14px;">SIM-Lab Kenya Science Fair</p>
  </div>
  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <p style="font-size:16px;color:#374151;">Dear <strong>${data.teacherName}</strong>,</p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin-bottom:25px;">${messageBody}</p>

    <div style="background:#eff6ff;padding:20px;border-radius:8px;border-left:4px solid #2563eb;margin-bottom:25px;">
      <h2 style="color:#1e3a5f;margin:0 0 15px;font-size:16px;">Submission Details</h2>
      <table style="width:100%;">
        <tr><td style="padding:6px 0;color:#6b7280;width:120px;">Project:</td><td style="font-weight:600;">${data.projectTitle}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Category:</td><td>${data.projectCategory}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;vertical-align:top;">${studentLabel}:</td><td>${studentDisplay}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">School:</td><td>${data.schoolName}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Status:</td>
          <td><span style="background:${style.bg};color:${style.color};padding:3px 12px;border-radius:12px;font-size:13px;font-weight:600;">${style.label}</span></td>
        </tr>
      </table>
    </div>

    <p style="color:#6b7280;font-size:13px;line-height:1.6;">If you have any questions, please don't hesitate to contact us.</p>

    <div style="text-align:center;margin-top:25px;padding:20px;background:#1e3a5f;border-radius:8px;">
      <p style="color:white;margin:0 0 10px;font-weight:600;">Need Help?</p>
      <a href="mailto:${ADMIN_EMAIL}" style="display:inline-block;background:#fbbf24;color:#1e3a5f;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Contact Us</a>
    </div>
  </div>
  <div style="text-align:center;padding:20px;color:#6b7280;font-size:12px;">
    <p style="margin:0;font-weight:600;">SIM-Lab Kenya</p>
    <p style="margin:5px 0;font-style:italic;">Science in Motion</p>
  </div>
</div>
</body></html>`;

  const transporter = createTransporter();
  await withTimeout(
    transporter.sendMail({
      from: `"SIM-Lab Science Fair" <${process.env.GMAIL_USER}>`,
      to: data.teacherEmail,
      subject: `Abstract ${style.label}: ${data.projectTitle} — SIM-Lab Science Fair`,
      html,
    }),
    EMAIL_TIMEOUT_MS
  );
};

// ── OTP Email ─────────────────────────────────────────────────────────────────

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const transporter = createTransporter();
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',sans-serif;background:#f3f4f6;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:30px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#fbbf24;margin:0;font-size:24px;">Two-Factor Authentication</h1>
    <p style="color:white;margin:10px 0 0;font-size:14px;">Admin Panel Access</p>
  </div>
  <div style="background:white;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
    <p style="color:#374151;font-size:14px;line-height:1.6;">You're attempting to sign in to the SIM-Lab Kenya Admin Panel. Enter the following one-time code to complete your login. This code expires in 10 minutes.</p>
    <div style="margin:30px 0;text-align:center;">
      <div style="background:#f0f9ff;border:2px dashed #2563eb;padding:20px;border-radius:8px;margin-bottom:20px;">
        <p style="margin:0;color:#1e40af;font-size:32px;font-weight:bold;letter-spacing:6px;font-family:'Courier New',monospace;">${otp}</p>
      </div>
      <p style="margin:0;color:#6b7280;font-size:12px;">This code is for: ${email}</p>
    </div>
    <div style="padding:15px;background:#fef3c7;border-left:4px solid #fbbf24;border-radius:4px;">
      <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">Security Notice</p>
      <p style="margin:8px 0 0;color:#92400e;font-size:12px;">Never share this code with anyone. SIM-Lab Kenya staff will never ask for your OTP code.</p>
    </div>
  </div>
</div>
</body></html>`;

  await withTimeout(
    transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'Your SIM-Lab Kenya Admin 2FA Code',
      html,
    }),
    EMAIL_TIMEOUT_MS
  );
};
