-- ============================
-- ADMIN PRIVILEGES (existing from admin_privilege.sql)
-- ============================

-- Function to safely check for admin privileges
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_user BOOLEAN;
BEGIN
  SELECT is_admin
  INTO is_admin_user
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN COALESCE(is_admin_user, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================
-- DROP EXISTING POLICIES
-- ============================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all patient data" ON public.patients;
DROP POLICY IF EXISTS "Admins can manage all vaccination cards" ON public.e_vaccination_card;
DROP POLICY IF EXISTS "Admins can manage vaccine inventory" ON public.vaccines;
DROP POLICY IF EXISTS "Admins can manage all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage all patient notifications" ON public.patient_notifications;
DROP POLICY IF EXISTS "Admins can manage all vaccination history" ON public.patient_vaccination_history;

-- Drop user policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own patient data" ON public.patients;
DROP POLICY IF EXISTS "Users can view their own vaccination card" ON public.e_vaccination_card;
DROP POLICY IF EXISTS "Authenticated users can view vaccines" ON public.vaccines;
DROP POLICY IF EXISTS "Users can manage their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.patient_notifications;

-- ============================
-- ENABLE ROW LEVEL SECURITY
-- ============================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_vaccination_card ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_vaccination_history ENABLE ROW LEVEL SECURITY;

-- ============================
-- ADMIN POLICIES
-- ============================

-- Admin policy for profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Admin policy for patients
CREATE POLICY "Admins can manage all patient data" 
ON public.patients
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Admin policy for vaccination cards
CREATE POLICY "Admins can manage all vaccination cards" 
ON public.e_vaccination_card
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Admin policy for vaccines
CREATE POLICY "Admins can manage vaccine inventory" 
ON public.vaccines
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Admin policy for appointments
CREATE POLICY "Admins can manage all appointments" 
ON public.appointments
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Admin policy for patient notifications
CREATE POLICY "Admins can manage all patient notifications" 
ON public.patient_notifications
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Admin policy for vaccination history
CREATE POLICY "Admins can manage all vaccination history" 
ON public.patient_vaccination_history
FOR ALL 
USING (public.is_admin(auth.uid()));

-- ============================
-- USER POLICIES
-- ============================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

-- Users can view their own patient data
CREATE POLICY "Users can view their own patient data"
ON public.patients
FOR SELECT
USING (id = auth.uid());

-- Users can view their own vaccination card
CREATE POLICY "Users can view their own vaccination card"
ON public.e_vaccination_card
FOR SELECT
USING (patient_id = auth.uid());

-- All authenticated users can view vaccines (read-only)
CREATE POLICY "Authenticated users can view vaccines"
ON public.vaccines
FOR SELECT
USING (auth.role() = 'authenticated');

-- Users can manage their own appointments
CREATE POLICY "Users can manage their own appointments"
ON public.appointments
FOR ALL
USING (patient_id = auth.uid());

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.patient_notifications
FOR SELECT
USING (patient_id = auth.uid());

-- ============================
-- GRANT PERMISSIONS
-- ============================

-- Grant necessary permissions to the authenticated role
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.patients TO authenticated;
GRANT SELECT ON public.e_vaccination_card TO authenticated;
GRANT SELECT ON public.vaccines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT SELECT ON public.patient_notifications TO authenticated;

-- Grant all permissions to service_role (for server-side operations)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;
-- Notifications table permissions
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;

-- Allow all authenticated users to view admin profiles
CREATE POLICY "Users can view admin profiles" 
ON public.profiles
FOR SELECT
USING (is_admin = true);

-- Allow users to create notifications for admins
CREATE POLICY "Users can create notifications for admins" 
ON public.notifications
FOR INSERT
WITH CHECK (
  -- Allow if the user is the one being notified (existing policy)
  auth.uid() = user_id
  OR
  -- OR if the notification is for an admin
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND is_admin = true
  )
);

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER;