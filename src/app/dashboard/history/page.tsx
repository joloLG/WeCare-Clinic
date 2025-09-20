import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { CalendarIcon, ClockIcon, CheckCircleIcon, XCircleIcon, PlusIcon } from '@heroicons/react/24/outline';

// Re-export ClockIcon as ClockOutlineIcon for backward compatibility
const ClockOutlineIcon = ClockIcon;
import Link from 'next/link';

interface Appointment {
  id: string;
  date_bites: string;
  time_of_bite: string;
  address_of_bite: string;
  status?: string;
  // Add other appointment properties as needed
}

export default async function AppointmentHistory() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return redirect('/auth/login');
  }

  // Fetch user's appointments with proper typing
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', session.user.id)
    .order('date_bites', { ascending: false });
    
  const typedAppointments = (appointments || []) as Appointment[];

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="h-4 w-4 mr-1" />
            Cancelled
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Confirmed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockOutlineIcon className="h-4 w-4 mr-1" />
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Appointment History
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          View your past and upcoming vaccination appointments.
        </p>
      </div>

      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        {typedAppointments.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {typedAppointments.map((appointment) => {
              const appointmentDate = new Date(appointment.date_bites);
              const isPastAppointment = new Date() > appointmentDate;
              
              return (
                <li key={appointment.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          isPastAppointment ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <CalendarIcon 
                            className={`h-6 w-6 ${isPastAppointment ? 'text-green-600' : 'text-blue-600'}`} 
                            aria-hidden="true" 
                          />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900">
                            {appointmentDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              weekday: 'long'
                            })}
                          </p>
                          <span className="mx-2 text-gray-300">•</span>
                          <div className="flex items-center text-sm text-gray-500">
                            <ClockIcon className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                            {appointment.time_of_bite || 'Time not specified'}
                          </div>
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {appointment.address_of_bite}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      {getStatusBadge(appointment.status || 'pending')}
                      <Link
                        href={`/dashboard/history/${appointment.id}`}
                        className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-900"
                      >
                        View details
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
            <p className="mt-1 text-sm text-gray-500">
              You haven&apos;t booked any appointments yet.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/book"
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <PlusIcon className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                New Appointment
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
