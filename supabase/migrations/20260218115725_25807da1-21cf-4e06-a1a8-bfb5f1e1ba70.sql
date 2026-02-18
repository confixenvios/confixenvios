
-- Function to auto-create b2b_clients record when a new user is created
CREATE OR REPLACE FUNCTION public.handle_new_b2b_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.b2b_clients (user_id, email, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'Cliente') || ' ' || COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users to auto-create b2b_clients
CREATE TRIGGER on_auth_user_created_b2b
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_b2b_client();
