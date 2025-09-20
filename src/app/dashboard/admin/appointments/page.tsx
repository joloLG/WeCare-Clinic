'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, Search, Plus, Filter, CheckCircle, XCircle, MoreHorizontal, AlertCircle } from 'lucide-react';
import { format, isToday, isThisWeek, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

type AppointmentStatus = 'pending' | 'scheduled' | 'settled';

interface Appointment {
  id: string;
  patient_id: string;
  vaccine_id: string | null;
  appointment_date: string; // Date in YYYY-MM-DD format
  start_time: string; // Time in HH:MM:SS format
  end_time: string;   // Time in HH:MM:SS format
  status: AppointmentStatus;
  reason: string | null;
  notes: string | null;
  
  // Bite information (from patient form)
  address_of_bite: string | null;
  date_bites: string | null; // Date in YYYY-MM-DD format
  time_of_bite: string | null; // Time in HH:MM:SS format
  animal_type: string | null;
  animal_ownership: string | null;
  animal_status: string | null;
  animal_vaccinated: string | null;
  vaccinated_by: string | null;
  wound_management: string | null;
  allergies: string | null;
  
  created_at: string;
  updated_at: string;
  
  // Joined data
  profiles?: {
    first_name: string;
    last_name: string;
    phone_number?: string | null;
    email: string;
  };
  
  // Joined vaccine data
  vaccines?: {
    name: string;
  } | null;
}

export default function AppointmentsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'upcoming' | 'past'>('today');
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
  const [loading, setIsLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Get patient name safely, handling both direct properties and nested patient object
  const getPatientName = (appointment: Appointment) => {
    const profile = appointment.profiles;
    if (profile) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown Patient';
    }
    return 'Unknown Patient';
  };

  // Filter appointments based on search, status, and date
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      // Search by patient name, email, or phone number
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = searchQuery === '' || 
        getPatientName(appointment).toLowerCase().includes(searchLower) ||
        (appointment.profiles?.email?.toLowerCase().includes(searchLower) ?? false) ||
        (appointment.profiles?.phone_number?.includes(searchLower) ?? false);

      // Filter by status
      const matchesStatus = statusFilter === 'all' || appointment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Base query with joins to profiles and vaccines
      let query = supabase
        .from('appointments')
        .select(`
          *,
          profiles (
            id,
            first_name,
            last_name,
            phone_number,
            email
          ),
          vaccines (
            name
          )
        `);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      // Use appointment_date for filtering instead of date_bites
      if (dateFilter === 'today') {
        query = query.eq('appointment_date', todayStr);
      } else if (dateFilter === 'upcoming') {
        query = query.gte('appointment_date', todayStr);
      } else if (dateFilter === 'past') {
        query = query.lt('appointment_date', todayStr);
      }
      
      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      // Order by appointment date and time
      query = query.order('appointment_date', { ascending: true })
                  .order('start_time', { ascending: true });
      
      const { data, error } = await query;

      if (error) throw error;

      setAppointments((data as Appointment[]) || []);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching appointments:', err);
      toast.error('Failed to fetch appointments');
      setIsLoading(false);
    }
  }, [supabase, dateFilter, statusFilter]);

  // Initial data fetch
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Set up real-time subscription
  useEffect(() => {
    if (!supabase) return;
    
    // Subscribe to changes in the appointments table
    const subscription = supabase
      .channel('appointments-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'appointments',
          filter: '*'
        },
        (payload) => {
          console.log('Appointment change:', payload);
          // Only refetch if the change is relevant to the current view
          if (payload.eventType === 'INSERT' || 
              payload.eventType === 'UPDATE' || 
              payload.eventType === 'DELETE') {
            fetchAppointments();
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [supabase, fetchAppointments]);

  const handleStatusChange = useCallback(async (appointmentId: string, newStatus: AppointmentStatus) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);

      if (error) throw error;

      // The real-time subscription will handle updating the UI
      toast.success('Appointment status updated successfully');
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast.error('Failed to update appointment status');
    }
  }, [supabase]);
  
  const handleStatusUpdate = useCallback(async (appointmentId: string, newStatus: AppointmentStatus) => {
    await handleStatusChange(appointmentId, newStatus);
    // Close the modal if open
    if (isModalOpen) {
      setIsModalOpen(false);
    }
    // Refresh the appointments list
    fetchAppointments();
  }, [handleStatusChange, isModalOpen, fetchAppointments]);
  
  const handleStatusFilter = useCallback((status: AppointmentStatus | 'all') => {
    setStatusFilter(status);
  }, []);

  const getStatusBadge = (status: AppointmentStatus) => {
    const statusConfig = {
      pending: { text: 'Pending', color: 'bg-orange-100 text-orange-800' },
      scheduled: { text: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
      settled: { text: 'Settled', color: 'bg-green-100 text-green-800' },
    } as const;
    
    const config = statusConfig[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  const formatAppointmentDate = (dateStr: string, timeStr: string) => {
    try {
      // Combine date and time strings
      const dateTimeStr = `${dateStr}T${timeStr}`;
      const date = new Date(dateTimeStr);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      if (isToday(date)) {
        return `Today at ${format(date, 'h:mm a')}`;
      } else if (isThisWeek(date, { weekStartsOn: 1 })) {
        return `${format(date, 'EEEE')} at ${format(date, 'h:mm a')}`;
      } else {
        return format(date, 'MMM d, yyyy h:mm a');
      }
    } catch (error) {
      console.error('Error formatting date:', { dateStr, timeStr, error });
      return 'Invalid date';
    }
  };

  // Filtering is handled in the filteredAppointments memo

  return (
    <div className="space-y-6 bg-white min-h-screen" style={{ background: 'linear-gradient(135deg, #fff 80%, #ffe5e5 100%)' }}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Manage and track patient appointments
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/admin/appointments/new')} className="mt-4 md:mt-0">
          <Plus className="mr-2 h-4 w-4" /> New Appointment
        </Button>
      </div>

  <Card className="shadow-lg border-2 border-red-100 bg-white">
  <CardHeader className="pb-3 bg-red-50 border-b border-red-100 rounded-t-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  className="pl-8 max-w-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>  
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2">
                <Button
                  variant={dateFilter === 'today' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('today')}
                >
                  Today
                </Button>
                <Button
                  variant={dateFilter === 'upcoming' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('upcoming')}
                >
                  Upcoming
                </Button>
                <Button
                  variant={dateFilter === 'past' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateFilter('past')}
                >
                  Past
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    {statusFilter === 'all' ? 'All Status' : statusFilter}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                    All Status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilter('scheduled')}>
                    Scheduled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilter('pending')}>
                    Pending
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilter('scheduled')}>
                    Scheduled
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusFilter('settled')}>
                    Settled
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
  <CardContent className="bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium">No appointments found</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery
                  ? 'No appointments match your search.'
                  : 'Get started by creating a new appointment.'}
              </p>
              <Button className="mt-4" onClick={() => router.push('/dashboard/admin/appointments/new')}>
                <Plus className="mr-2 h-4 w-4" /> New Appointment
              </Button>
            </div>
          ) : (
            <div className="rounded-md border border-red-100 bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          {getPatientName(appointment)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                          {formatAppointmentDate(appointment.appointment_date, appointment.start_time)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {appointment.vaccines?.name || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(appointment.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setIsModalOpen(true);
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                // Copy appointment details to clipboard
                                const details = `Patient: ${getPatientName(appointment)}\n` +
                                  `Date: ${appointment.appointment_date} ${appointment.start_time}\n` +
                                  `Status: ${appointment.status}\n` +
                                  `Vaccine: ${appointment.vaccines?.name || 'Not specified'}`;
                                navigator.clipboard.writeText(details);
                                toast.success('Appointment details copied to clipboard');
                              }}
                            >
                              Copy Details
                            </DropdownMenuItem>
                            {appointment.status === 'scheduled' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(appointment.id, 'settled')}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Mark as Settled
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatusUpdate(appointment.id, 'pending')}
                                  className="text-yellow-600"
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  Mark as Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => router.push(`/dashboard/admin/appointments/send-message?appointmentId=${appointment.id}`)}
                                  className="text-blue-600"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 0 1-4-.8l-4 1 1-4A8.96 8.96 0 0 1 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                  Send Message
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent 
            className={cn(
              "w-[95vw] max-w-4xl p-0",
              "h-[90vh] max-h-[800px] overflow-hidden",
              "flex flex-col"
            )}
          >
            <DialogHeader className="px-6 pt-6 pb-4 border-b sticky top-0 bg-white z-10">
              <DialogTitle className="text-xl sm:text-2xl">Appointment Details</DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Patient Information */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-lg">
                <h3 className="font-medium text-lg mb-3 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Patient Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="font-medium break-words">
                      {selectedAppointment.profiles?.first_name} {selectedAppointment.profiles?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="font-medium break-words">{selectedAppointment.profiles?.phone_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium break-words">{selectedAppointment.profiles?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-lg">
                <h3 className="font-medium text-lg mb-3 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Appointment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium break-words">
                      {format(parseISO(selectedAppointment.appointment_date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium break-words">
                      {format(new Date(`2000-01-01T${selectedAppointment.start_time}`), 'h:mm a')} -{' '}
                      {format(new Date(`2000-01-01T${selectedAppointment.end_time}`), 'h:mm a')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <div className="mt-1">{getStatusBadge(selectedAppointment.status)}</div>
                  </div>
                  {selectedAppointment.vaccine_id && (
                    <div>
                      <p className="text-sm text-gray-500">Vaccine</p>
                      <p className="font-medium break-words">{selectedAppointment.vaccines?.name || 'N/A'}</p>
                    </div>
                  )}
                  {selectedAppointment.reason && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Reason</p>
                      <p className="font-medium break-words">{selectedAppointment.reason}</p>
                    </div>
                  )}
                  {selectedAppointment.notes && (
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="font-medium whitespace-pre-line">{selectedAppointment.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bite Information */}
              {(selectedAppointment.animal_type || selectedAppointment.date_bites) && (
                <div className="bg-red-50 p-4 sm:p-5 rounded-lg border border-red-100">
                  <h3 className="font-medium text-lg mb-3 flex items-center text-red-800">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Animal Bite Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedAppointment.animal_type && (
                      <div>
                        <p className="text-sm text-red-700">Animal Type</p>
                        <p className="font-medium break-words">{selectedAppointment.animal_type}</p>
                      </div>
                    )}
                    {selectedAppointment.animal_ownership && (
                      <div>
                        <p className="text-sm text-red-700">Ownership</p>
                        <p className="font-medium break-words">{selectedAppointment.animal_ownership}</p>
                      </div>
                    )}
                    {selectedAppointment.date_bites && (
                      <div>
                        <p className="text-sm text-red-700">Date of Bite</p>
                        <p className="font-medium break-words">
                          {format(parseISO(selectedAppointment.date_bites), 'MMM d, yyyy')}
                          {selectedAppointment.time_of_bite && (
                            <span className="ml-2">
                              at {format(new Date(`2000-01-01T${selectedAppointment.time_of_bite}`), 'h:mm a')}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    {selectedAppointment.address_of_bite && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-red-700">Location of Bite</p>
                        <p className="font-medium break-words">{selectedAppointment.address_of_bite}</p>
                      </div>
                    )}
                    {selectedAppointment.wound_management && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-red-700">Wound Management</p>
                        <p className="font-medium whitespace-pre-line">{selectedAppointment.wound_management}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sticky Footer with Actions */}
              <div className="sticky bottom-0 bg-white border-t p-4">
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 w-full">
                {selectedAppointment.status === 'scheduled' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedAppointment.id, 'settled')}
                      className="text-green-600 border-green-200 hover:bg-green-50"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark as Settled
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleStatusUpdate(selectedAppointment.id, 'pending')}
                      className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Mark as Pending
                    </Button>
                  </>
                )}
                <Button 
                  onClick={() => setIsModalOpen(false)} 
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
