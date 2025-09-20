import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CalendarIcon, PlusIcon } from '@heroicons/react/24/outline';
import { UserLayout } from '@/components/user/UserLayout';

type Appointment = {
  id: string;
  patient_id: string;
  date_bites: string;
  time_of_bite: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  created_at: string;
};

export default async function UserDashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return redirect('/auth/login');
  }

  // Fetch user's upcoming appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('patient_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(3);

  return (
    <UserLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-2xl font-bold text-red-700">Welcome back, {session.user.user_metadata?.first_name || 'User'}!</h2>
          <Link
            href="/dashboard/user/book"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-red-600 text-white font-semibold shadow hover:bg-red-700 transition-colors text-sm sm:text-base"
          >
            <PlusIcon className="h-5 w-5" />
            Book Appointment
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Upcoming Appointments */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-red-50 border-b border-red-200">
                <h3 className="text-lg font-medium leading-6 text-red-700">Upcoming Appointments</h3>
              </div>
              <div className="border-t border-gray-200">
                {appointments && appointments.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {appointments.map((appointment: Appointment) => (
                      <li key={appointment.id} className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                <CalendarIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(appointment.date_bites).toLocaleDateString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                {appointment.time_of_bite || 'Time not specified'}
                              </p>
                            </div>
                          </div>
                          <div className="ml-2 flex flex-shrink-0">
                            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                              {appointment.status || 'Pending'}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-12 text-center">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Get started by booking a new appointment.
                    </p>
                    {/* Removed + New Appointment button as this card is now notification-only */}
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Quick Actions */}
          <div>
            <div className="overflow-hidden bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 bg-red-50 border-b border-red-200">
                <h3 className="text-lg font-medium leading-6 text-red-700">Quick Actions</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                  <Link
                    href="/dashboard/book"
                    className="relative flex items-center space-x-3 rounded-lg border border-blue-200 bg-blue-50 px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 hover:border-blue-400"
                  >
                    <div className="flex-shrink-0 rounded-lg bg-blue-100 p-2">
                      <CalendarIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="absolute inset-0" aria-hidden="true" />
                      <p className="text-sm font-medium text-gray-900">Book Appointment</p>
                      <p className="truncate text-sm text-gray-500">Schedule a new vaccination</p>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/vaccination"
                    className="relative flex items-center space-x-3 rounded-lg border border-green-200 bg-green-50 px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-green-500 focus-within:ring-offset-2 hover:border-green-400"
                  >
                    <div className="flex-shrink-0 rounded-lg bg-green-100 p-2">
                      <svg
                        className="h-6 w-6 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="absolute inset-0" aria-hidden="true" />
                      <p className="text-sm font-medium text-gray-900">E-Vaccination Card</p>
                      <p className="truncate text-sm text-gray-500">View and download your card</p>
                    </div>
                  </Link>
                  <Link
                    href="/dashboard/messages"
                    className="relative flex items-center space-x-3 rounded-lg border border-red-200 bg-red-50 px-6 py-5 shadow-sm focus-within:ring-2 focus-within:ring-red-500 focus-within:ring-offset-2 hover:border-red-400"
                  >
                    <div className="flex-shrink-0 rounded-lg bg-red-100 p-2">
                      <svg
                        className="h-6 w-6 text-red-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="absolute inset-0" aria-hidden="true" />
                      <p className="text-sm font-medium text-gray-900">Messages</p>
                      <p className="truncate text-sm text-gray-500">Contact support</p>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UserLayout>
  );
}