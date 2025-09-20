'use client';

import { useEffect, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface InventoryItem {
  id: string;
  vaccine_id: string;
  batch_number: string;
  quantity_available: number;
  quantity_reserved: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'expired';
  manufacturing_date: string;
  expiration_date: string;
  supplier?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  vaccine?: {
    name: string;
    description?: string;
    manufacturer?: string;
  };
}

export function InventorySummary() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('vaccine_inventory')
          .select(`
            *,
            vaccine: vaccine_id (id, name, description, manufacturer)
          `)
          .lte('quantity_available', 10)
          .order('quantity_available', { ascending: true })
          .limit(5);

        if (error) throw error;
        setInventory(data || []);
      } catch (err) {
        console.error('Error fetching inventory:', err);
        setError('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();

    // Set up real-time subscription
    const channel = supabase
      .channel('realtime-inventory')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'vaccine_inventory' 
        },
        () => fetchInventory()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      case 'expired':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-red-600">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Low Stock Items
        </h3>
        <Link
          href="/dashboard/admin/inventory"
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="-ml-1 mr-1 h-4 w-4" />
          Manage Inventory
        </Link>
      </div>

      <div className="divide-y divide-gray-200">
        {inventory.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {inventory.map((item) => (
              <li key={item.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <Package className="flex-shrink-0 h-5 w-5 text-gray-400 mr-3" />
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {item.vaccine?.name || 'Unknown Vaccine'}
                        <span className="ml-2 text-xs text-gray-500">
                          (Batch: {item.batch_number})
                        </span>
                      </p>
                    </div>
                    <div className="mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6">
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span className="font-medium">{item.quantity_available}</span>
                        <span className="ml-1">doses available</span>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <span>Expires: {new Date(item.expiration_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-5 sm:p-6 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No low stock items</h3>
            <p className="mt-1 text-sm text-gray-500">
              All inventory items are well stocked.
            </p>
          </div>
        )}
      </div>

      {inventory.length > 0 && (
        <div className="bg-gray-50 px-4 py-4 sm:px-6">
          <div className="text-sm">
            <Link
              href="/dashboard/admin/inventory"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all inventory
              <span aria-hidden="true"> &rarr;</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
