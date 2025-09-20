import { UserLayout } from '@/components/user/UserLayout';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { Calendar, Syringe, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format } from 'date-fns';

interface VaccinationRecord {
  id: string;
  patient_id: string;
  vaccine_id: string;
  dose_number: number;
  date_administered: string;
  next_due_date: string | null;
  created_at: string;
  updated_at: string;
  vaccines?: {
    name: string;
  };
}

export default async function AppointmentHistoryPage() {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return redirect('/auth/login');
  }

  // Fetch user's appointments with vaccine details
  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      *,
      vaccines (
        name
      )
    `)
    .eq('patient_id', session.user.id)
    .order('appointment_date', { ascending: false });

  // Fetch user's vaccination history with vaccine details
  const { data: vaccinations } = await supabase
    .from('patient_vaccination_history')
    .select(`
      *,
      vaccines (
        name
      )
    `)
    .eq('patient_id', session.user.id)
    .order('date_administered', { ascending: false });

  // Process appointments data with proper typing
  type AppointmentWithVaccine = {
    id: string;
    patient_id: string;
    vaccine_id: string | null;
    appointment_date: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes: string | null;
    created_at: string;
    updated_at: string;
    vaccines?: { name: string };
    vaccine_name: string;
    date_bites: string;
  };

  type AppointmentData = {
    id: string;
    patient_id: string;
    vaccine_id: string | null;
    appointment_date: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    notes: string | null;
    created_at: string;
    updated_at: string;
    vaccines?: { name: string };
  };

  const typedAppointments = (appointments as AppointmentData[] || []).map((appt): AppointmentWithVaccine => ({
    ...appt,
    vaccine_name: appt.vaccines?.name || 'Unknown Vaccine',
    date_bites: appt.appointment_date
  }));

  // Process vaccinations data with proper typing
  type VaccinationWithVaccine = VaccinationRecord & {
    vaccines?: { name: string };
    vaccine_name: string;
  };

  type VaccinationData = {
    id: string;
    patient_id: string;
    vaccine_id: string;
    dose_number: number;
    date_administered: string;
    next_due_date: string | null;
    created_at: string;
    updated_at: string;
    vaccines?: { name: string };
  };

  const typedVaccinations = (vaccinations as VaccinationData[] || []).map((vacc): VaccinationWithVaccine => ({
    ...vacc,
    vaccine_name: vacc.vaccines?.name || 'Unknown Vaccine'
  }));

  // Group vaccinations by vaccine name
  const vaccinationsByType = typedVaccinations.reduce<Record<string, VaccinationWithVaccine[]>>((acc, record) => {
    const vaccineName = record.vaccine_name;
    if (!acc[vaccineName]) {
      acc[vaccineName] = [];
    }
    acc[vaccineName].push(record);
    return acc;
  }, {});

  // Calculate vaccination progress
  const vaccinationProgress = Object.entries(vaccinationsByType).map(([vaccine, records]) => {
    const latestDose = Math.max(...records.map(r => r.dose_number));
    const nextDose = latestDose + 1;
    const lastAdministered = new Date(Math.max(...records.map(r => new Date(r.date_administered).getTime())));
    
    return {
      vaccine,
      doses: records.length,
      latestDose,
      nextDose,
      lastAdministered,
      nextDue: records[0]?.next_due_date ? new Date(records[0].next_due_date) : null
    };
  });

  const getStatusBadge = (status: string | undefined) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" /> Completed
        </span>;
      case 'cancelled':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" /> Cancelled
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Clock className="h-3 w-3 mr-1" /> Scheduled
        </span>;
    }
  };

  return (
    <UserLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Vaccination Progress Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Syringe className="h-5 w-5 text-red-600 mr-2" />
              Vaccination Progress
            </h2>
          </div>
          
          <div className="px-6 py-4">
            {vaccinationProgress.length > 0 ? (
              <div className="space-y-6">
                {vaccinationProgress.map((progress, idx) => (
                  <div key={idx} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">{progress.vaccine}</h3>
                        <p className="text-sm text-gray-500">
                          Completed Doses: {progress.doses}
                          {progress.nextDue && (
                            <span className="ml-4">
                              Next due: {format(progress.nextDue, 'MMM d, yyyy')}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-sm font-medium text-gray-900">
                          Dose {progress.latestDose} of {progress.nextDose}
                        </div>
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                          <div 
                            className="h-full bg-red-600 rounded-full" 
                            style={{ width: `${(progress.latestDose / progress.nextDose) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Syringe className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No vaccination records found</h3>
                <p className="mt-1 text-sm text-gray-500">Your vaccination history will appear here after your first appointment.</p>
              </div>
            )}
          </div>
        </div>

        {/* Appointment History Section */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Calendar className="h-5 w-5 text-red-600 mr-2" />
              Appointment History
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {typedAppointments.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {typedAppointments.map((appointment: AppointmentWithVaccine) => (
                  <li key={appointment.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.vaccine_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {format(new Date(appointment.appointment_date), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        {getStatusBadge(appointment.status)}
                      </div>
                    </div>
                    {appointment.notes && (
                      <div className="mt-2 text-sm text-gray-500">
                        <p className="font-medium">Notes:</p>
                        <p className="text-gray-600">{appointment.notes}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments found</h3>
                <p className="mt-1 text-sm text-gray-500">Your appointment history will appear here after booking.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </UserLayout>
  );
}
