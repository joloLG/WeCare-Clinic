'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

type Vaccine = {
  id: string;
  name: string;
  description: string | null;
  stocks_left: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type VaccineFormData = {
  name: string;
  description: string;
  stocks_left: number;
};

export default function InventoryPage() {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<VaccineFormData>({
    name: '',
    description: '',
    stocks_left: 0,
  });
  
  const [showLowStockAlert, setShowLowStockAlert] = useState(false);
  const [lowStockVaccines, setLowStockVaccines] = useState<Vaccine[]>([]);
  
  const supabase = createClient();
  const router = useRouter();

  // Check if user is admin
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      
      // In a real app, you would check the user's role here
      // For now, we'll just check if the user is logged in
    };

    checkUser();
  }, [router, supabase]);

  // Check for low stock items
  const checkLowStock = (vaccines: Vaccine[]) => {
    const lowStock = vaccines.filter(v => v.status === 'low_stock' || v.status === 'out_of_stock');
    setLowStockVaccines(lowStock);
    setShowLowStockAlert(lowStock.length > 0);
  };

  // Fetch vaccine inventory
  useEffect(() => {
    const fetchVaccines = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('vaccines')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        
        setVaccines(data);
        checkLowStock(data);
      } catch (error) {
        console.error('Error fetching vaccine inventory:', error);
        toast.error('Failed to load vaccine inventory');
      } finally {
        setLoading(false);
      }
    };

    fetchVaccines();

    // Set up real-time subscription
    const channel = supabase
      .channel('vaccine-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vaccines',
        },
        () => {
          // Refresh the list when there are changes
          fetchVaccines();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const getVaccineStatus = (stocksLeft: number): 'in_stock' | 'low_stock' | 'out_of_stock' => {
    if (stocksLeft <= 0) return 'out_of_stock';
    if (stocksLeft <= 10) return 'low_stock'; // Fixed threshold of 10 for low stock
    return 'in_stock';
  };
  
  const getStatusBadge = (status: string) => {
    const statusMap = {
      in_stock: { text: 'In Stock', color: 'bg-green-100 text-green-800' },
      low_stock: { text: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' },
      out_of_stock: { text: 'Out of Stock', color: 'bg-red-100 text-red-800' },
    };
    
    const { text, color } = statusMap[status as keyof typeof statusMap] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>{text}</span>;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'quantity' || name === 'min_quantity' ? parseInt(value) || 0 : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      stocks_left: 0,
    });
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (vaccine: Vaccine) => {
    setFormData({
      name: vaccine.name,
      description: vaccine.description || '',
      stocks_left: vaccine.stocks_left,
    });
    setEditingId(vaccine.id);
    setIsAdding(true);
  };
  
  const toggleVaccineStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('vaccines')
        .update({ is_active: !currentStatus })
        .eq('id', id);
        
      if (error) throw error;
      
      toast.success(`Vaccine ${currentStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (error) {
      console.error('Error toggling vaccine status:', error);
      toast.error('Failed to update vaccine status');
    }
  };

  const handleDeleteVaccine = async (id: string) => {
    if (!confirm('Are you sure you want to delete this vaccine?')) return;

    try {
      const { error } = await supabase
        .from('vaccines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Vaccine deleted successfully');
      setVaccines(vaccines.filter(vaccine => vaccine.id !== id));
    } catch (error) {
      console.error('Error deleting vaccine:', error);
      toast.error('Failed to delete vaccine');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error('Vaccine name is required');
      return;
    }
    
    if (formData.stocks_left < 0) {
      toast.error('Stock quantity cannot be negative');
      return;
    }
    
    try {
      setLoading(true);
      
      const vaccineData = {
        name: formData.name,
        description: formData.description || null,
        stocks_left: formData.stocks_left,
        status: getVaccineStatus(formData.stocks_left),
        is_active: true
      };
      
      if (editingId) {
        // Update existing vaccine
        const { error } = await supabase
          .from('vaccines')
          .update(vaccineData)
          .eq('id', editingId);
          
        if (error) throw error;
        toast.success('Vaccine updated successfully');
      } else {
        // Add new vaccine
        const { error } = await supabase
          .from('vaccines')
          .insert([vaccineData]);
          
        if (error) throw error;
        toast.success('Vaccine added successfully');
      }
      
      // The real-time subscription will update the list
      resetForm();
    } catch (error) {
      console.error('Error saving vaccine:', error);
      toast.error('Failed to save vaccine');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Low Stock Alert */}
      {showLowStockAlert && (
        <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Low Stock Alert</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>The following vaccines are running low on stock:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {lowStockVaccines.map(vaccine => (
                    <li key={vaccine.id}>
                      {vaccine.name} - {vaccine.stocks_left} {vaccine.stocks_left === 1 ? 'dose' : 'doses'} left
                      {vaccine.status === 'out_of_stock' && ' (Out of Stock)'}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="bg-yellow-50 px-2 py-1.5 rounded-md text-sm font-medium text-yellow-800 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                  onClick={() => setShowLowStockAlert(false)}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Vaccine Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage vaccine stock and track inventory levels
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Vaccine
        </Button>
      </div>

      {/* Add/Edit Vaccine Dialog */}
      {isAdding && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(255, 240, 240, 0.95)' }}>
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle>{editingId ? 'Edit Vaccine' : 'Add New Vaccine'}</CardTitle>
              <CardDescription>
                {editingId ? 'Update the vaccine details below.' : 'Fill in the details to add a new vaccine to the inventory.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vaccine Name *</label>
                    <Input
                      placeholder="e.g., Rabies Vaccine, COVID-19 Vaccine"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Current Stock *</label>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={formData.stocks_left}
                          onChange={(e) => setFormData({ ...formData, stocks_left: parseInt(e.target.value) || 0 })}
                          required
                          className="pl-8"
                        />
                        <span className="absolute left-3 top-2.5 text-sm text-gray-500">#</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.stocks_left <= 10 ? (
                          <span className="text-yellow-600">
                            <AlertCircle className="inline h-4 w-4 mr-1" />
                            {formData.stocks_left === 0 ? 'Out of stock' : 'Low stock alert'}
                          </span>
                        ) : (
                          'Stock is sufficient'
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      placeholder="Enter vaccine description, dosage information, or special instructions..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        {editingId ? 'Updating...' : 'Adding...'}
                      </>
                    ) : editingId ? 'Update Vaccine' : 'Add to Inventory'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Vaccine Inventory</CardTitle>
          <CardDescription>
            Current stock levels and status of all vaccines
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>A list of all vaccines in inventory. Showing {vaccines.length} items.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vaccines.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        No vaccines found. Add a new vaccine to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vaccines.map((vaccine) => (
                      <TableRow key={vaccine.id} className={!vaccine.is_active ? 'opacity-60' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            {vaccine.name}
                            {!vaccine.is_active && (
                              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-500">
                                Inactive
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {vaccine.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {vaccine.stocks_left} {vaccine.stocks_left === 1 ? 'dose' : 'doses'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(vaccine.status)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(vaccine.updated_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(vaccine)}
                            title="Edit"
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleVaccineStatus(vaccine.id, vaccine.is_active)}
                            title={vaccine.is_active ? 'Deactivate' : 'Activate'}
                            className={`h-8 w-8 p-0 ${vaccine.is_active ? 'text-yellow-600' : 'text-green-600'}`}
                          >
                            {vaccine.is_active ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
