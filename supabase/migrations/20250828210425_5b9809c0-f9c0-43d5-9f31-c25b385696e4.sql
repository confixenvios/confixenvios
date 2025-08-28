-- Create initial admin user (this will be done manually via Supabase Auth)
-- This migration just ensures the admin role exists for the first user that registers

-- Function to promote user to admin (can be called manually)
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find user by email
    SELECT auth.users.id INTO user_record
    FROM auth.users 
    WHERE auth.users.email = user_email;
    
    IF user_record.id IS NOT NULL THEN
        -- Insert admin role if not exists
        INSERT INTO public.user_roles (user_id, role)
        VALUES (user_record.id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'User % promoted to admin successfully', user_email;
    ELSE
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
END;
$$;