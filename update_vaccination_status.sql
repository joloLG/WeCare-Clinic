-- ============================
-- FUNCTION: Update Vaccination Status
-- ============================

CREATE OR REPLACE FUNCTION public.update_vaccination_status()
RETURNS TRIGGER AS $$
DECLARE
  v_patient_id UUID;
  v_dose_count INTEGER;
  v_status vaccination_status_enum;
  v_has_card BOOLEAN;
BEGIN
  -- Determine the patient_id based on which table was updated
  IF TG_TABLE_NAME = 'patient_vaccination_history' THEN
    v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
  ELSIF TG_TABLE_NAME = 'e_vaccination_card' THEN
    v_patient_id := COALESCE(NEW.patient_id, OLD.patient_id);
  ELSIF TG_TABLE_NAME = 'appointments' AND TG_OP = 'UPDATE' AND NEW.status = 'completed' THEN
    -- Only process if the appointment was just marked as completed
    IF OLD.status != 'completed' THEN
      -- Get the patient_id from the appointment
      v_patient_id := NEW.patient_id;
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  -- Get the count of completed vaccinations for this patient
  SELECT COUNT(*) 
  INTO v_dose_count
  FROM public.patient_vaccination_history
  WHERE patient_id = v_patient_id;

  -- Determine the status based on dose count
  IF v_dose_count = 0 THEN
    v_status := 'No Vaccination';
  ELSIF v_dose_count = 1 THEN
    v_status := '1st Vaccination';
  ELSIF v_dose_count = 2 THEN
    v_status := '2nd Vaccination';
  ELSE
    v_status := 'Fully Vaccinated';
  END IF;

  -- Update the e_vaccination_card status
  UPDATE public.e_vaccination_card
  SET 
    vaccination_status = v_status,
    updated_at = NOW()
  WHERE patient_id = v_patient_id;

  -- If no e_vaccination_card exists, create one
  IF NOT FOUND THEN
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
      vaccination_status,
      created_at,
      updated_at
    )
    SELECT 
      p.id,
      CONCAT(pr.first_name, ' ', COALESCE(pr.middle_name || ' ', ''), pr.last_name),
      EXTRACT(YEAR FROM AGE(NOW(), pr.date_of_birth))::INT,
      pr.sex,
      pr.civil_status,
      pr.phone_number,
      pr.date_of_birth,
      pr.blood_type,
      pr.allergies,
      pr.address,
      v_status,
      NOW(),
      NOW()
    FROM public.patients p
    JOIN public.profiles pr ON p.id = pr.id
    WHERE p.id = v_patient_id;
  END IF;

  -- Update the patient_vaccination_history status for all records of this patient
  UPDATE public.patient_vaccination_history
  SET 
    patient_status = v_status,
    updated_at = NOW()
  WHERE patient_id = v_patient_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the operation
  RAISE WARNING 'Error updating vaccination status: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================
-- TRIGGERS
-- ============================

-- Trigger for patient_vaccination_history
DROP TRIGGER IF EXISTS trg_update_vaccination_status_history ON public.patient_vaccination_history;
CREATE TRIGGER trg_update_vaccination_status_history
AFTER INSERT OR UPDATE OR DELETE ON public.patient_vaccination_history
FOR EACH ROW
EXECUTE FUNCTION public.update_vaccination_status();

-- Trigger for e_vaccination_card
DROP TRIGGER IF EXISTS trg_update_vaccination_status_card ON public.e_vaccination_card;
CREATE TRIGGER trg_update_vaccination_status_card
AFTER UPDATE OF vaccination_status ON public.e_vaccination_card
FOR EACH ROW
WHEN (OLD.vaccination_status IS DISTINCT FROM NEW.vaccination_status)
EXECUTE FUNCTION public.update_vaccination_status();

-- Trigger for appointments (when status changes to completed)
DROP TRIGGER IF EXISTS trg_update_vaccination_status_appointment ON public.appointments;
CREATE TRIGGER trg_update_vaccination_status_appointment
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed')
EXECUTE FUNCTION public.update_vaccination_status();

-- ============================
-- VIEW: e_vaccination_card_view
-- ============================

CREATE OR REPLACE VIEW public.e_vaccination_card_view AS
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
      ) ORDER BY pvh.date_administered DESC
    )
    FROM patient_vaccination_history pvh
    JOIN vaccines v ON pvh.vaccine_id = v.id
    LEFT JOIN auth.users ua ON pvh.administered_by_profile_id = ua.id
    WHERE pvh.patient_id = p.id
  ) AS vaccination_history,
  evc.created_at,
  evc.updated_at
FROM patients p
JOIN profiles pr ON p.id = pr.id
LEFT JOIN e_vaccination_card evc ON p.id = evc.patient_id
LIMIT 100;
