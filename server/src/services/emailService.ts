import { createTransporter, FROM_ADDRESS, ResendError, ADMIN_EMAIL, ADMIN_DASHBOARD_URL, SUPPORT_PHONE } from '../config/email.js';
import { Order, AbstractSubmission } from '../types/index.js';
import { layout, p, h2, rows, button, link, esc } from './emailTemplate.js';

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

const itemsTable = (items: Order['items'], showPrice: boolean): string => {
  const th = (t: string, align: string) =>
    `<th style="padding:8px 0;text-align:${align};font-size:12px;font-weight:600;color:#666666;border-bottom:1px solid #222222;">${t}</th>`;
  const td = (t: string, align = 'left') =>
    `<td style="padding:10px 0;text-align:${align};border-bottom:1px solid #e6e6e6;font-size:15px;">${t}</td>`;
  return `<table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>${th('Item', 'left')}${th('Qty', 'center')}${showPrice ? th('Price', 'right') : ''}${th('Subtotal', 'right')}</tr>
    ${items
      .map(
        (i) => `<tr>${td(esc(i.name) + (i.size ? ` (${esc(i.size)})` : ''))}${td(String(i.quantity), 'center')}${
          showPrice ? td(`KES ${i.price.toLocaleString()}`, 'right') : ''
        }${td(`KES ${(i.price * i.quantity).toLocaleString()}`, 'right')}</tr>`
      )
      .join('')}
  </table>`;
};

const deliveryLabel = (order: Order): string =>
  order.delivery_method === 'pickup'
    ? 'Pickup at IOME001 Innovation Hub'
    : `Delivery${order.delivery_location ? ` (${order.delivery_location === 'mombasa' ? 'within Mombasa' : 'outside Mombasa'})` : ''}`;

const total = (order: Order): string =>
  `<p style="margin:16px 0 0;text-align:right;font-size:17px;font-weight:600;color:#111111;">Total: KES ${order.total_amount.toLocaleString()}</p>`;

const buildAdminOrderHtml = (order: Order): string => {
  const wa = formatPhoneForWhatsApp(order.customer_phone);
  const waMsg = encodeURIComponent(
    `Hello ${order.customer_name}, this is SIM-Lab Kenya regarding your order #${order.order_number}. We're reaching out to confirm your order details.`
  );
  return layout(
    `New order ${order.order_number}`,
    p('Contact the customer within 24 hours.') +
      h2('Customer') +
      rows([
        ['Name', esc(order.customer_name)],
        ['Email', link(`mailto:${order.customer_email}`, order.customer_email)],
        ['Phone', link(`tel:${order.customer_phone}`, order.customer_phone)],
      ]) +
      `<div style="margin-top:12px;">${button(`https://wa.me/${wa}?text=${waMsg}`, 'WhatsApp')}${button(`tel:${order.customer_phone}`, 'Call')}</div>` +
      h2('Delivery') +
      rows([
        ['Method', esc(deliveryLabel(order))],
        ...(order.delivery_address ? [['Address', esc(order.delivery_address)] as [string, string]] : []),
        ['Payment', esc(getPaymentInfo(order.delivery_method, order.delivery_location))],
      ]) +
      h2('Items') +
      itemsTable(order.items, true) +
      total(order) +
      (order.additional_notes ? h2('Notes') + p(esc(order.additional_notes)) : ''),
    { footer: 'Automated shop notification' }
  );
};

const buildCustomerOrderHtml = (order: Order): string =>
  layout(
    'Order received',
    p(`Hello ${esc(order.customer_name)},`) +
      p(`Thank you for your order <strong>${esc(order.order_number)}</strong>. We will contact you within 24 hours to confirm availability and the final price, then arrange payment and ${order.delivery_method === 'pickup' ? 'pickup' : 'delivery'}.`) +
      h2('Order') +
      itemsTable(order.items, false) +
      total(order) +
      p('<span style="font-size:13px;color:#666666;">Delivery fee, if any, is confirmed when we contact you.</span>') +
      h2('Delivery and payment') +
      rows([
        ['Delivery', esc(deliveryLabel(order))],
        ['Payment', esc(getPaymentInfo(order.delivery_method, order.delivery_location))],
      ]) +
      `<div style="margin-top:24px;">${button(`https://wa.me/${SUPPORT_PHONE.replace('+', '')}`, 'WhatsApp us')}${button(`tel:${SUPPORT_PHONE}`, 'Call us')}</div>`
  );

