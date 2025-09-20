'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Calendar, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  patient_id: string;
  reason: string;
  appointment_date: string;
  start_time: string;
  patient_name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  stocks_left: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    unreadMessages: 0,
    totalPatients: 0,
  });
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetchData = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          router.push('/auth/login?redirectedFrom=/dashboard/admin');
          return;
        }
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
          
        if (profileError || profile?.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        
        await fetchDashboardData(user.id);
      } catch (err) {
        console.error('Authentication check failed:', err);
        setError('Failed to verify authentication status');
        setLoading(false);
      }
    };
    
    const fetchDashboardData = async (adminId: string) => {
      try {
        setLoading(true);

        const today = new Date().toISOString().split('T')[0];
        
        const [
          appointmentsResponse,
          unreadMessagesResponse,
          patientsResponse,
          inventoryResponse
        ] = await Promise.all([
          supabase
            .from('appointments')
            .select(`
              id,
              patient_id,
              reason,
              appointment_date,
              start_time,
              profiles (
                first_name,
                last_name
              )
            `)
            .eq('appointment_date', today)
            .order('start_time', { ascending: true }),
          supabase
            .from('admin_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', adminId)
            .eq('is_read', false),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
          supabase
            .from('vaccines')
            .select(`id, name, stocks_left`)
            .lte('stocks_left', 10),
        ]);

        const totalPatients = patientsResponse.count || 0;
        const unreadMessages = unreadMessagesResponse.count || 0;

        const appointmentsWithNames = appointmentsResponse.data?.map((app) => {
          const patientProfile = app.profiles as { first_name: string; last_name: string } | null;
          const patientName = patientProfile != null
            ? `${patientProfile.first_name} ${patientProfile.last_name}` : 'Unknown Patient';
          return {
            id: app.id,
            patient_id: app.patient_id,
            reason: app.reason,
            appointment_date: app.appointment_date,
            start_time: app.start_time,
            patient_name: patientName,
          };
        }) || [];

        setStats({
          todayAppointments: appointmentsWithNames.length,
          unreadMessages,
          totalPatients,
        });
        setTodayAppointments(appointmentsWithNames);
        setLowStockItems(inventoryResponse.data || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to fetch dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchData();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-10">
        <div className="text-red-500 text-lg font-medium">{error}</div>
        <Button 
          onClick={() => window.location.reload()} 
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-white text-black">
      <div>
        <h1 className="text-2xl font-bold text-black">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">
          Welcome back! Here&apos;s what&apos;s happening with your clinic today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-white rounded-lg shadow overflow-hidden h-full">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-black">
              Today&apos;s Appointments
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {stats.todayAppointments} scheduled appointment{stats.todayAppointments !== 1 ? 's' : ''} for today.
            </p>
          </div>
          <div className="p-4">
            {todayAppointments.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {todayAppointments.map((appointment) => (
                  <li key={appointment.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <Calendar className="h-6 w-6 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {appointment.patient_name || 'Unknown Patient'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {appointment.start_time ? format(new Date(`2000-01-01T${appointment.start_time}`), 'h:mm a') : 'N/A'}
                        </p>
                      </div>
                      <div className="hidden sm:block">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {appointment.reason}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-black">No appointments today</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Check back later for new appointments.
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow h-full flex flex-col justify-between">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium leading-6 text-black">
                Messages
              </h3>
              {stats.unreadMessages > 0 && (
                <div className="ml-2 text-sm font-medium text-white bg-blue-500 rounded-full px-2 py-1">
                  {stats.unreadMessages}
                </div>
              )}
            </div>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-center items-center">
            <MessageSquare className="h-12 w-12 text-blue-500" />
            <p className="mt-2 text-3xl font-bold text-black">{stats.totalPatients}</p>
            <p className="mt-1 text-sm text-gray-500">Active Patients</p>
          </div>
        </div>
      </div>
      
      <div className="grid gap-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-black">
              Low Stock Items
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Items with 10 or fewer pieces remaining.
            </p>
          </div>
          <div className="p-4">
            {lowStockItems.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {lowStockItems.map((item) => (
                  <li key={item.id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="h-6 w-6 text-red-500" />
                      <p className="text-sm font-medium text-gray-900">
                        {item.name}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-red-500">
                      {item.stocks_left} left
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm font-medium text-black">
                  No items are currently low in stock.
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  All inventory levels are healthy.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}