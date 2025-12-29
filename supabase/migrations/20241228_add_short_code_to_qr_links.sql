-- Migration: Add short_code to qr_links for manual patient linking
-- This allows patients to link with doctors by entering a code instead of scanning QR

-- Add short_code column
ALTER TABLE qr_links ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE;

-- Create function to generate random alphanumeric code (excludes confusing chars like 0,O,1,I,L)
CREATE OR REPLACE FUNCTION generate_short_code(length INTEGER DEFAULT 6)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate short_code on insert
CREATE OR REPLACE FUNCTION set_qr_short_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  IF NEW.short_code IS NULL THEN
    LOOP
      new_code := generate_short_code(6);
      SELECT EXISTS(SELECT 1 FROM qr_links WHERE short_code = new_code) INTO code_exists;
      EXIT WHEN NOT code_exists;
    END LOOP;
    NEW.short_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_qr_short_code ON qr_links;
CREATE TRIGGER trigger_set_qr_short_code
  BEFORE INSERT ON qr_links
  FOR EACH ROW
  EXECUTE FUNCTION set_qr_short_code();

-- Update existing QR links with short codes
UPDATE qr_links
SET short_code = generate_short_code(6)
WHERE short_code IS NULL;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_qr_links_short_code ON qr_links(short_code);
