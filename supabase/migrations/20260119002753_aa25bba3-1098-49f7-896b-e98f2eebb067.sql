-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Re-insert the Jadlog partner with proper hashing (delete old one first if exists)
DELETE FROM public.carrier_partners WHERE email = 'jadlog@gmail.com';

INSERT INTO public.carrier_partners (email, password_hash, company_name, cnpj, contact_name, status)
VALUES (
  'jadlog@gmail.com',
  crypt('123456', gen_salt('bf')),
  'Jadlog Logística',
  '04.884.082/0001-35',
  'Jadlog Partner',
  'active'
);