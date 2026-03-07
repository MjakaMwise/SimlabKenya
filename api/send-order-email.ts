import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
}

interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryMethod: 'pickup' | 'delivery';
  deliveryLocation?: string;
  deliveryAddress?: string;
  items: OrderItem[];
  totalAmount: number;
  additionalNotes?: string;
}

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

// Format phone for WhatsApp (remove spaces, add country code if needed)
const formatPhoneForWhatsApp = (phone: string): string => {
  let cleaned = phone.replace(/[\s-()]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('+')) {
    cleaned = cleaned.startsWith('254') ? '+' + cleaned : '+254' + cleaned;
  }
  return cleaned.replace('+', '');
};

// Get payment info based on delivery method
const getPaymentInfo = (method: string, location?: string): string => {
  if (method === 'pickup') {
    return 'Pay on collection at IOME001 Innovation Hub (Cash or M-Pesa)';
  }
  if (location === 'mombasa') {
    return 'Pay on Delivery (Cash or M-Pesa)';
  }
  return 'Payment required before shipping (M-Pesa or Bank Transfer)';
};

// Generate admin notification email HTML
const generateAdminEmailHtml = (order: OrderEmailData): string => {
  const whatsappNumber = formatPhoneForWhatsApp(order.customerPhone);
  const whatsappMessage = encodeURIComponent(
    `Hello ${order.customerName}, this is SIM-Lab Kenya regarding your order #${order.orderNumber}. We're reaching out to confirm your order details.`
  );
  
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}${item.size ? ` (${item.size})` : ''}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">KES ${item.price.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">KES ${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `
    )
    .join('');

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
      <h1 style="color: #fbbf24; margin: 0; font-size: 24px;">🛒 New Order Received!</h1>
      <p style="color: white; margin: 10px 0 0 0; font-size: 18px;">Order #${order.orderNumber}</p>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <!-- Order Details -->
      <div style="margin-bottom: 25px; padding: 15px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #fbbf24;">
        <p style="margin: 0; color: #92400e; font-weight: 600;">⏰ Action Required: Contact customer within 24 hours</p>
      </div>
      
      <!-- Customer Info -->
      <h2 style="color: #1e3a5f; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">👤 Customer Information</h2>
      <table style="width: 100%; margin-bottom: 25px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 120px;">Name:</td>
          <td style="padding: 8px 0; font-weight: 600;">${order.customerName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Email:</td>
          <td style="padding: 8px 0;"><a href="mailto:${order.customerEmail}" style="color: #2563eb;">${order.customerEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Phone:</td>
          <td style="padding: 8px 0;"><a href="tel:${order.customerPhone}" style="color: #2563eb;">${order.customerPhone}</a></td>
        </tr>
      </table>
      
      <!-- Quick Actions -->
      <div style="margin-bottom: 25px; text-align: center;">
        <a href="https://wa.me/${whatsappNumber}?text=${whatsappMessage}" style="display: inline-block; background: #25D366; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 5px;">💬 WhatsApp</a>
        <a href="tel:${order.customerPhone}" style="display: inline-block; background: #1e3a5f; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 5px;">📞 Call</a>
      </div>
      
      <!-- Delivery Info -->
      <h2 style="color: #1e3a5f; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">🚚 Delivery Details</h2>
      <table style="width: 100%; margin-bottom: 25px;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; width: 120px;">Method:</td>
          <td style="padding: 8px 0; font-weight: 600;">${order.deliveryMethod === 'pickup' ? 'Pickup at IOME001 Hub' : 'Delivery'}</td>
        </tr>
        ${order.deliveryLocation ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Location:</td>
          <td style="padding: 8px 0;">${order.deliveryLocation === 'mombasa' ? 'Within Mombasa' : 'Outside Mombasa'}</td>
        </tr>
        ` : ''}
        ${order.deliveryAddress ? `
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Address:</td>
          <td style="padding: 8px 0;">${order.deliveryAddress}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #6b7280;">Payment:</td>
          <td style="padding: 8px 0; font-weight: 600; color: #059669;">${getPaymentInfo(order.deliveryMethod, order.deliveryLocation)}</td>
        </tr>
      </table>
      
      <!-- Items -->
      <h2 style="color: #1e3a5f; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📦 Items Ordered</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Item</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Qty</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Price</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <!-- Total -->
      <div style="background: #1e3a5f; padding: 20px; border-radius: 8px; text-align: right;">
        <span style="color: white; font-size: 18px;">Total Amount: </span>
        <span style="color: #fbbf24; font-size: 24px; font-weight: bold;">KES ${order.totalAmount.toLocaleString()}</span>
      </div>
      
      ${order.additionalNotes ? `
      <!-- Notes -->
      <div style="margin-top: 25px; padding: 15px; background: #f3f4f6; border-radius: 8px;">
        <h3 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 14px;">📝 Additional Notes from Customer:</h3>
        <p style="margin: 0; color: #4b5563;">${order.additionalNotes}</p>
      </div>
      ` : ''}
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
      <p style="margin: 0;">SIM-Lab Kenya - Science in Motion</p>
      <p style="margin: 5px 0 0 0;">This is an automated notification from your shop system.</p>
    </div>
  </div>
</body>
</html>
  `;
};

