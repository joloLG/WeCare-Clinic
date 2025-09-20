import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Download, User } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { Options } from 'html2canvas';

interface VaccinationRecord {
  vaccine_name: string;
  dose_number: number;
  date_administered: string;
  administered_by: string;
  next_vaccination_date: string | null;
}

interface VaccinationCardData {
  patient_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  date_of_birth: string;
  sex: string | null;
  blood_type: string | null;
  vaccination_status: string;
  avatar_url: string | null;
  vaccination_history: VaccinationRecord[];
}

export default function VaccinationCard() {
  const [loading, setLoading] = useState(true);
  const [cardData, setCardData] = useState<VaccinationCardData | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchVaccinationData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { data, error } = await supabase
          .from('e_vaccination_card_view')
          .select('*')
          .eq('patient_id', user.id)
          .single();

        if (error) throw error;
        setCardData(data);
      } catch (error) {
        console.error('Error fetching vaccination data:', error);
        toast.error('Failed to load vaccination data');
      } finally {
        setLoading(false);
      }
    };

    fetchVaccinationData();
  }, [supabase]);

  const downloadCard = async () => {
    if (!cardRef.current) return;
    
    try {
      // Create a new div to hold our cloned content
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '0';
      container.style.width = '100%';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
      
      // Clone the card and apply styles to avoid lab() color function
      const cardClone = cardRef.current.cloneNode(true) as HTMLElement;
      
      // Apply styles that don't use lab()
      const style = document.createElement('style');
      style.textContent = `
        * {
          color: #000000 !important;
          background-color: #ffffff !important;
          background-image: none !important;
        }
        .bg-red-700 {
          background-color: #b91c1c !important;
        }
        .bg-green-50 {
          background-color: #f0fdf4 !important;
        }
        .bg-gray-50 {
          background-color: #f9fafb !important;
        }
        .text-green-600 {
          color: #16a34a !important;
        }
        .text-green-700 {
          color: #15803d !important;
        }
        .text-green-800 {
          color: #166534 !important;
        }
      `;
      
      // Create a style element to force standard colors
      const cardStyle = document.createElement('style');
      cardStyle.textContent = `
        * {
          color: #000000 !important;
          background-color: #ffffff !important;
          background: #ffffff !important;
          border-color: #e5e7eb !important;
        }
        .bg-red-700, .bg-red-700 * {
          background-color: #b91c1c !important;
          background: #b91c1c !important;
          color: #ffffff !important;
        }
        .text-white, .text-white * {
          color: #ffffff !important;
        }
        .border-gray-200, .border-gray-200 * {
          border-color: #e5e7eb !important;
        }
      `;
      
      // Create a new document to avoid style conflicts
      const cardDoc = document.implementation.createHTMLDocument('Vaccination Card');
      cardDoc.head.appendChild(cardStyle);
      cardDoc.body.appendChild(cardClone);
      
      // Add the document to our container
      container.appendChild(cardDoc.documentElement);
      
      // Use html2canvas with the cloned content
      const html2canvas = (await import('html2canvas')).default;
      
      // Define html2canvas options with proper type
      const canvasOptions: Partial<Options> = {
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        ignoreElements: () => false,
        onclone: (clonedDoc: Document) => {
          // Add the style to the cloned document as well
          const styleClone = cardStyle.cloneNode(true);
          clonedDoc.head.appendChild(styleClone);
        }
      };
      
      // Render the card with forced colors
      const canvas = await html2canvas(cardClone, canvasOptions);
      
      // Clean up
      document.body.removeChild(container);
      
      // Create download link
      const link = document.createElement('a');
      const name = cardData ? `vaccination-card-${cardData.first_name}-${cardData.last_name}` : 'vaccination-card';
      link.download = `${name}.png`;
      
      // Create a blob URL to prevent the image from opening in a new tab
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          link.href = url;
          
          // Trigger download without opening the image
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          });
          
          // Append to body, trigger click, and clean up
          document.body.appendChild(link);
          link.dispatchEvent(clickEvent);
          document.body.removeChild(link);
          
          // Revoke the blob URL after download starts
          setTimeout(() => URL.revokeObjectURL(url), 100);
          
          toast.success('Vaccination card downloaded successfully');
        }
      }, 'image/png');
    } catch (error) {
      console.error('Error downloading card:', error);
      toast.error('Failed to download vaccination card');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!cardData) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-600">No vaccination records found.</p>
      </div>
    );
  }

  const latestVaccination = cardData.vaccination_history?.[0];

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">E-Vaccination Card</h1>
        <Button onClick={downloadCard} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Download Card
        </Button>
      </div>

      {/* Vaccination Card */}
      <div className="w-full max-w-[600px] mx-auto mb-8">
        <div 
          ref={cardRef} 
          className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 w-full mx-auto print:absolute print:w-[3in] print:h-[4in] print:m-0 print:border-0 print:shadow-none"
          style={{
            maxWidth: '600px',
            position: 'relative',
            minHeight: '500px',
            height: 'calc(100vh - 200px)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
        {/* Card Header */}
        <div className="bg-red-700 text-white p-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Vaccination Card</h2>
              <p className="text-sm opacity-80">WeCare Animal Bite Clinic</p>
            </div>
            <div className="bg-white p-1 rounded-full overflow-hidden w-12 h-12 border-2 border-white shadow">
              {cardData.avatar_url ? (
                <Image 
                  src={cardData.avatar_url} 
                  alt="Profile" 
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to default avatar if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-500" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Patient Info */}
        <div className="p-3 sm:p-4 border-b flex-1 overflow-y-auto">
          <h3 className="font-semibold text-gray-700 text-sm sm:text-base mb-3">PATIENT INFORMATION</h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 text-xs sm:text-sm">
            <div>
              <p className="text-gray-500">Name</p>
              <p className="font-medium">{`${cardData.first_name} ${cardData.middle_name ? cardData.middle_name + ' ' : ''}${cardData.last_name}`}</p>
            </div>
            <div>
              <p className="text-gray-500">Date of Birth</p>
              <p className="font-medium">{format(new Date(cardData.date_of_birth), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-gray-500">Sex</p>
              <p className="font-medium">{cardData.sex || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-500">Blood Type</p>
              <p className="font-medium">{cardData.blood_type || 'N/A'}</p>
            </div>
          </div>
        </div>

        {/* Vaccination Status */}
        <div className="p-3 sm:p-4 border-b flex-shrink-0">
          <h3 className="font-semibold text-gray-700 text-sm sm:text-base mb-2">VACCINATION STATUS</h3>
          <div className="bg-green-50 p-3 rounded-md">
            <p className="text-green-800 font-medium text-sm sm:text-base">{cardData.vaccination_status}</p>
            {latestVaccination && (
              <p className="text-xs sm:text-sm text-green-700 mt-1">
                Last dose: {format(new Date(latestVaccination.date_administered), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto p-2 sm:p-3 bg-gray-50 border-t text-center text-[10px] xs:text-xs text-gray-500 flex-shrink-0">
          <p>This is an official vaccination record. Keep this card safe.</p>
        </div>
      </div>

      {/* Additional Information */}
      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">Important Information</h3>
        <ul className="list-disc pl-5 space-y-2 text-blue-700 text-sm">
          <li>Always carry this card with you as proof of vaccination.</li>
          <li>Keep the card in a safe place and avoid getting it wet or damaged.</li>
          <li>Present this card when receiving additional doses or medical care.</li>
          <li>Report any lost or damaged cards to the health center immediately.</li>
        </ul>
        </div>
      </div>
    </div>
  );
}
