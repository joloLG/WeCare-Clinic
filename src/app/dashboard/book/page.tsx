'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ExclamationCircleIcon } from '@heroicons/react/20/solid';

type FormData = {
  // Personal Information
  name: string;
  address: string;
  age: string;
  birthday: string;
  sex: string;
  civilStatus: string;
  contactNumber: string;
  
  // Bite Information
  dateBites: string;
  timeOfBite: string;
  addressOfBite: string;
  
  // Animal Information
  animalType: string[];
  animalOwnership: string[];
  animalStatus: string[];
  animalVaccinated: string;
  vaccinatedBy: string;
  vaccinatedByOther: string;
  
  // Wound Management
  woundManagement: string[];
  woundManagementOther: string;
  
  // Allergies
  allergies: string;
};

export default function BookAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    address: '',
    age: '',
    birthday: '',
    sex: '',
    civilStatus: '',
    contactNumber: '',
    dateBites: '',
    timeOfBite: '',
    addressOfBite: '',
    animalType: [],
    animalOwnership: [],
    animalStatus: [],
    animalVaccinated: '',
    vaccinatedBy: '',
    vaccinatedByOther: '',
    woundManagement: [],
    woundManagementOther: '',
    allergies: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      const fieldName = name as keyof Pick<FormData, 'animalType' | 'animalOwnership' | 'animalStatus' | 'woundManagement'>;
      
      setFormData(prev => ({
        ...prev,
        [fieldName]: checked
          ? [...(prev[fieldName] as string[]), value]
          : (prev[fieldName] as string[]).filter((item: string) => item !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to book an appointment');
      }

      // Ensure patient record exists
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!patient) {
        // Try to get user profile info for patient creation
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();

        const { error: insertPatientError } = await supabase
          .from('patients')
          .insert([
            {
              id: user.id,
              first_name: profile?.first_name || formData.name.split(' ')[0] || '',
              last_name: profile?.last_name || formData.name.split(' ').slice(1).join(' ') || '',
            },
          ]);
        if (insertPatientError) throw insertPatientError;
      }

      // Prepare the data for submission
      const submissionData = {
        patient_id: user.id,
        patient_name: formData.name,
        patient_address: formData.address,
        patient_age: formData.age,
        patient_birthday: formData.birthday,
        patient_sex: formData.sex,
        patient_civil_status: formData.civilStatus,
        patient_contact_number: formData.contactNumber,
        date_bites: formData.dateBites,
        time_of_bite: formData.timeOfBite,
        address_of_bite: formData.addressOfBite,
        animal_type: formData.animalType,
        animal_ownership: formData.animalOwnership,
        animal_status: formData.animalStatus,
        animal_vaccinated: formData.animalVaccinated,
        vaccinated_by: formData.vaccinatedBy === 'Others' ? formData.vaccinatedByOther : formData.vaccinatedBy,
        wound_management: formData.woundManagement,
        allergies: formData.allergies,
        status: 'pending',
      };

      // Insert the appointment into the database
      const { error } = await supabase
        .from('appointments')
        .insert([submissionData]);

      if (error) throw error;

      // Redirect to success page or dashboard
      router.push('/dashboard?success=Appointment booked successfully');
    } catch (err) {
      console.error('Error submitting form:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while booking your appointment';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Personal Information</h3>
              <p className="mt-1 text-sm text-gray-500">Please provide your personal details.</p>
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Complete Address <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <textarea
                    id="address"
                    name="address"
                    rows={3}
                    required
                    value={formData.address}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                  Age <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="age"
                    name="age"
                    required
                    min="0"
                    value={formData.age}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">
                  Birthday <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    id="birthday"
                    name="birthday"
                    required
                    value={formData.birthday}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="sex" className="block text-sm font-medium text-gray-700">
                  Sex <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <select
                    id="sex"
                    name="sex"
                    required
                    value={formData.sex}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="civilStatus" className="block text-sm font-medium text-gray-700">
                  Civil Status <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <select
                    id="civilStatus"
                    name="civilStatus"
                    required
                    value={formData.civilStatus}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                    <option value="Divorced">Divorced</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="contactNumber" className="block text-sm font-medium text-gray-700">
                  Contact Number <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="tel"
                    id="contactNumber"
                    name="contactNumber"
                    required
                    value={formData.contactNumber}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="e.g. 09123456789"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Bite Information</h3>
              <p className="mt-1 text-sm text-gray-500">Details about the bite incident.</p>
            </div>

            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="dateBites" className="block text-sm font-medium text-gray-700">
                  Date of Bite <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="date"
                    id="dateBites"
                    name="dateBites"
                    required
                    value={formData.dateBites}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="timeOfBite" className="block text-sm font-medium text-gray-700">
                  Time of Bite <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="time"
                    id="timeOfBite"
                    name="timeOfBite"
                    required
                    value={formData.timeOfBite}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="addressOfBite" className="block text-sm font-medium text-gray-700">
                  Address Where Bite Occurred <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="addressOfBite"
                    name="addressOfBite"
                    required
                    value={formData.addressOfBite}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Street, Barangay, City/Municipality, Province"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700">
                    Type of Animal <span className="text-red-500">*</span>
                  </legend>
                  <div className="mt-2 space-y-2">
                    {['Dog', 'Cat', 'Others'].map((animal) => (
                      <div key={animal} className="relative flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            id={`animal-${animal}`}
                            name="animalType"
                            type="checkbox"
                            value={animal}
                            checked={formData.animalType.includes(animal)}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor={`animal-${animal}`} className="font-medium text-gray-700">
                            {animal}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="sm:col-span-6">
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700">
                    Ownership <span className="text-red-500">*</span>
                  </legend>
                  <div className="mt-2 grid grid-cols-1 gap-y-2 sm:grid-cols-2">
                    {['Leashed', 'Unleashed', 'Neighbor', 'Stray', 'Owned'].map((ownership) => (
                      <div key={ownership} className="relative flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            id={`ownership-${ownership}`}
                            name="animalOwnership"
                            type="checkbox"
                            value={ownership}
                            checked={formData.animalOwnership.includes(ownership)}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor={`ownership-${ownership}`} className="font-medium text-gray-700">
                            {ownership}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="sm:col-span-6">
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700">
                    Status at the Time of Bite <span className="text-red-500">*</span>
                  </legend>
                  <div className="mt-2 grid grid-cols-1 gap-y-2 sm:grid-cols-2">
                    {['Healthy', 'Sick', 'Killed', 'Died'].map((status) => (
                      <div key={status} className="relative flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            id={`status-${status}`}
                            name="animalStatus"
                            type="checkbox"
                            value={status}
                            checked={formData.animalStatus.includes(status)}
                            onChange={handleChange}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor={`status-${status}`} className="font-medium text-gray-700">
                            {status}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>

              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">
                  Animal Vaccinated in the past 12 Months? <span className="text-red-500">*</span>
                </label>
                <div className="mt-2 space-y-2">
                  {['Yes', 'No'].map((option) => (
                    <div key={option} className="flex items-center">
                      <input
                        id={`vaccinated-${option}`}
                        name="animalVaccinated"
                        type="radio"
                        value={option}
                        checked={formData.animalVaccinated === option}
                        onChange={handleChange}
                        className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        required
                      />
                      <label htmlFor={`vaccinated-${option}`} className="ml-2 block text-sm text-gray-700">
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.animalVaccinated === 'Yes' && (
                <div className="sm:col-span-6">
                  <label className="block text-sm font-medium text-gray-700">
                    Vaccinated by Whom? <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-2 space-y-2">
                    {['BRGY', 'DOH', 'Others'].map((source) => (
                      <div key={source} className="flex items-center">
                        <input
                          id={`vaccinatedBy-${source}`}
                          name="vaccinatedBy"
                          type="radio"
                          value={source}
                          checked={formData.vaccinatedBy === source}
                          onChange={handleChange}
                          className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          required={formData.animalVaccinated === 'Yes'}
                        />
                        <label htmlFor={`vaccinatedBy-${source}`} className="ml-2 block text-sm text-gray-700">
                          {source}
                        </label>
                      </div>
                    ))}
                  </div>

                  {formData.vaccinatedBy === 'Others' && (
                    <div className="mt-2">
                      <input
                        type="text"
                        name="vaccinatedByOther"
                        value={formData.vaccinatedByOther}
                        onChange={handleChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Please specify"
                        required
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium leading-6 text-gray-900">Wound Management</h3>
              <p className="mt-1 text-sm text-gray-500">How was the wound managed after the bite?</p>
            </div>

            <div className="space-y-6">
              <fieldset>
                <legend className="sr-only">Wound Management</legend>
                <div className="space-y-2">
                  {[
                    'None',
                    'Washed with soap',
                    'Alcohol, iodine, other antiseptic',
                    'Herbal/Traditional',
                    'Antibiotics/Dose/Duration',
                    'Other Treatment',
                  ].map((treatment) => (
                    <div key={treatment} className="relative flex items-start">
                      <div className="flex h-5 items-center">
                        <input
                          id={`wound-${treatment}`}
                          name="woundManagement"
                          type="checkbox"
                          value={treatment}
                          checked={formData.woundManagement.includes(treatment)}
                          onChange={handleChange}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`wound-${treatment}`} className="font-medium text-gray-700">
                          {treatment}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>

              {(formData.woundManagement.includes('Herbal/Traditional') || 
                formData.woundManagement.includes('Antibiotics/Dose/Duration') ||
                formData.woundManagement.includes('Other Treatment')) && (
                <div>
                  <label htmlFor="woundManagementOther" className="block text-sm font-medium text-gray-700">
                    Please specify
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="woundManagementOther"
                      name="woundManagementOther"
                      value={formData.woundManagementOther}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Please provide details"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="allergies" className="block text-sm font-medium text-gray-700">
                  Allergies (Food, Drugs, etc.)
                </label>
                <div className="mt-1">
                  <textarea
                    id="allergies"
                    name="allergies"
                    rows={3}
                    value={formData.allergies}
                    onChange={handleChange}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="List any known allergies or type 'None' if none"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
          Book an Appointment
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Fill out the form below to schedule your anti-rabies vaccination appointment.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6">
            <nav className="flex items-center justify-center" aria-label="Progress">
              <ol role="list" className="flex items-center space-x-5">
                {[1, 2, 3].map((stepNumber) => (
                  <li key={stepNumber}>
                    {stepNumber < step ? (
                      <div className="block h-2.5 w-2.5 rounded-full bg-indigo-600 hover:bg-indigo-900">
                        <span className="sr-only">Step {stepNumber}</span>
                      </div>
                    ) : stepNumber === step ? (
                      <div className="relative flex items-center justify-center" aria-current="step">
                        <span className="absolute flex h-5 w-5 p-px" aria-hidden="true">
                          <span className="h-full w-full rounded-full bg-indigo-200" />
                        </span>
                        <span className="relative block h-2.5 w-2.5 rounded-full bg-indigo-600" aria-hidden="true" />
                        <span className="sr-only">Step {stepNumber}</span>
                      </div>
                    ) : (
                      <div className="block h-2.5 w-2.5 rounded-full bg-gray-200 hover:bg-gray-400">
                        <span className="sr-only">Step {stepNumber}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <div className="mt-4 text-center text-sm font-medium text-gray-500">
              Step {step} of 3
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {renderStep()}

            <div className="mt-8 flex justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Previous
                </button>
              ) : (
                <div></div>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Submit Appointment'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
