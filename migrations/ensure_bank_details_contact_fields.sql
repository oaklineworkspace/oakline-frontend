
-- Ensure bank_details table has all necessary contact fields
ALTER TABLE bank_details 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS email_contact VARCHAR(255),
ADD COLUMN IF NOT EXISTS email_info VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS support_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS support_email VARCHAR(255);

-- Add a default bank details record if none exists
INSERT INTO bank_details (
  phone,
  email_contact,
  email_info,
  address,
  support_phone,
  support_email
)
SELECT 
  '+1 (636) 635-6122',
  'support@theoaklinebank.com',
  'contact-us@theoaklinebank.com',
  '12201 N. May Avenue, OKC, OK 73120',
  '+1 (636) 635-6122',
  'security@theoaklinebank.com'
WHERE NOT EXISTS (SELECT 1 FROM bank_details LIMIT 1);
