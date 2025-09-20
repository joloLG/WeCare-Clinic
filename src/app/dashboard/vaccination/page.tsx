'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
// Removed unused Card imports
import { Button } from '@/components/ui/button';
import { Download, Printer, Loader2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { format } from 'date-fns';

type VaccinationRecord = {
  id: string;
  patient_name: string;
  vaccine_name: string;
  dose_number: number;
  dose_date: string;
  next_dose_date: string | null;
  administered_by: string;
  lot_number: string;
  status: 'completed' | 'pending' | 'missed';
};

export default function VaccinationCard() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<VaccinationRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Add a ref to track if the component is still mounted
  const isMounted = useRef(true);
  const componentRef = useRef<HTMLDivElement>(null);
  // Initialize Supabase client inside the component
  const supabase = useMemo(() => createClient(), []);

  // Memoize the fetch function to prevent unnecessary re-creations
  const fetchVaccinationRecords = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error(authError?.message || 'You must be logged in to view vaccination records');
      }

        // In a real app, you would fetch this from your database
        // This is a mock implementation
        const mockRecords: VaccinationRecord[] = [
          {
            id: '1',
            patient_name: 'John Doe',
            vaccine_name: 'Anti-Rabies Vaccine',
            dose_number: 1,
            dose_date: '2023-10-15',
            next_dose_date: '2023-10-22',
            administered_by: 'Dr. Jane Smith',
            lot_number: 'ARV-2023-001',
            status: 'completed'
          },
          {
            id: '2',
            patient_name: 'John Doe',
            vaccine_name: 'Anti-Rabies Vaccine',
            dose_number: 2,
            dose_date: '2023-10-22',
            next_dose_date: '2023-11-05',
            administered_by: 'Dr. Jane Smith',
            lot_number: 'ARV-2023-001',
            status: 'pending'
          },
          {
            id: '3',
            patient_name: 'John Doe',
            vaccine_name: 'Anti-Rabies Vaccine',
            dose_number: 3,
            dose_date: '2023-11-05',
            next_dose_date: null,
            administered_by: '',
            lot_number: '',
            status: 'pending'
          }
        ];

        setRecords(mockRecords);
      } catch (err) {
        console.error('Error fetching vaccination records:', err);
        if (isMounted.current) {
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          setError(errorMessage);
          setLoading(false);
        }
      }
  }, [supabase]);

  useEffect(() => {
    fetchVaccinationRecords();
    // Cleanup function to prevent memory leaks
    return () => {
      // Any cleanup if needed
    };
  }, [fetchVaccinationRecords]);

  const handlePrint = useReactToPrint({
    pageStyle: `
      @page { size: auto; margin: 10mm; }
      @media print { 
        body { -webkit-print-color-adjust: exact; } 
      }
    `,
    // @ts-expect-error - The type definition is incorrect, but this works with the actual library
    content: () => componentRef.current,
    documentTitle: 'Vaccination-Card',
    removeAfterPrint: true,
    onAfterPrint: () => {}
  });

  const handleDownload = () => {
    // This is a simplified version. In a real app, you might want to generate a PDF
    const blob = new Blob([document.getElementById('vaccination-card')?.innerHTML || ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vaccination-card.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="ml-2">Loading vaccination records...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">E-Vaccination Card</h2>
          <p className="text-muted-foreground">
            View and manage your vaccination records
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6" id="vaccination-card" ref={componentRef}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vaccination Card</h1>
            <p className="text-sm text-gray-500">WeCare Clinic - Anti-Rabies Vaccination</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Issued on</div>
            <div className="font-medium">{format(new Date(), 'MMMM d, yyyy')}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="text-lg font-semibold mb-2">Patient Information</h2>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {records[0]?.patient_name || 'N/A'}</div>
              <div><span className="font-medium">Date of Birth:</span> January 1, 1990</div>
              <div><span className="font-medium">Gender:</span> Male</div>
              <div><span className="font-medium">Contact:</span> +1 (555) 123-4567</div>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-2">Vaccination Status</h2>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  records.some(r => r.status === 'completed') ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span>Vaccination {records.some(r => r.status === 'completed') ? 'In Progress' : 'Not Started'}</span>
              </div>
              <div className="text-sm text-gray-600">
                {records.filter(r => r.status === 'completed').length} of {records.length} doses completed
              </div>
              {records.some(r => r.next_dose_date && new Date(r.next_dose_date) > new Date()) && (
                <div className="text-sm text-gray-600">
                  Next dose due: {format(new Date(records.find(r => r.next_dose_date)?.next_dose_date || ''), 'MMMM d, yyyy')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Vaccination Record</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dose
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vaccine
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Administered By
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.dose_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.vaccine_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(record.dose_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.administered_by || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : record.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h2 className="text-lg font-semibold mb-2">Important Notes</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Keep this card in a safe place and present it at each vaccination visit.</li>
            <li>Complete all recommended doses for full protection.</li>
            <li>Report any adverse reactions to your healthcare provider immediately.</li>
            <li>This card is an official record of your vaccinations.</li>
          </ul>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>WeCare Clinic - Providing quality healthcare services</p>
          <p>123 Health St, Medical City, 1000 • (02) 8123-4567 • wecare@clinic.com</p>
        </div>
      </div>
    </div>
  );
}