export const sendOrderEmails = async (order: Order): Promise<void> => {
  const transporter = createTransporter();
  const from = `"SIM-Lab Kenya" <${FROM_ADDRESS}>`;

  await withTimeout(
    transporter.sendMail({
      from: `"SIM-Lab Shop" <${FROM_ADDRESS}>`,
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
  data: AbstractSubmission & { fileName: string; abstractId: string }
): Promise<void> => {
  const transporter = createTransporter();
  const studentLabel = data.studentNames.length === 1 ? 'Student' : 'Students';
  const studentList = data.studentNames.join(', ');
  const studentDisplay = data.studentNames.map(esc).join('<br>');

  const adminHtml = layout(
    'New abstract submitted',
    p('Review this submission in the dashboard.') +
      rows([
        ['Project', `<strong>${esc(data.projectTitle)}</strong>`],
        ['Category', esc(data.projectCategory)],
        ['School', esc(data.schoolName)],
        [studentLabel, studentDisplay],
        ['Teacher/Patron', esc(data.teacherName)],
        ['Contact', esc(data.teacherContact)],
      ]) +
      h2('Description') +
      p(esc(data.projectDescription)) +
      `<div style="margin-top:8px;">${button(`${ADMIN_DASHBOARD_URL}/abstracts/${data.abstractId}`, 'Review submission')}</div>`,
    { footer: 'Automated science fair notification' }
  );

  const teacherHtml = layout(
    'Abstract received',
    p(`Hello ${esc(data.teacherName)},`) +
      p(`We have received the science fair abstract for <strong>${esc(studentList)}</strong> from ${esc(data.schoolName)}. Our team will review it and get back to you with the result.`) +
      rows([
        ['Project', esc(data.projectTitle)],
        ['Category', esc(data.projectCategory)],
        [studentLabel, studentDisplay],
        ['File', esc(data.fileName)],
        ['Status', 'Pending review'],
      ])
  );

  await withTimeout(
    transporter.sendMail({
      from: `"SIM-Lab Science Fair" <${FROM_ADDRESS}>`,
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
        from: `"SIM-Lab Kenya" <${FROM_ADDRESS}>`,
        to: data.teacherEmail,
        subject: `Abstract Received: ${data.projectTitle} — SIM-Lab Science Fair`,
        html: teacherHtml,
      }),
      EMAIL_TIMEOUT_MS
    );
  }
};

// ── Abstract Status Update Email ──────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending review',
  reviewed: 'Reviewed',
  accepted: 'Accepted',
  rejected: 'Not selected',
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

  const label = STATUS_LABELS[data.status] ?? data.status;
  const studentLabel = data.studentNames.length === 1 ? 'Student' : 'Students';
  const studentList = esc(data.studentNames.join(', '));
  const studentDisplay = data.studentNames.map(esc).join('<br>');

  const messageBody =
    data.status === 'accepted'
      ? `We are pleased to tell you that the abstract for <strong>${studentList}</strong> has been <strong>accepted</strong>. We will be in touch with details about participation.`
      : data.status === 'rejected'
      ? `Thank you for submitting. The abstract for <strong>${studentList}</strong> was not selected this time. We encourage you to refine the project and submit again at a future event.`
      : `The review status of the abstract for <strong>${studentList}</strong> has been updated.`;

  const html = layout(
    'Abstract status update',
    p(`Dear ${esc(data.teacherName)},`) +
      p(messageBody) +
      rows([
        ['Project', esc(data.projectTitle)],
        ['Category', esc(data.projectCategory)],
        [studentLabel, studentDisplay],
        ['School', esc(data.schoolName)],
        ['Status', `<strong>${esc(label)}</strong>`],
      ]) +
      `<p style="margin:24px 0 0;font-size:14px;color:#444444;">Questions? Reply to this email or write to ${link(`mailto:${ADMIN_EMAIL}`, ADMIN_EMAIL)}.</p>`
  );

  const transporter = createTransporter();
  await withTimeout(
    transporter.sendMail({
      from: `"SIM-Lab Science Fair" <${FROM_ADDRESS}>`,
      to: data.teacherEmail,
      subject: `Abstract ${label}: ${data.projectTitle} — SIM-Lab Science Fair`,
      html,
    }),
    EMAIL_TIMEOUT_MS
  );
};

// ── Ocean Shujaa Emails ───────────────────────────────────────────────────────

export interface OceanShujaaRegistrationMail {
  participantName: string;
  level: string;
  institution: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  groupSize: number;
  status: string;
}

const OS_STATUS_LABELS: Record<string, string> = {
  pending: 'Received',
  confirmed: 'Confirmed',
  waitlisted: 'Waitlisted',
  cancelled: 'Cancelled',
};

const OS_STATUS_MESSAGES: Record<string, string> = {
  confirmed: 'Your place is <strong>confirmed</strong>. We will send joining details before the programme starts.',
  waitlisted: 'The programme is full for now, so you are on the <strong>waitlist</strong>. We will contact you as soon as a place opens.',
  cancelled: 'This registration has been <strong>cancelled</strong>. If this is a surprise, please get in touch and we will sort it out.',
  pending: 'Your registration is <strong>pending</strong> while we review it.',
};

const oceanShujaaDetails = (d: OceanShujaaRegistrationMail, label?: string): string =>
  rows([
    ['Participant', esc(d.participantName)],
    ['Level', esc(d.level.replace(/_/g, ' '))],
    ['School / group', esc(d.institution)],
    ...(d.groupSize > 1 ? ([['Group size', String(d.groupSize)]] as [string, string][]) : []),
    ...(label ? ([['Status', `<strong>${esc(label)}</strong>`]] as [string, string][]) : []),
  ]);

const oceanShujaaFooter = `<p style="margin:24px 0 0;font-size:14px;color:#444444;">Questions? Reply to this email or call ${esc(SUPPORT_PHONE)}.</p>`;

export const sendOceanShujaaRegistrationEmail = async (d: OceanShujaaRegistrationMail): Promise<void> => {
  const transporter = createTransporter();
  const from = `"Ocean Shujaa" <${FROM_ADDRESS}>`;

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.guardianEmail)) {
    await withTimeout(
      transporter.sendMail({
        from,
        to: d.guardianEmail,
        subject: `We received your Ocean Shujaa registration — ${d.participantName}`,
        html: layout(
          'Registration received',
          p(`Dear ${esc(d.guardianName)},`) +
            p(`Thank you for registering <strong>${esc(d.participantName)}</strong> for Ocean Shujaa. We will review it and email you once your place is confirmed.`) +
            oceanShujaaDetails(d) +
            oceanShujaaFooter,
          { brand: 'oceanShujaa' }
        ),
      }),
      EMAIL_TIMEOUT_MS
    );
  }

  if (ADMIN_EMAIL) {
    await withTimeout(
      transporter.sendMail({
        from,
        to: ADMIN_EMAIL,
        subject: `New Ocean Shujaa registration — ${d.participantName}`,
        html: layout(
          'New registration',
          oceanShujaaDetails(d) +
            h2('Guardian') +
            rows([
              ['Name', esc(d.guardianName)],
              ['Email', link(`mailto:${d.guardianEmail}`, d.guardianEmail)],
              ['Phone', esc(d.guardianPhone)],
            ]) +
            `<p style="margin:24px 0 0;">${button(`${ADMIN_DASHBOARD_URL}/ocean-shujaa`, 'Open registrations')}</p>`,
          { brand: 'oceanShujaa' }
        ),
      }),
      EMAIL_TIMEOUT_MS
    );
  }
};

