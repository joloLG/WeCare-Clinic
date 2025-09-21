// src/hooks/useAppointments.ts
import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { sendNotification } from '@/app/actions/notifications';

interface AppointmentData {
  patient_id: string;
  vaccine_id?: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  reason?: string;
  notes?: string;
  address_of_bite?: string;
  date_bites?: string | null;
  time_of_bite?: string | null;
  animal_type?: string;
  animal_ownership?: string;
  animal_status?: string;
  animal_vaccinated?: string;
  vaccinated_by?: string;
  wound_management?: string;
  allergies?: string;
}

export function useAppointments() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();

  const bookAppointment = async (appointmentData: AppointmentData) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...appointmentData,
          created_by: user.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to book appointment');
      }

      // Send confirmation notification to the patient
      if (result.data) {
        await sendNotification(
          appointmentData.patient_id,
          'appointment',
          'Appointment Confirmed',
          `Your appointment has been scheduled for ${new Date(appointmentData.appointment_date).toLocaleDateString()} at ${appointmentData.start_time}.`,
          {
            appointment_id: result.data.id,
            appointment_date: appointmentData.appointment_date,
            start_time: appointmentData.start_time,
            end_time: appointmentData.end_time
          }
        );
      }

      return result.data;
    } catch (err) {
      console.error('Error in bookAppointment:', err);
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getAppointments = async (filters = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams(filters as Record<string, string>);
      const response = await fetch(`/api/appointments?${queryParams}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch appointments');
      }

      return result.data;
    } catch (err) {
      console.error('Error fetching appointments:', err);
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: string, notes?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          status,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error updating appointment status:', err);
      const error = err instanceof Error ? err : new Error('An unknown error occurred');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    bookAppointment,
    getAppointments,
    updateAppointmentStatus,
    loading,
    error,
  };
}