// Generate customer confirmation email HTML
const generateCustomerEmailHtml = (order: OrderEmailData): string => {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.name}${item.size ? ` (${item.size})` : ''}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">KES ${(item.price * item.quantity).toLocaleString()}</td>
      </tr>
    `
    )
    .join('');

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
      <div style="width: 60px; height: 60px; background: #22c55e; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 30px;">✓</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 24px;">Order Confirmed!</h1>
      <p style="color: #fbbf24; margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">#${order.orderNumber}</p>
    </div>
    
    <!-- Content -->
    <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <!-- Greeting -->
      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        Hello <strong>${order.customerName}</strong>,
      </p>
      <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">
        Thank you for your order! We've received your request and are excited to get your items ready.
      </p>
      
      <!-- What's Next -->
      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #2563eb;">
        <h2 style="color: #1e3a5f; margin: 0 0 15px 0; font-size: 16px;">📞 What Happens Next?</h2>
        <ol style="margin: 0; padding-left: 20px; color: #374151;">
          <li style="margin-bottom: 8px;">We'll contact you within <strong>24 hours</strong> to confirm your order</li>
          <li style="margin-bottom: 8px;">We'll verify product availability and confirm the final price</li>
          <li style="margin-bottom: 0;">We'll arrange payment and ${order.deliveryMethod === 'pickup' ? 'pickup' : 'delivery'} details</li>
        </ol>
      </div>
      
      <!-- Order Summary -->
      <h2 style="color: #1e3a5f; font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">📦 Order Summary</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Item</th>
            <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Qty</th>
            <th style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <!-- Total -->
      <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #374151;">Subtotal:</td>
            <td style="text-align: right; color: #374151;">KES ${order.totalAmount.toLocaleString()}</td>
          </tr>
          <tr>
            <td style="color: #374151;">Delivery:</td>
            <td style="text-align: right; color: #374151;">TBD</td>
          </tr>
          <tr>
            <td style="padding-top: 10px; border-top: 1px solid #fbbf24; font-weight: bold; color: #1e3a5f;">Total:</td>
            <td style="padding-top: 10px; border-top: 1px solid #fbbf24; text-align: right; font-weight: bold; color: #1e3a5f; font-size: 18px;">KES ${order.totalAmount.toLocaleString()}</td>
          </tr>
        </table>
      </div>
      
      <!-- Delivery & Payment Info -->
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 14px;">🚚 Delivery Method</h3>
        <p style="margin: 0 0 15px 0; color: #374151;">${order.deliveryMethod === 'pickup' ? 'Pickup at IOME001 Innovation Hub' : `Delivery${order.deliveryLocation ? ` (${order.deliveryLocation === 'mombasa' ? 'Within Mombasa' : 'Outside Mombasa'})` : ''}`}</p>
        
        <h3 style="color: #1e3a5f; margin: 0 0 10px 0; font-size: 14px;">💳 Payment</h3>
        <p style="margin: 0; color: #374151;">${getPaymentInfo(order.deliveryMethod, order.deliveryLocation)}</p>
      </div>
      
      <!-- Contact -->
      <div style="text-align: center; padding: 20px; background: #1e3a5f; border-radius: 8px;">
        <h3 style="color: white; margin: 0 0 15px 0;">Need Help?</h3>
        <a href="https://wa.me/254727054994" style="display: inline-block; background: #25D366; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 5px;">WhatsApp</a>
        <a href="tel:+254727054994" style="display: inline-block; background: #fbbf24; color: #1e3a5f; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 5px;">Call Us</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
      <p style="margin: 0; font-weight: 600;">SIM-Lab Kenya</p>
      <p style="margin: 5px 0; font-style: italic;">Science in Motion</p>
      <p style="margin: 10px 0 0 0;">IOME001 Innovation Hub, Mombasa, Kenya</p>
      <p style="margin: 5px 0 0 0;">
        <a href="mailto:simlabkenya@gmail.com" style="color: #2563eb;">simlabkenya@gmail.com</a> | 
        <a href="tel:+254727054994" style="color: #2563eb;">+254 727 054 994</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify environment variables
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('Missing email configuration');
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const orderData: OrderEmailData = req.body;

    // Validate required fields
    if (!orderData.orderNumber || !orderData.customerEmail || !orderData.customerName) {
      return res.status(400).json({ error: 'Missing required order data' });
    }

    const transporter = createTransporter();

    // Send admin notification email
    const adminEmailResult = await transporter.sendMail({
      from: `"SIM-Lab Shop" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER, // Send to admin (same email)
      subject: `🛒 New Order #${orderData.orderNumber} - ${orderData.customerName}`,
      html: generateAdminEmailHtml(orderData),
    });

    console.log('Admin email sent:', adminEmailResult.messageId);

    // Send customer confirmation email
    const customerEmailResult = await transporter.sendMail({
      from: `"SIM-Lab Kenya" <${process.env.GMAIL_USER}>`,
      to: orderData.customerEmail,
      subject: `Order Confirmation - SIM-Lab Kenya #${orderData.orderNumber}`,
      html: generateCustomerEmailHtml(orderData),
    });

    console.log('Customer email sent:', customerEmailResult.messageId);

    return res.status(200).json({
      success: true,
      message: 'Emails sent successfully',
      adminMessageId: adminEmailResult.messageId,
      customerMessageId: customerEmailResult.messageId,
    });
  } catch (error) {
    console.error('Email sending error:', error);
    return res.status(500).json({
      error: 'Failed to send emails',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