export const sendOceanShujaaStatusEmail = async (d: OceanShujaaRegistrationMail): Promise<void> => {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.guardianEmail)) return;
  const label = OS_STATUS_LABELS[d.status] ?? d.status;
  const transporter = createTransporter();
  await withTimeout(
    transporter.sendMail({
      from: `"Ocean Shujaa" <${FROM_ADDRESS}>`,
      to: d.guardianEmail,
      subject: `Ocean Shujaa registration ${label.toLowerCase()} — ${d.participantName}`,
      html: layout(
        'Registration update',
        p(`Dear ${esc(d.guardianName)},`) +
          p(OS_STATUS_MESSAGES[d.status] ?? `The status of this registration is now <strong>${esc(label)}</strong>.`) +
          oceanShujaaDetails(d, label) +
          oceanShujaaFooter,
        { brand: 'oceanShujaa' }
      ),
    }),
    EMAIL_TIMEOUT_MS
  );
};

// ── OTP Email ─────────────────────────────────────────────────────────────────

export const sendOTPEmail = async (email: string, otp: string): Promise<void> => {
  const transporter = createTransporter();
  const html = layout(
    'Your sign-in code',
    p('Use this code to finish signing in to the SIM-Lab Kenya admin panel. It expires in 10 minutes.') +
      `<p style="margin:24px 0;font-size:32px;font-weight:600;letter-spacing:8px;font-family:'Courier New',monospace;color:#111111;">${esc(otp)}</p>` +
      p(`<span style="font-size:13px;color:#666666;">Requested for ${esc(email)}. If this wasn't you, ignore this email. Never share this code with anyone.</span>`)
  );

  await withTimeout(
    transporter.sendMail({
      from: `"SIM-Lab Kenya" <${FROM_ADDRESS}>`,
      to: email,
      subject: 'Your SIM-Lab Kenya Admin 2FA Code',
      html,
    }),
    EMAIL_TIMEOUT_MS
  );
};

