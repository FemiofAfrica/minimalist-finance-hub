-- Create biometric_credentials table for cross-device WebAuthn credential storage
-- Migration: 20250119000001_create_biometric_credentials_table.sql

-- Create the biometric_credentials table
CREATE TABLE IF NOT EXISTS public.biometric_credentials (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,  -- WebAuthn credential ID (base64url encoded)
  public_key TEXT NOT NULL,            -- Base64-encoded public key from WebAuthn
  name TEXT NOT NULL,                  -- User-friendly device name ("My iPhone", "Work Laptop")
  device_info JSONB DEFAULT '{}',      -- Device details: userAgent, platform, deviceType
  attestation_type TEXT DEFAULT 'none', -- WebAuthn attestation type: 'direct', 'indirect', 'none'
  aaguid TEXT DEFAULT '00000000-0000-0000-0000-000000000000', -- Authenticator AAGUID
  transports TEXT[] DEFAULT '{}',       -- WebAuthn transports: ['internal', 'hybrid', 'usb', 'nfc', 'ble']
  encrypted_credentials JSONB,         -- Encrypted password data for passwordless login
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  
  -- Constraints
  CONSTRAINT unique_user_credential UNIQUE(user_id, credential_id),
  CONSTRAINT valid_attestation_type CHECK (attestation_type IN ('direct', 'indirect', 'none')),
  CONSTRAINT non_empty_name CHECK (LENGTH(TRIM(name)) > 0),
  CONSTRAINT non_empty_credential_id CHECK (LENGTH(TRIM(credential_id)) > 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user_id ON public.biometric_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_active ON public.biometric_credentials(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_credential_id ON public.biometric_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_last_used ON public.biometric_credentials(user_id, last_used_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.biometric_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own biometric credentials
CREATE POLICY "Users can view own biometric credentials" ON public.biometric_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own biometric credentials" ON public.biometric_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own biometric credentials" ON public.biometric_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own biometric credentials" ON public.biometric_credentials
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_biometric_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER update_biometric_credentials_updated_at
  BEFORE UPDATE ON public.biometric_credentials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_biometric_credentials_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.biometric_credentials TO authenticated;
GRANT USAGE ON SEQUENCE public.biometric_credentials_id_seq TO authenticated;

-- Add helpful comments
COMMENT ON TABLE public.biometric_credentials IS 'Stores WebAuthn biometric credentials for cross-device authentication';
COMMENT ON COLUMN public.biometric_credentials.credential_id IS 'WebAuthn credential ID (base64url encoded, globally unique)';
COMMENT ON COLUMN public.biometric_credentials.public_key IS 'WebAuthn public key (base64 encoded)';
COMMENT ON COLUMN public.biometric_credentials.device_info IS 'JSON object containing device details like userAgent, platform, deviceType';
COMMENT ON COLUMN public.biometric_credentials.transports IS 'Array of WebAuthn transport methods supported by this credential';
COMMENT ON COLUMN public.biometric_credentials.encrypted_credentials IS 'Encrypted password data for passwordless login (optional)'; 