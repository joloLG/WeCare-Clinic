-- ============================
-- ENUMS
-- ============================

-- Roles: 'provider' role removed
CREATE TYPE user_role_enum AS ENUM ('admin', 'patient');

-- Appointment status values
CREATE TYPE appointment_status_enum AS ENUM (
  'scheduled',
  'settled',
  'completed',
  'cancelled',
  'no_show',
  'pending'
);

-- Vaccination status for e-vaccination card
CREATE TYPE vaccination_status_enum AS ENUM (
  '1st Vaccination',
  '2nd Vaccination',
  'Fully Vaccinated',
  'No Vaccination'
);

-- ============================
-- FUNCTIONS & TRIGGERS
-- ============================

-- Function to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- This function updates the status based on stocks_left
CREATE OR REPLACE FUNCTION update_vaccine_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stocks_left <= 0 THEN
    NEW.status = 'out_of_stock';
  ELSIF NEW.stocks_left <= 10 THEN
    NEW.status = 'low_stock';
  ELSE
    NEW.status = 'in_stock';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create an e_vaccination_card
CREATE OR REPLACE FUNCTION create_evaccination_card_for_new_patient()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.e_vaccination_card (
    patient_id,
    full_name,
    age,
    sex,
    civil_status,
    mobile_number,
    birthday,
    blood_type,
    allergies,
    address,
    vaccination_status
  )
  SELECT
    NEW.id,
    COALESCE(p.first_name, '') || ' ' || COALESCE(p.middle_name, '') || ' ' || COALESCE(p.last_name, ''),
    EXTRACT(YEAR FROM AGE(p.date_of_birth)),
    p.sex, -- Correctly pulling from profiles
    p.civil_status, -- Correctly pulling from profiles
    p.phone_number,
    p.date_of_birth,
    pat.blood_type,
    NULL, -- Allergies will be updated via an appointment later
    p.address,
    pat.status
  FROM public.profiles AS p
  JOIN public.patients AS pat ON p.id = pat.id
  WHERE p.id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================
-- PROFILES & PATIENTS
-- ============================

-- User profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role_enum NOT NULL DEFAULT 'patient',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT, -- added to support full name for e-vaccination card
  email TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  date_of_birth DATE,
  address TEXT,
  civil_status TEXT, -- added for e-vaccination card
  sex TEXT, -- added for e-vaccination card
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles (is_admin);

DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Patients table (admin-managed with vaccination status)
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  blood_type TEXT,
  status vaccination_status_enum NOT NULL DEFAULT 'No Vaccination', -- New status column
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_patients_set_updated_at ON public.patients;
CREATE TRIGGER trg_patients_set_updated_at
BEFORE UPDATE ON public.patients
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Trigger to create e-vaccination card on new patient creation
DROP TRIGGER IF EXISTS trg_create_evaccination_card ON public.patients;
CREATE TRIGGER trg_create_evaccination_card
AFTER INSERT ON public.patients
FOR EACH ROW
EXECUTE FUNCTION create_evaccination_card_for_new_patient();

-- ============================
-- VACCINES (INVENTORY)
-- ============================

CREATE TABLE IF NOT EXISTS public.vaccines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  stocks_left INTEGER NOT NULL DEFAULT 0 CHECK (stocks_left >= 0),
  status TEXT, -- 'in_stock' | 'low_stock' | 'out_of_stock'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vaccines_name ON public.vaccines (name);
CREATE INDEX IF NOT EXISTS idx_vaccines_is_active ON public.vaccines (is_active);

DROP TRIGGER IF EXISTS trg_vaccines_set_updated_at ON public.vaccines;
CREATE TRIGGER trg_vaccines_set_updated_at
BEFORE UPDATE ON public.vaccines
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_update_vaccine_status ON public.vaccines;
CREATE TRIGGER trg_update_vaccine_status
BEFORE INSERT OR UPDATE ON public.vaccines
FOR EACH ROW
EXECUTE FUNCTION update_vaccine_status();

-- ============================
-- E-VACCINATION CARD
-- ============================

