'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, Syringe, User, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  date_of_birth: string | null;
  sex: string | null;
  address: string | null;
  civil_status: string | null;
  role: 'admin' | 'patient';
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  blood_type?: string | null;
  allergies?: string | null;
  status?: string | null;
}

type VaccinationStatus = '1st Vaccination' | '2nd Vaccination' | 'Fully Vaccinated' | 'No Vaccination';

interface VaccinationRecord {
  id: string;
  patient_id: string;
  vaccine_id: string;
  appointment_id: string | null;
  dose_number: number | null;
  date_administered: string;
  administered_by_profile_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Add patient status from e_vaccination_card
  patient_status?: VaccinationStatus;
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [vaccineRecords, setVaccineRecords] = useState<Record<string, VaccinationRecord[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [availableVaccines, setAvailableVaccines] = useState<{id: string, name: string, stocks_left: number}[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for vaccination record
  const [vaccineForm, setVaccineForm] = useState<{
    vaccine_id: string;
    date_administered: string;
    next_due_date: string;
    dose_number: number;
    status: '1st Vaccination' | '2nd Vaccination' | 'Fully Vaccinated' | 'No Vaccination';
    notes: string;
    animal_bite: string;
  }>({
    vaccine_id: '',
    date_administered: format(new Date(), 'yyyy-MM-dd'),
    next_due_date: '',
    dose_number: 1,
    status: '1st Vaccination',
    notes: '',
    animal_bite: 'dog'
  });
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch patient profiles
        const { data: patientsData, error: patientsError } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'patient')
          .order('created_at', { ascending: false });

        if (patientsError) throw patientsError;

        // Fetch vaccination records for all patients
        const patientIds = patientsData?.map(p => p.id) || [];
        const { data: vaccineData = [], error: vaccineError } = await supabase
          .from('patient_vaccination_history')
          .select('*')
          .in('patient_id', patientIds);

        if (vaccineError) {
          console.error('Error fetching vaccine records:', vaccineError);
          toast.error('Failed to load vaccine records');
          return;
        }

        // Group vaccination records by patient ID
        const recordsByPatient: Record<string, VaccinationRecord[]> = {};
        (vaccineData || []).forEach(record => {
          if (!recordsByPatient[record.patient_id]) {
            recordsByPatient[record.patient_id] = [];
          }
          recordsByPatient[record.patient_id].push(record);
        });

        setPatients(patientsData || []);
        setVaccineRecords(recordsByPatient);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load patient data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supabase]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery) return patients;
    
    const query = searchQuery.toLowerCase();
    return patients.filter(patient => 
      patient.first_name?.toLowerCase().includes(query) ||
      patient.last_name?.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      (patient.phone_number ? patient.phone_number.includes(query) : false)
    );
  }, [patients, searchQuery]);

  const getLatestVaccineRecord = (patientId: string) => {
    const records = vaccineRecords[patientId];
    if (!records || records.length === 0) return null;
    
    return [...records].sort((a, b) => 
      new Date(b.date_administered).getTime() - new Date(a.date_administered).getTime()
    )[0];
  };

  const getNextDueDate = (patientId: string) => {
    const records = vaccineRecords[patientId] || [];
    if (records.length === 0) return 'Not Started';
    
    // Sort by date_administered in descending order
    const sortedRecords = [...records].sort((a, b) => 
      new Date(b.date_administered).getTime() - new Date(a.date_administered).getTime()
    );
    
    const latestRecord = sortedRecords[0];
    if (!latestRecord) return 'Not Started';
    
    // If the latest record has a patient_status, use that
    if (latestRecord.patient_status) {
      return latestRecord.patient_status;
    }
    
    // Fallback to dose number if no status is available
    return `Dose ${latestRecord.dose_number || 1} completed`;
  };

  const getVaccinationStatus = (patientId: string) => {
    const records = vaccineRecords[patientId] || [];
    if (records.length === 0) return { text: 'Not Started', color: 'bg-gray-100 text-gray-800' };
    
    // Get the most recent record
    const latestRecord = [...records].sort((a, b) => 
      new Date(b.date_administered).getTime() - new Date(a.date_administered).getTime()
    )[0];
    
    // If we have a patient status, use that
    if (latestRecord.patient_status) {
      const statusMap: Record<string, { text: string; color: string }> = {
        '1st Vaccination': { text: '1st Dose', color: 'bg-blue-100 text-blue-800' },
        '2nd Vaccination': { text: '2nd Dose', color: 'bg-yellow-100 text-yellow-800' },
        'Fully Vaccinated': { text: 'Completed', color: 'bg-green-100 text-green-800' },
        'No Vaccination': { text: 'Not Started', color: 'bg-gray-100 text-gray-800' }
      };
      return statusMap[latestRecord.patient_status] || { text: latestRecord.patient_status, color: 'bg-gray-100 text-gray-800' };
    }
    
    // Fallback to counting doses if no status is available
    const doseCount = records.length;
    if (doseCount === 0) return { text: 'Not Started', color: 'bg-gray-100 text-gray-800' };
    if (doseCount >= 2) return { text: 'Completed', color: 'bg-green-100 text-green-800' };
    
    return { 
      text: `Dose ${doseCount} of 2`, 
      color: 'bg-blue-100 text-blue-800' 
    };
  };

  // Fetch available vaccines
  useEffect(() => {
    const fetchVaccines = async () => {
      const { data, error } = await supabase
        .from('vaccines')
        .select('id, name, stocks_left')
        .gt('stocks_left', 0) // Only show vaccines with available stock
        .order('name');
      
      if (!error && data) {
        setAvailableVaccines(data);
      }
    };
    
    fetchVaccines();
  }, [supabase]);

  // Open modal and set selected patient
  const openPatientModal = (patient: Patient) => {
    setSelectedPatient(patient);
    
    // Find the next dose number
    const records = vaccineRecords[patient.id] || [];
    const nextDose = records.length > 0 ? (records[0].dose_number || 0) + 1 : 1;
    
    setVaccineForm({
      vaccine_id: '',
      date_administered: format(new Date(), 'yyyy-MM-dd'),
      next_due_date: '',
      dose_number: nextDose,
      status: nextDose === 1 ? '1st Vaccination' : 
              nextDose === 2 ? '2nd Vaccination' : 'Fully Vaccinated',
      notes: '',
      animal_bite: 'dog' // Default value (will be stored in notes for now)
    });
    
    setIsModalOpen(true);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setVaccineForm(prev => ({
      ...prev,
      [name]: name === 'dose_number' ? parseInt(value) || 1 : value
    }));
  };

  // Handle form submission
  const handleSubmitVaccination = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    
    try {
      setIsSaving(true);
      
      // Determine the new status based on the dose number
      let newStatus: '1st Vaccination' | '2nd Vaccination' | 'Fully Vaccinated' | 'No Vaccination' = 'No Vaccination';
      if (vaccineForm.dose_number === 1) {
        newStatus = '1st Vaccination';
      } else if (vaccineForm.dose_number === 2) {
        newStatus = '2nd Vaccination';
      } else if (vaccineForm.dose_number >= 3) {
        newStatus = 'Fully Vaccinated';
      }
      
      // Update the patient's vaccination status in the patients table
      const { error: updatePatientError } = await supabase
        .from('patients')
        .update({ status: newStatus })
        .eq('id', selectedPatient.id);
      
      if (updatePatientError) throw updatePatientError;
      
      // Create new vaccination record
      const { data: newRecord, error } = await supabase
        .from('patient_vaccination_history')
        .insert([{
          patient_id: selectedPatient.id,
          vaccine_id: vaccineForm.vaccine_id,
          date_administered: vaccineForm.date_administered,
          dose_number: vaccineForm.dose_number,
          notes: `Animal bite: ${vaccineForm.animal_bite}. ${vaccineForm.notes || ''}`,
          // Add the status to the record for display purposes
          patient_status: newStatus
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Update vaccine stock
      if (vaccineForm.vaccine_id) {
        try {
          const { data: updatedStock, error: updateError } = await supabase.rpc('decrement_vaccine_stock', {
            p_vaccine_id: vaccineForm.vaccine_id,
            p_amount: 1
          });
          
          if (updateError) {
            console.error('Error updating vaccine stock:', updateError);
            throw new Error('Failed to update vaccine stock');
          }
          
          console.log('Vaccine stock updated. New stock level:', updatedStock);
        } catch (error) {
          console.error('Error in decrement_vaccine_stock:', error);
          throw error;
        }
      }
      
      // Update local state with the new record
      setVaccineRecords(prev => ({
        ...prev,
        [selectedPatient.id]: [
          ...(prev[selectedPatient.id] || []),
          { ...newRecord, patient_status: newStatus }
        ]
      }));
      
      // Update available vaccines
      setAvailableVaccines(prev => 
        prev.map(v => 
          v.id === vaccineForm.vaccine_id 
            ? { ...v, stocks_left: Math.max(0, v.stocks_left - 1) } 
            : v
        )
      );
      
      toast.success('Vaccination record updated successfully');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error updating vaccination record:', error);
      toast.error('Failed to update vaccination record');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Patient Management</h1>
          <p className="mt-1 text-base text-gray-500">
            View and manage patient records and vaccination status.
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <CardTitle className="text-xl">Patient List</CardTitle>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search by name, email, or phone..."
                className="w-full pl-10 h-10 bg-gray-50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full divide-y divide-gray-200">
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient</TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Vaccine</TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Next Dose</TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</TableHead>
                    <TableHead className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="bg-white divide-y divide-gray-200">
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => {
                      const status = getVaccinationStatus(patient.id);
                      const latestRecord = getLatestVaccineRecord(patient.id);
                      
                      return (
                        <TableRow key={patient.id} className="hover:bg-gray-50 transition-colors">
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 flex-shrink-0">
                                <User className="h-full w-full text-red-500 p-1 bg-red-100 rounded-full" />
                              </div>
                              <div>
                                <div className="text-base font-medium text-gray-900">{`${patient.first_name} ${patient.last_name}`}</div>
                                <div className="text-sm text-gray-500">
                                  {patient.sex || 'N/A'} • {patient.date_of_birth ? format(parseISO(patient.date_of_birth), 'MM/dd/yyyy') : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{patient.email}</div>
                            <div className="text-sm text-gray-500">
                              {patient.phone_number || 'No phone number'}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            {latestRecord ? (
                              <div className="flex items-center gap-2">
                                <Syringe className="h-4 w-4 text-red-500" />
                                <div>
                                  <div className="text-sm text-gray-900">Dose {latestRecord.dose_number}</div>
                                  <div className="text-sm text-gray-500">
                                    {format(parseISO(latestRecord.date_administered), 'MMM d, yyyy')}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">No records</span>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {getNextDueDate(patient.id)}
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap">
                            <Badge className={status.color}>
                              {status.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openPatientModal(patient)}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                        No patients found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Vaccination Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh] bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}'s Vaccination Record` : ''}
            </DialogTitle>
            <DialogDescription>
              Update vaccination details and view history
            </DialogDescription>
          </DialogHeader>
          
          {selectedPatient && (
            <form onSubmit={handleSubmitVaccination} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Patient Information */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Patient Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Name:</span> {selectedPatient.first_name} {selectedPatient.last_name}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Date of Birth:</span> {selectedPatient.date_of_birth ? format(parseISO(selectedPatient.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Contact:</span> {selectedPatient.phone_number || 'N/A'}
                    </p>
                  </div>
                </div>
                
                {/* Vaccination Status */}
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Vaccination Status</h3>
                  <div className="bg-white border border-blue-100 p-4 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800">
                      {getVaccinationStatus(selectedPatient.id).text === 'Completed' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Clock className="h-5 w-5" />
                      )}
                      <span className="font-medium">
                        {getVaccinationStatus(selectedPatient.id).text}
                      </span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      {getNextDueDate(selectedPatient.id) === 'Completed' 
                        ? 'Vaccination series completed' 
                        : `Next dose: ${getNextDueDate(selectedPatient.id)}`}
                    </p>
                  </div>
                </div>
                
                {/* Vaccination Form */}
                <div className="md:col-span-2 space-y-4 border-t border-gray-100 pt-4">
                  <h3 className="text-lg font-medium">Update Vaccination Record</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Vaccine *</label>
                      <Select 
                        value={vaccineForm.vaccine_id} 
                        onValueChange={(value: string) => setVaccineForm(prev => ({ ...prev, vaccine_id: value }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a vaccine" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {availableVaccines.map(vaccine => (
                            <SelectItem key={vaccine.id} value={vaccine.id}>
                              {vaccine.name} ({vaccine.stocks_left} available)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Dose Number</label>
                      <Input 
                        type="number" 
                        min="1" 
                        max="5"
                        name="dose_number"
                        value={vaccineForm.dose_number}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date Administered *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input 
                          type="date" 
                          className="pl-10"
                          name="date_administered"
                          value={vaccineForm.date_administered}
                          onChange={handleInputChange}
                          max={format(new Date(), 'yyyy-MM-dd')}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status *</label>
                      <Select 
                        value={vaccineForm.status} 
                        onValueChange={(value: '1st Vaccination' | '2nd Vaccination' | 'Fully Vaccinated' | 'No Vaccination') => 
                          setVaccineForm(prev => ({ 
                            ...prev, 
                            status: value,
                            dose_number: value === '1st Vaccination' ? 1 : 
                                        value === '2nd Vaccination' ? 2 : 3
                          }))
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="1st Vaccination">1st Vaccination</SelectItem>
                          <SelectItem value="2nd Vaccination">2nd Vaccination</SelectItem>
                          <SelectItem value="Fully Vaccinated">Fully Vaccinated</SelectItem>
                          <SelectItem value="No Vaccination">No Vaccination</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Animal Bite</label>
                      <Select 
                        value={vaccineForm.animal_bite} 
                        onValueChange={(value: string) => 
                          setVaccineForm(prev => ({ ...prev, animal_bite: value }))
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select animal" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value="dog">Dog</SelectItem>
                          <SelectItem value="cat">Cat</SelectItem>
                          <SelectItem value="bat">Bat</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {vaccineForm.status === 'Fully Vaccinated' && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Next Due Date *</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <Input 
                            type="date" 
                            className="pl-10"
                            name="next_due_date"
                            value={vaccineForm.next_due_date}
                            onChange={handleInputChange}
                            min={vaccineForm.date_administered}
                            required={vaccineForm.status === 'Fully Vaccinated'}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="md:col-span-2 space-y-2">
                      <label className="text-sm font-medium">Notes</label>
                      <textarea
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Additional notes about this vaccination..."
                        name="notes"
                        value={vaccineForm.notes}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Vaccination History */}
                <div className="md:col-span-2 space-y-2">
                  <h3 className="text-lg font-medium">Vaccination History</h3>
                  {vaccineRecords[selectedPatient.id]?.length > 0 ? (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Vaccine</TableHead>
                            <TableHead>Dose</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Animal Bite</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...(vaccineRecords[selectedPatient.id] || [])]
                            .sort((a, b) => new Date(b.date_administered).getTime() - new Date(a.date_administered).getTime())
                            .map((record) => (
                              <TableRow key={record.id}>
                                <TableCell>{format(new Date(record.date_administered), 'MMM d, yyyy')}</TableCell>
                                <TableCell>
                                  {availableVaccines.find(v => v.id === record.vaccine_id)?.name || 'Unknown'}
                                </TableCell>
                                <TableCell>Dose {record.dose_number}</TableCell>
                                <TableCell>
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    record.patient_status === 'Fully Vaccinated' 
                                      ? 'bg-green-100 text-green-800' 
                                      : record.patient_status === '2nd Vaccination' 
                                        ? 'bg-blue-100 text-blue-800' 
                                        : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {record.patient_status || 'Not Started'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {record.notes?.includes('Animal bite:') 
                                    ? record.notes.split('Animal bite: ')[1]?.split('.')[0] || 'N/A'
                                    : 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                      <p>No vaccination records found for this patient.</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSaving || !vaccineForm.vaccine_id}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isSaving ? 'Saving...' : 'Save Vaccination'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}