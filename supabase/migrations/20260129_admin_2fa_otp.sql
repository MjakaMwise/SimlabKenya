-- Create admin_2fa_otp table for storing OTP codes
CREATE TABLE IF NOT EXISTS admin_2fa_otp (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes',
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_otp_length CHECK (LENGTH(otp_code) = 6)
);

-- Create index for faster lookups
CREATE INDEX idx_admin_2fa_otp_email_created ON admin_2fa_otp(admin_email, created_at DESC);
CREATE INDEX idx_admin_2fa_otp_code ON admin_2fa_otp(otp_code);

-- Enable RLS
ALTER TABLE admin_2fa_otp ENABLE ROW LEVEL SECURITY;

-- Create policy to allow only backend to access OTP table
CREATE POLICY "Backend can manage OTP codes"
  ON admin_2fa_otp
  FOR ALL
  USING (FALSE)
  WITH CHECK (FALSE);