// ── Delivery verification ─────────────────────────────────────────────────────

/** Turns a Resend error into something an operator can act on. */
export const explainEmailError = (err: unknown): string => {
  const e = err as Partial<ResendError> & { cause?: { code?: string } };
  if (e.code === 'ENOKEY') return 'RESEND_API_KEY is not set in .env.';
  if (e.status === 401 || e.status === 403) {
    return e.code === 'validation_error' || /domain/i.test(e.message ?? '')
      ? `Resend rejected the sender: ${e.message}. EMAIL_FROM must be an address on a domain verified at resend.com/domains.`
      : 'Resend rejected the API key. Create a key at resend.com/api-keys and set RESEND_API_KEY.';
  }
  if (e.status === 422) return `Resend rejected the message: ${e.message}. Check that EMAIL_FROM is on a verified domain.`;
  if (e.status === 429) return 'Resend rate limit hit; try again shortly.';
  if (e.cause?.code || /fetch failed/i.test(e.message ?? '')) return 'Could not reach api.resend.com over HTTPS. Check the VPS network/DNS.';
  return e.message ?? 'Unknown email error';
};

/** Checks the API key without sending anything. Throws on failure. */
export const verifyEmailTransport = async (): Promise<void> => {
  await withTimeout(createTransporter().verify(), EMAIL_TIMEOUT_MS);
};

/** Sends a real message and confirms the server accepted it for the recipient. */
export const sendTestEmail = async (to: string): Promise<string> => {
  const info = await withTimeout(
    createTransporter().sendMail({
      from: `"SIM-Lab Kenya" <${FROM_ADDRESS}>`,
      to,
      subject: 'SIM-Lab Kenya: email delivery test',
      text: `This is a test message from the SIM-Lab Kenya server, sent ${new Date().toISOString()}.\nIf you can read this, admin login codes and order emails will be delivered.`,
    }),
    EMAIL_TIMEOUT_MS
  );
  return info.messageId;
};
