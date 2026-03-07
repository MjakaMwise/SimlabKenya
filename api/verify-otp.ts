import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VerifyOTPRequest {
  email: string;
  otp: string;
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
    const { email, otp } = req.body as VerifyOTPRequest;

    // Validate inputs
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      return res.status(400).json({ error: 'Invalid OTP format' });
    }

    // Check if email is authorized for admin access
    const ADMIN_EMAILS = ['simlabkenya@gmail.com'];
    if (!ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ error: 'Unauthorized email' });
    }

    // Find the latest valid OTP for this email
    const { data: otpRecord, error: dbError } = await supabase
      .from('admin_2fa_otp')
      .select('*')
      .eq('admin_email', email)
      .eq('otp_code', otp)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError || !otpRecord) {
      return res.status(401).json({ error: 'Invalid or expired OTP' });
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from('admin_2fa_otp')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Error marking OTP as used:', updateError);
      return res.status(500).json({ error: 'Failed to verify OTP' });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({ error: 'Failed to verify OTP' });
  }
}
