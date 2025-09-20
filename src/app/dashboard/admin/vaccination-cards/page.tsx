'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Search, User, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface PatientVaccination {
  id: string;
  patient_id: string;
  patient_name: string;
  vaccine_id: string;
  vaccine_name: string;
  dose_number: number;
  date_administered: string;
  next_dose_date: string | null;
  status: 'completed' | 'scheduled' | 'missed';
  administered_by: string;
  notes: string | null;
}

export default function VaccinationCardsPage() {

  // ...state declarations...
  const [vaccinations, setVaccinations] = useState<PatientVaccination[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<PatientVaccination | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    status: 'completed',
    notes: '',
    next_dose_date: ''
  });
  const supabase = createClient();

  // Filter vaccinations based on search query
  const filteredVaccinations: PatientVaccination[] = vaccinations.filter(vaccination => 
    vaccination.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vaccination.vaccine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vaccination.status.toLowerCase().includes(searchQuery.toLowerCase())
  );



  // (Removed duplicate handleEditClick and handleSubmit)
  //     );
      
  //     toast.success('Vaccination record updated successfully');
  //   } catch (error) {
  //     console.error('Error updating vaccination record:', error);
  //     toast.error('Failed to update record');
  //   }
  // };

  // Handle edit button click
  const handleEditClick = (record: PatientVaccination) => {
    setEditingRecord(record);
    setFormData({
      status: record.status,
      notes: record.notes || '',
      next_dose_date: record.next_dose_date || ''
    });
    setIsDialogOpen(true);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;

    try {
      const { error } = await supabase
        .from('vaccination_records')
        .update({
          status: formData.status,
          notes: formData.notes || null,
          next_dose_date: formData.next_dose_date || null
        })
        .eq('id', editingRecord.id);

      if (error) throw error;

      // Update local state
      setVaccinations(prev => 
        prev.map(record => 
          record.id === editingRecord.id 
            ? { 
                ...record, 
                status: formData.status as 'completed' | 'scheduled' | 'missed',
                notes: formData.notes || null,
                next_dose_date: formData.next_dose_date || null
              } 
            : record
        )
      );
      
      setIsDialogOpen(false);
      toast.success('Vaccination record updated successfully');
    } catch (error) {
      console.error('Error updating vaccination record:', error);
      toast.error('Failed to update record');
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'missed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients E-Vaccination Cards</h1>
          <p className="text-muted-foreground">
            View and manage patient vaccination records
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search patients or vaccines..."
                  className="w-full pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Dose</TableHead>
                    <TableHead>Date Administered</TableHead>
                    <TableHead>Next Dose</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVaccinations.length > 0 ? (
                    filteredVaccinations.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                              <User className="h-4 w-4" />
                            </div>
                            <span>{record.patient_name || 'Unknown Patient'}</span>
                          </div>
                        </TableCell>
                        <TableCell>{record.vaccine_name}</TableCell>
                        <TableCell>Dose {record.dose_number}</TableCell>
                        <TableCell>
                          {format(new Date(record.date_administered), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          {record.next_dose_date 
                            ? format(new Date(record.next_dose_date), 'MMM d, yyyy')
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(record.status)}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditClick(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No vaccination records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vaccination Record</DialogTitle>
          </DialogHeader>
          {editingRecord && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Status
                </label>
                <select
                  title="Edit vaccination status"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="missed">Missed</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Next Dose Date (if applicable)
                </label>
                <Input
                  type="date"
                  value={formData.next_dose_date}
                  onChange={(e) => setFormData({...formData, next_dose_date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Notes
                </label>
                <textarea
                  title="Edit notes"
                  placeholder="Enter notes here"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
