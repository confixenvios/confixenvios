-- Disable RLS on b2b_shipments table
ALTER TABLE public.b2b_shipments DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on b2b_shipments
DROP POLICY IF EXISTS "Admins can manage all B2B shipments" ON public.b2b_shipments;
DROP POLICY IF EXISTS "B2B clients can view own shipments" ON public.b2b_shipments;
DROP POLICY IF EXISTS "B2B clients can create shipments" ON public.b2b_shipments;
DROP POLICY IF EXISTS "System can insert B2B shipments" ON public.b2b_shipments;
DROP POLICY IF EXISTS "System can update B2B shipments" ON public.b2b_shipments;
DROP POLICY IF EXISTS "Motoristas can view available B2B shipments" ON public.b2b_shipments;
DROP POLICY IF EXISTS "Motoristas can update B2B shipments" ON public.b2b_shipments;