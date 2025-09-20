'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Calendar, Clock, X, ChevronDown } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppointments } from '@/hooks/useAppointments';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
}

interface Vaccine {
  id: string;
  name: string;
}

export default function NewAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();
  const { bookAppointment, loading } = useAppointments();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState({
    patientId: '',
    vaccineId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    duration: 30,
    reason: '',
    notes: ''
  });

  const [availableTimeSlots, setAvailableTimeSlots] = useState<Array<{ value: string, label: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch patients, vaccines
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch patients
        const { data: patientsData, error: patientsError } = await supabase
          .from('patients')
          .select('id, first_name, last_name');

        if (patientsError) throw patientsError;

        // Fetch vaccines
        const { data: vaccinesData, error: vaccinesError } = await supabase
          .from('vaccines')
          .select('id, name')
          .eq('is_active', true)
          .order('name');

        if (vaccinesError) throw vaccinesError;

        setPatients(patientsData || []);
        setVaccines(vaccinesData || []);
        setIsLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setIsLoading(false);
        toast.error('Failed to load required data. Please try again.');
      }
    };

    fetchData();
  }, [supabase]);

  // Generate time slots when date changes
  useEffect(() => {
    if (!formData.date) return;
    const generateTimeSlots = async () => {
      try {
        // Working hours (simplified)
        const workStart = 9; // 9 AM
        const workEnd = 17; // 5 PM
        const slotDuration = 30; // minutes

        // Get existing appointments for the selected date
        const { data: existingAppointments } = await supabase
          .from('appointments')
          .select('start_time, end_time, appointment_date')
          .eq('appointment_date', formData.date)
          .neq('status', 'cancelled');

        // Generate all possible time slots
        const slots: Array<{ value: string; label: string }> = [];
        const startDate = new Date(`${formData.date}T${workStart.toString().padStart(2, '0')}:00:00`);
        const endDate = new Date(`${formData.date}T${workEnd.toString().padStart(2, '0')}:00:00`);

        let currentSlot = new Date(startDate);

        while (currentSlot < endDate) {
          const slotEnd = addMinutes(new Date(currentSlot), slotDuration);
          const slotStartStr = format(currentSlot, 'HH:mm');
          const slotEndStr = format(slotEnd, 'HH:mm');

          // Check if this slot is available against existing appointments
          const isBooked = existingAppointments?.some((apt) => {
            // If DB stores times as HH:mm:ss, combine with date
            const aptStart = new Date(`${formData.date}T${String(apt.start_time)}`);
            const aptEnd = new Date(`${formData.date}T${String(apt.end_time)}`);
            return (
              (currentSlot >= aptStart && currentSlot < aptEnd) ||
              (slotEnd > aptStart && slotEnd <= aptEnd) ||
              (currentSlot <= aptStart && slotEnd >= aptEnd)
            );
          });

          if (!isBooked) {
            slots.push({ value: slotStartStr, label: `${slotStartStr} - ${slotEndStr}` });
          }

          currentSlot = addMinutes(currentSlot, 15); // Check every 15 minutes for availability
        }

        setAvailableTimeSlots(slots);
      } catch (error) {
        console.error('Error generating time slots:', error);
      }
    };
    generateTimeSlots();
  }, [formData.date, supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);

      // Validate form data
      if (!formData.patientId || !formData.date || !formData.startTime) {
        toast.error('Please fill in all required fields');
        return;
      }

      const startTime = new Date(`${formData.date}T${formData.startTime}`);
      const endTime = addMinutes(new Date(startTime), formData.duration);

      // Get the selected patient's details
      const selectedPatient = patients.find(p => p.id === formData.patientId);
      if (!selectedPatient) {
        throw new Error('Selected patient not found');
      }

      // Only send the patient_id and required appointment data
      const appointmentData = {
        patient_id: formData.patientId,
        vaccine_id: formData.vaccineId || undefined,
        appointment_date: formData.date,
        start_time: format(startTime, 'HH:mm:ss'),
        end_time: format(endTime, 'HH:mm:ss'),
        reason: formData.reason || '',
        notes: formData.notes || '',
        // Add patient details for the appointment record
        patient_name: `${selectedPatient.first_name} ${selectedPatient.last_name}`.trim()
      };

      await bookAppointment(appointmentData);

      toast('Appointment scheduled successfully!');

      // Redirect to appointments list
      router.push('/dashboard/admin/appointments');
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast(error instanceof Error ? error.message : 'Failed to schedule appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Appointment</h1>
          <p className="text-muted-foreground">
            Schedule a new appointment for a patient
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <X className="mr-2 h-4 w-4" /> Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appointment Details</CardTitle>
            <CardDescription>
              Enter the appointment information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Patient Selection */}
              <div className="space-y-2">
                <Label htmlFor="patientId">Patient</Label>
                <div className="relative">
                  <select
                    title="Select patient"
                    id="patientId"
                    name="patientId"
                    value={formData.patientId}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Select a patient</option>
                    {patients.map(patient => (
                      <option key={patient.id} value={patient.id}>
                        {`${patient.first_name} ${patient.last_name}`.trim()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                </div>
              </div>

              {/* Vaccine Selection */}
              <div className="space-y-2">
                <Label htmlFor="vaccineId">Vaccine (Optional)</Label>
                <div className="relative">
                  <select
                    title="Select vaccine"
                    id="vaccineId"
                    name="vaccineId"
                    value={formData.vaccineId}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a vaccine (optional)</option>
                    {vaccines.map(vaccine => (
                      <option key={vaccine.id} value={vaccine.id}>
                        {vaccine.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50" />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <div className="relative">
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="pl-10"
                    required
                  />
                  <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {/* Time Slot */}
              <div className="space-y-2">
                <Label htmlFor="startTime">Time Slot</Label>
                <div className="relative">
                  <select
                    title="Select time slot"
                    id="startTime"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    {availableTimeSlots.length > 0 ? (
                      availableTimeSlots.map(slot => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))
                    ) : (
                      <option value="">
                        {availableTimeSlots.length === 0 ? 'No available slots' : 'Select a time'}
                      </option>
                    )}
                  </select>
                  <Clock className="absolute right-3 top-2.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min="15"
                  max="120"
                  step="15"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            
            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Visit</Label>
              <Input
                id="reason"
                name="reason"
                placeholder="e.g., Annual checkup, Vaccination, Follow-up"
                value={formData.reason}
                onChange={handleChange}
              />
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes or instructions"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || loading}>
            {isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
          </Button>
        </div>
      </form>
    </div>
  );
}