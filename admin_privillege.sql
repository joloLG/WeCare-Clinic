-- Step 1: Create a function to safely check for admin privileges.
-- The `SECURITY DEFINER` option makes the function execute with the privileges
-- of the user who created it, bypassing RLS for the query inside the function.
-- This prevents the infinite recursion error.
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  -- This query can now read from public.profiles without re-triggering the policy.
  SELECT is_admin
  INTO is_admin_user
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop all the old, recursive admin policies.
-- Using "IF EXISTS" prevents errors if a policy has already been changed or removed.
DROP POLICY IF EXISTS "Admins can manage all profiles." ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all patient data." ON public.patients;
DROP POLICY IF EXISTS "Admins can manage all vaccination cards." ON public.e_vaccination_card;
DROP POLICY IF EXISTS "Admins can manage vaccine inventory." ON public.vaccines;
DROP POLICY IF EXISTS "Admins can manage all appointments." ON public.appointments;
DROP POLICY IF EXISTS "Admins can send notifications to patients." ON public.patient_notifications;
DROP POLICY IF EXISTS "Admins can manage all patient notifications." ON public.patient_notifications;
DROP POLICY IF EXISTS "Admins can manage all vaccination history." ON public.patient_vaccination_history;

-- Step 3: Recreate the admin policies using the new, non-recursive function.

-- Policy for "profiles"
CREATE POLICY "Admins can manage all profiles." ON public.profiles
  FOR ALL USING (public.is_admin(auth.uid()));

-- Policy for "patients"
CREATE POLICY "Admins can manage all patient data." ON public.patients
  FOR ALL USING (public.is_admin(auth.uid()));

-- Policy for "e_vaccination_card"
CREATE POLICY "Admins can manage all vaccination cards." ON public.e_vaccination_card
  FOR ALL USING (public.is_admin(auth.uid()));

-- Policy for "vaccines"
CREATE POLICY "Admins can manage vaccine inventory." ON public.vaccines
  FOR ALL USING (public.is_admin(auth.uid()));

-- Policy for "appointments"
CREATE POLICY "Admins can manage all appointments." ON public.appointments
  FOR ALL USING (public.is_admin(auth.uid()));

-- Policy for "patient_notifications" (consolidated for simplicity)
CREATE POLICY "Admins can manage all patient notifications." ON public.patient_notifications
  FOR ALL USING (public.is_admin(auth.uid()));

-- Policy for "patient_vaccination_history"
CREATE POLICY "Admins can manage all vaccination history." ON public.patient_vaccination_history
  FOR ALL USING (public.is_admin(auth.uid()));
