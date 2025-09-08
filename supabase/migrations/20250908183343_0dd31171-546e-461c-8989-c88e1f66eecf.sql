-- Reset Hugo's password to a known password
UPDATE public.motoristas 
SET senha = crypt('hugo123', gen_salt('bf', 8))
WHERE email = 'hugomarianolog@gmail.com';

-- Verify the update
SELECT nome, email, status FROM public.motoristas WHERE email = 'hugomarianolog@gmail.com';