CREATE TABLE IF NOT EXISTS public.e_vaccination_card (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age INTEGER,
  sex TEXT,
  civil_status TEXT,
  mobile_number TEXT,
  birthday DATE,
  blood_type TEXT,
  allergies TEXT,
  address TEXT,
  vaccination_status vaccination_status_enum NOT NULL DEFAULT 'No Vaccination',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evc_patient_id ON public.e_vaccination_card (patient_id);

DROP TRIGGER IF EXISTS trg_evc_set_updated_at ON public.e_vaccination_card;
CREATE TRIGGER trg_evc_set_updated_at
BEFORE UPDATE ON public.e_vaccination_card
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================
-- APPOINTMENTS
-- ============================

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vaccine_id UUID REFERENCES public.vaccines(id) ON DELETE SET NULL,

  appointment_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,

  status appointment_status_enum NOT NULL DEFAULT 'scheduled',
  reason TEXT,
  notes TEXT,

  address_of_bite TEXT,
  date_bites DATE,
  time_of_bite TIME,
  animal_type TEXT,
  animal_ownership TEXT,
  animal_status TEXT,
  animal_vaccinated TEXT,
  vaccinated_by TEXT,
  wound_management TEXT,
  allergies TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appts_patient_id ON public.appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appts_date ON public.appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_appts_status ON public.appointments (status);

DROP TRIGGER IF EXISTS trg_appointments_set_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_set_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================
-- NOTIFICATIONS & MESSAGES
-- ============================

CREATE TABLE IF NOT EXISTS public.patient_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_notifications_patient_id ON public.patient_notifications (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_notifications_read ON public.patient_notifications (is_read);

CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id ON public.admin_notifications (admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications (is_read);

CREATE TABLE IF NOT EXISTS public.user_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_messages_sender ON public.user_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_user_messages_receiver ON public.user_messages (receiver_id);

CREATE TABLE IF NOT EXISTS public.admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_messages_sender ON public.admin_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_admin_messages_receiver ON public.admin_messages (receiver_id);

-- ============================
-- PATIENT VACCINATION HISTORY
-- ============================

CREATE TABLE IF NOT EXISTS public.patient_vaccination_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  vaccine_id UUID NOT NULL REFERENCES public.vaccines(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  dose_number INTEGER,
  date_administered DATE NOT NULL DEFAULT CURRENT_DATE,
  next_vaccination_date DATE,
  administered_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pvh_patient_id ON public.patient_vaccination_history (patient_id);
CREATE INDEX IF NOT EXISTS idx_pvh_date_administered ON public.patient_vaccination_history (date_administered);

DROP TRIGGER IF EXISTS trg_pvh_set_updated_at ON public.patient_vaccination_history;
CREATE TRIGGER trg_pvh_set_updated_at
BEFORE UPDATE ON public.patient_vaccination_history
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.e_vaccination_card ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_vaccination_history ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
-- Patients can view their own profile, Admins can view all
CREATE POLICY "Patients can view their own profile." ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles." ON public.profiles FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Policies for patients
-- Only admins can manage this table
CREATE POLICY "Admins can manage all patient data." ON public.patients FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
-- Patients cannot see this table as it's for admin management

-- Policies for e_vaccination_card
-- Patients can read their own card, Admins can manage all
CREATE POLICY "Patients can view their own vaccination card." ON public.e_vaccination_card FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Admins can manage all vaccination cards." ON public.e_vaccination_card FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Policies for vaccines
-- Everyone can read, only Admins can manage inventory
CREATE POLICY "Everyone can view vaccine inventory." ON public.vaccines FOR SELECT USING (TRUE);
CREATE POLICY "Admins can manage vaccine inventory." ON public.vaccines FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Policies for appointments
-- Patients can view and create their own appointments
-- Admins can view, update, and delete all appointments
CREATE POLICY "Patients can view their own appointments." ON public.appointments FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Patients can create appointments." ON public.appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Admins can manage all appointments." ON public.appointments FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Policies for patient_notifications
-- Patients can read their own notifications
-- Admins can create notifications for patients
CREATE POLICY "Patients can view their own notifications." ON public.patient_notifications FOR SELECT USING (auth.uid() = patient_id);
CREATE POLICY "Admins can send notifications to patients." ON public.patient_notifications FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
CREATE POLICY "Admins can manage all patient notifications." ON public.patient_notifications FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Policies for admin_notifications
-- Only admins can manage this table
CREATE POLICY "Admins can manage their own notifications." ON public.admin_notifications FOR ALL USING (auth.uid() = admin_id);
-- No policy for patients means they cannot access this table

-- Policies for user_messages
-- Users and admins can view their messages
CREATE POLICY "Users can view their messages" ON public.user_messages 
  FOR SELECT 
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users and admins can send messages
CREATE POLICY "Users can send messages" ON public.user_messages 
  FOR INSERT 
  WITH CHECK (auth.uid() = sender_id);

-- Drop the view if it exists
DROP VIEW IF EXISTS public.e_vaccination_card_view;

-- Create view for e-vaccination card
CREATE VIEW public.e_vaccination_card_view AS
SELECT 
  p.id AS patient_id,
  pr.first_name,
  pr.middle_name,
  pr.last_name,
  pr.date_of_birth,
  pr.sex,
  pr.blood_type,
  pr.avatar_url,
  evc.vaccination_status,
  (
    SELECT json_agg(
      json_build_object(
        'avatar_url', pr.avatar_url,
        'vaccine_name', v.name,
        'dose_number', pvh.dose_number,
        'date_administered', pvh.date_administered,
        'administered_by', ua.raw_user_meta_data->>'name',
        'next_vaccination_date', pvh.next_vaccination_date
      )
    )
    FROM patient_vaccination_history pvh
    JOIN vaccines v ON pvh.vaccine_id = v.id
    LEFT JOIN auth.users ua ON pvh.administered_by_profile_id = ua.id
    WHERE pvh.patient_id = p.id
    GROUP BY pvh.date_administered, v.name, pvh.dose_number, ua.raw_user_meta_data, pvh.next_vaccination_date
    ORDER BY pvh.date_administered DESC
  ) AS vaccination_history,
  evc.created_at,
  evc.updated_at
FROM patients p
JOIN profiles pr ON p.id = pr.id
LEFT JOIN e_vaccination_card evc ON p.id = evc.patient_id;

-- Grant access to the view
GRANT SELECT ON public.e_vaccination_card_view TO authenticated;

-- Users and admins can update read status of their received messages
CREATE POLICY "Users can update message read status" ON public.user_messages
  FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Policies for admin_messages
-- Admins can manage messages sent to them or by them
CREATE POLICY "Admins can manage admin messages." ON public.admin_messages FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
-- No policy for patients means they cannot access this table

-- Policies for patient_vaccination_history
-- Patients can view their own history
-- Admins can manage all history
CREATE POLICY "Patients can view their own vaccination history." ON public.patient_vaccination_history FOR SELECT USING (auth.uid() = (SELECT id FROM public.patients WHERE id = patient_id));
CREATE POLICY "Admins can manage all vaccination history." ON public.patient_vaccination_history FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));



-- Start a transaction to ensure all commands succeed together
BEGIN;

-- Check if the column exists and drop it to ensure a clean state
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS email_confirmed_at;

-- Add the new column with both NOT NULL and a default value
ALTER TABLE public.profiles
ADD COLUMN email_confirmed_at TIMESTAMPTZ;


-- Commit the transaction to save the changes
COMMIT;


ALTER TABLE public.profiles DROP COLUMN IF EXISTS state;
ALTER TABLE public.profiles
ADD COLUMN state TEXT NOT NULL DEFAULT 'Unknown';

-- Remove the existing blood_type column from the profiles table if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS province;

-- Re-add the blood_type column to the profiles table with a NOT NULL constraint
ALTER TABLE public.profiles
ADD COLUMN province TEXT NOT NULL DEFAULT 'Unknown';

-- Remove the existing blood_type column from the profiles table if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS country;

-- Re-add the blood_type column to the profiles table with a NOT NULL constraint
ALTER TABLE public.profiles
ADD COLUMN country TEXT NOT NULL DEFAULT 'Unknown';

-- Remove the existing blood_type column from the profiles table if it exists
ALTER TABLE public.profiles DROP COLUMN IF EXISTS blood_type;

-- Re-add the blood_type column to the profiles table with a NOT NULL constraint
ALTER TABLE public.profiles
ADD COLUMN blood_type TEXT NOT NULL DEFAULT 'Unknown';


-- Allow patients to insert themselves
CREATE POLICY "Patients can insert themselves" ON public.patients
  FOR INSERT WITH CHECK (auth.uid() = id);



-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Create trigger for updated_at
CREATE TRIGGER handle_updated_at_notifications
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL PRIVILEGES ON public.notifications TO service_role;

-- Create RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Policy to allow users to insert their own notifications
CREATE POLICY "Users can create their own notifications" 
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own notifications
CREATE POLICY "Users can update their own notifications" 
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy to allow admins to manage all notifications
CREATE POLICY "Admins can manage all notifications" 
ON public.notifications
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Add created_by column to notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update the policy to allow seeing notifications created by the user
CREATE POLICY "Users can see notifications they created" 
ON public.notifications
FOR SELECT
USING (auth.uid() = created_by);