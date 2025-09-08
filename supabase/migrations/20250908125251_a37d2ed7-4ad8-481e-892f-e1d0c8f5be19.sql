-- Create function to allow admins to delete users
CREATE OR REPLACE FUNCTION public.delete_user_admin(user_id_to_delete uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to delete users
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users';
  END IF;
  
  -- Prevent deletion of master user
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = user_id_to_delete 
    AND email = 'grupoconfix@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Cannot delete master user account';
  END IF;
  
  -- Log the deletion for audit purposes
  INSERT INTO public.webhook_logs (
    event_type,
    shipment_id,
    payload,
    response_status,
    response_body
  ) VALUES (
    'user_deletion_audit',
    user_id_to_delete::text,
    jsonb_build_object(
      'deleted_user_id', user_id_to_delete,
      'deleted_by', auth.uid(),
      'timestamp', now()
    ),
    200,
    jsonb_build_object('status', 'user_deleted')
  );
  
  -- Delete the user (this will cascade to profiles and user_roles)
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RAISE NOTICE 'User % deleted by admin %', user_id_to_delete, auth.uid();
END;
$$;