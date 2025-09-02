-- Security Fix: Implement secure session management for addresses table

-- 1. Create sessions table for server-side session tracking
CREATE TABLE IF NOT EXISTS public.anonymous_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  session_hash TEXT NOT NULL,
  client_fingerprint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  last_accessed TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sessions table
ALTER TABLE public.anonymous_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Create secure session validation function
CREATE OR REPLACE FUNCTION public.validate_anonymous_session(session_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  session_record RECORD;
  session_id UUID;
BEGIN
  -- Clean up expired sessions first
  DELETE FROM public.anonymous_sessions 
  WHERE expires_at < now();
  
  -- Find valid session
  SELECT id, session_hash, expires_at, client_fingerprint 
  INTO session_record
  FROM public.anonymous_sessions 
  WHERE session_token = validate_anonymous_session.session_token
    AND expires_at > now();
  
  -- If session not found, return null
  IF session_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Validate session hash (prevents token manipulation)
  IF session_record.session_hash != encode(digest(session_token || session_record.client_fingerprint || session_record.id::text, 'sha256'), 'hex') THEN
    -- Invalid session hash, delete the session
    DELETE FROM public.anonymous_sessions WHERE id = session_record.id;
    RETURN NULL;
  END IF;
  
  -- Update last accessed time
  UPDATE public.anonymous_sessions 
  SET last_accessed = now()
  WHERE id = session_record.id;
  
  RETURN session_record.id;
END;
$$;

-- 3. Create function to create secure sessions
CREATE OR REPLACE FUNCTION public.create_anonymous_session(client_fingerprint TEXT DEFAULT '')
RETURNS TABLE(session_id UUID, session_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_session_id UUID;
  new_session_token TEXT;
  session_hash TEXT;
BEGIN
  -- Generate secure session ID and token
  new_session_id := gen_random_uuid();
  new_session_token := encode(gen_random_bytes(32), 'hex');
  
  -- Create session hash for validation
  session_hash := encode(digest(new_session_token || client_fingerprint || new_session_id::text, 'sha256'), 'hex');
  
  -- Insert session record
  INSERT INTO public.anonymous_sessions (
    id, 
    session_token, 
    session_hash, 
    client_fingerprint,
    expires_at
  ) VALUES (
    new_session_id,
    new_session_token,
    session_hash,
    client_fingerprint,
    now() + interval '24 hours'
  );
  
  RETURN QUERY SELECT new_session_id, new_session_token;
END;
$$;

-- 4. Function to get current session ID from request
CREATE OR REPLACE FUNCTION public.get_current_session_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  session_token TEXT;
  session_id UUID;
BEGIN
  -- Get session token from headers
  session_token := current_setting('request.headers', true)::jsonb->>'x-session-token';
  
  IF session_token IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Validate session and return ID
  SELECT public.validate_anonymous_session(session_token) INTO session_id;
  
  RETURN session_id;
END;
$$;

-- 5. Update RLS policies for addresses table to use secure session validation
DROP POLICY IF EXISTS "Anonymous users can create addresses with session" ON public.addresses;
DROP POLICY IF EXISTS "Anonymous users can view own session addresses" ON public.addresses;
DROP POLICY IF EXISTS "Anonymous users can update own session addresses" ON public.addresses;

-- Create new secure RLS policies
CREATE POLICY "Anonymous users can create addresses with valid session"
ON public.addresses
FOR INSERT
WITH CHECK (
  (user_id IS NULL) 
  AND (session_id IS NOT NULL)
  AND (session_id::text = public.get_current_session_id()::text)
);

CREATE POLICY "Anonymous users can view own validated session addresses"
ON public.addresses
FOR SELECT
USING (
  (user_id IS NULL) 
  AND (session_id IS NOT NULL)
  AND (session_id::text = public.get_current_session_id()::text)
);

CREATE POLICY "Anonymous users can update own validated session addresses"
ON public.addresses
FOR UPDATE
USING (
  (user_id IS NULL) 
  AND (session_id IS NOT NULL)
  AND (session_id::text = public.get_current_session_id()::text)
)
WITH CHECK (
  (user_id IS NULL) 
  AND (session_id IS NOT NULL)
  AND (session_id::text = public.get_current_session_id()::text)
);

-- 6. Create RLS policies for sessions table
CREATE POLICY "Sessions are private"
ON public.anonymous_sessions
FOR ALL
USING (false);

-- 7. Create cleanup function for old sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete expired sessions
  DELETE FROM public.anonymous_sessions 
  WHERE expires_at < now();
  
  -- Delete sessions older than 7 days (even if not technically expired)
  DELETE FROM public.anonymous_sessions 
  WHERE created_at < (now() - interval '7 days');
  
  -- Also cleanup orphaned addresses from expired sessions
  DELETE FROM public.addresses 
  WHERE user_id IS NULL 
    AND session_id IS NOT NULL
    AND session_id::text NOT IN (
      SELECT id::text FROM public.anonymous_sessions
    );
    
  RAISE NOTICE 'Cleaned up expired sessions and orphaned addresses';
END;
$$;