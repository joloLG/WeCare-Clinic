import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface AppointmentNotification {
  id: string;
  patient_name: string;
  patient_contact_number: string;
  appointment_date: string;
  time_of_bite: string;
  status: string;
  created_at: string;
}

export function AppointmentNotifications() {
  const [appointments, setAppointments] = useState<AppointmentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const fetchAppointments = async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, patient_name, patient_contact_number, appointment_date, time_of_bite, status, created_at')
        .eq('status', 'scheduled')
        .order('created_at', { ascending: false });
      if (!error && data) {
        setAppointments(data);
        setUnreadCount(data.length);
      }
    };
    fetchAppointments();
    const channel = supabase
      .channel('appointments-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  return (
    <div>
      <h4 className="font-semibold mb-2">New Appointments {unreadCount > 0 ? `(${unreadCount})` : ''}</h4>
      {appointments.length === 0 ? (
        <div className="text-sm text-gray-500">No new appointments</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {appointments.map(appt => (
            <li key={appt.id} className="py-2">
              <span className="font-medium">{appt.patient_name}</span> booked for {appt.appointment_date} at {appt.time_of_bite}
              <br />
              <span className="text-xs text-gray-500">{appt.patient_contact_number}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
