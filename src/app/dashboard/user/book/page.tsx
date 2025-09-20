"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from '@/utils/supabase/client';
import { addMinutes, format } from 'date-fns';
import { useTheme } from 'next-themes';
import { UserLayout } from '@/components/user/UserLayout'; // Import the new layout component

type FormData = {
  name: string;
  address: string;
  age: string;
  birthday: string;
  sex: string;
  civilStatus: string;
  contactNumber: string;
  dateBites: string;
  timeOfBite: string;
  addressOfBite: string;
  animalType: string[];
  animalOwnership: string[];
  animalStatus: string[];
  animalVaccinated: string;
  vaccinatedBy: string;
  vaccinatedByOther: string;
  woundManagement: string[];
  woundManagementOther: string;
  allergies: string;
  end_time?: string;
};

export default function BookAppointmentPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
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

  const upsertProfile = async (userId: string, profileData: FormData, existingProfile: any) => {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        first_name: profileData.name.split(' ')[0] || existingProfile?.first_name || '',
        last_name: profileData.name.split(' ').slice(1).join(' ') || existingProfile?.last_name || '',
        phone_number: profileData.contactNumber || existingProfile?.phone_number || null,
        address: profileData.address || existingProfile?.address || null,
        date_of_birth: profileData.birthday || existingProfile?.date_of_birth || null,
        sex: profileData.sex || existingProfile?.sex || null,
        civil_status: profileData.civilStatus || existingProfile?.civil_status || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) throw error;
  };

  const upsertPatient = async (userId: string, profileData: FormData, existingPatient: any) => {
    // Upsert patient-specific data.
    // The schema has redundant name columns, so we populate them.
    // Blood type is not on this form, so we preserve the existing value.
    const { error } = await supabase
      .from('patients')
      .upsert({
        id: userId,
        first_name: profileData.name.split(' ')[0] || '',
        last_name: profileData.name.split(' ').slice(1).join(' ') || '',
        blood_type: existingPatient?.blood_type || null, // Preserve existing blood type
      }, { onConflict: 'id', ignoreDuplicates: false });

    if (error) throw error;
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

      // Get existing profile to use as fallback
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone_number, address, date_of_birth, sex, civil_status')
        .eq('id', user.id)
        .single();

      // Get existing patient data to preserve blood_type
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('blood_type')
        .eq('id', user.id)
        .single();

      // Upsert profile and patient records
      await upsertProfile(user.id, formData, existingProfile);
      await upsertPatient(user.id, formData, existingPatient);

      const appointmentDate = formData.dateBites || new Date().toISOString().slice(0, 10);
      const startTime = formData.timeOfBite || '09:00';
      const startDateTime = new Date(`${appointmentDate}T${startTime}`);
      // Default duration of 30 minutes
      const endDateTime = addMinutes(startDateTime, 30);

      const submissionData = {
        patient_id: user.id,
        vaccine_id: null, // To be selected by admin later
        appointment_date: appointmentDate,
        start_time: startTime,
        end_time: format(endDateTime, 'HH:mm:ss'), // Ensure end_time is not null
        status: 'scheduled',
        reason: '',
        notes: '',
        address_of_bite: formData.addressOfBite,
        date_bites: formData.dateBites || null, // DATE
        time_of_bite: formData.timeOfBite || null, // TIME
        animal_type: Array.isArray(formData.animalType) ? formData.animalType.join(',') : formData.animalType || '',
        animal_ownership: Array.isArray(formData.animalOwnership) ? formData.animalOwnership.join(',') : formData.animalOwnership || '',
        animal_status: Array.isArray(formData.animalStatus) ? formData.animalStatus.join(',') : formData.animalStatus || '',
        animal_vaccinated: formData.animalVaccinated,
        vaccinated_by: formData.vaccinatedBy === 'Others' ? formData.vaccinatedByOther : formData.vaccinatedBy,
        wound_management: Array.isArray(formData.woundManagement) ? formData.woundManagement.join(',') : formData.woundManagement || '',
        allergies: formData.allergies,
      };

      const { error } = await supabase
        .from('appointments')
        .insert([submissionData]);
      if (error) throw error;
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
    const headingClasses = `text-lg font-medium leading-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`;
    const paragraphClasses = `mt-1 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`;
    const labelClasses = `block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`;
    const inputClasses = `block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`;
    const selectClasses = `block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`;
    const textareaClasses = `block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${theme === 'dark' ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'}`;
    const checkboxClasses = `h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`;
    const radioClasses = `h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500 ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`;
    
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className={headingClasses}>Personal Information</h3>
              <p className={paragraphClasses}>Please provide your personal details.</p>
            </div>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="name" className={labelClasses}>
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
                    className={inputClasses}
                  />
                </div>
              </div>
              <div className="sm:col-span-6">
                <label htmlFor="address" className={labelClasses}>
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
                    className={textareaClasses}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="age" className={labelClasses}>
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
                    className={inputClasses}
                  />
                </div>
              </div>
              <div className="sm:col-span-4">
                <label htmlFor="birthday" className={labelClasses}>
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
                    className={inputClasses}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="sex" className={labelClasses}>
                  Sex <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <select
                    id="sex"
                    name="sex"
                    required
                    value={formData.sex}
                    onChange={handleChange}
                    className={selectClasses}
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
                <label htmlFor="civilStatus" className={labelClasses}>
                  Civil Status <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <select
                    id="civilStatus"
                    name="civilStatus"
                    required
                    value={formData.civilStatus}
                    onChange={handleChange}
                    className={selectClasses}
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
                <label htmlFor="contactNumber" className={labelClasses}>
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
                    className={inputClasses}
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
              <h3 className={headingClasses}>Bite Information</h3>
              <p className={paragraphClasses}>Details about the bite incident.</p>
            </div>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="dateBites" className={labelClasses}>
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
                    className={inputClasses}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="timeOfBite" className={labelClasses}>
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
                    className={inputClasses}
                  />
                </div>
              </div>
              <div className="sm:col-span-6">
                <label htmlFor="addressOfBite" className={labelClasses}>
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
                    className={inputClasses}
                    placeholder="Street, Barangay, City/Municipality, Province"
                  />
                </div>
              </div>
              <div className="sm:col-span-6">
                <fieldset>
                  <legend className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
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
                            className={checkboxClasses}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor={`animal-${animal}`} className={labelClasses}>
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
                  <legend className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
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
                            className={checkboxClasses}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor={`ownership-${ownership}`} className={labelClasses}>
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
                  <legend className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
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
                            className={checkboxClasses}
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor={`status-${status}`} className={labelClasses}>
                            {status}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="sm:col-span-6">
                <label className={labelClasses}>
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
                        className={radioClasses}
                        required
                      />
                      <label htmlFor={`vaccinated-${option}`} className={`ml-2 block text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              {formData.animalVaccinated === 'Yes' && (
                <div className="sm:col-span-6">
                  <label className={labelClasses}>
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
                          className={radioClasses}
                          required={formData.animalVaccinated === 'Yes'}
                        />
                        <label htmlFor={`vaccinatedBy-${source}`} className={`ml-2 block text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
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
                        className={inputClasses}
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
              <h3 className={headingClasses}>Wound Management</h3>
              <p className={paragraphClasses}>How was the wound managed after the bite?</p>
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
                          className={checkboxClasses}
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <label htmlFor={`wound-${treatment}`} className={labelClasses}>
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
                  <label htmlFor="woundManagementOther" className={labelClasses}>
                    Please specify
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="woundManagementOther"
                      name="woundManagementOther"
                      value={formData.woundManagementOther}
                      onChange={handleChange}
                      className={inputClasses}
                      placeholder="Please provide details"
                    />
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="allergies" className={labelClasses}>
                  Allergies (Food, Drugs, etc.)
                </label>
                <div className="mt-1">
                  <textarea
                    id="allergies"
                    name="allergies"
                    rows={3}
                    value={formData.allergies}
                    onChange={handleChange}
                    className={textareaClasses}
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

  const formContainerClasses = `w-full max-w-2xl mx-auto mt-8 mb-8 p-6 rounded-xl shadow-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
  const formHeadingClasses = `text-2xl font-bold mb-2 ${theme === 'dark' ? 'text-red-500' : 'text-red-700'}`;
  const formParagraphClasses = `mb-6 text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`;
  const errorContainerClasses = `rounded-md p-4 mb-4 ${theme === 'dark' ? 'bg-red-900' : 'bg-red-50'}`;
  const errorTextClasses = `text-sm font-medium ${theme === 'dark' ? 'text-red-200' : 'text-red-800'}`;
  const formSectionClasses = `overflow-hidden ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`;
  const stepCircleClasses = (stepNumber: number) => {
    if (stepNumber < step) {
      return `block h-2.5 w-2.5 rounded-full ${theme === 'dark' ? 'bg-red-400' : 'bg-red-600'} hover:bg-red-900`;
    } else if (stepNumber === step) {
      return `relative flex items-center justify-center h-2.5 w-2.5`;
    } else {
      return `block h-2.5 w-2.5 rounded-full ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} hover:bg-gray-400`;
    }
  };

  return (
    <UserLayout>
      <div className={formContainerClasses}>
        <h2 className={formHeadingClasses}>Book an Appointment</h2>
        <p className={formParagraphClasses}>Fill out the form below to schedule your anti-rabies vaccination appointment.</p>
        {error && (
          <div className={errorContainerClasses}>
            <div className="flex">
              <div className="flex-shrink-0">
                <span className={`h-5 w-5 ${theme === 'dark' ? 'text-red-300' : 'text-red-400'}`}>!</span>
              </div>
              <div className="ml-3">
                <h3 className={errorTextClasses}>Error</h3>
                <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className={formSectionClasses}>
          <div className="mb-6">
            <nav className="flex items-center justify-center" aria-label="Progress">
              <ol role="list" className="flex items-center space-x-5">
                {[1, 2, 3].map((stepNumber) => (
                  <li key={stepNumber}>
                    <div className={stepCircleClasses(stepNumber)} aria-current={stepNumber === step ? "step" : undefined}>
                      {stepNumber === step ? (
                        <>
                          <span className="absolute flex h-5 w-5 p-px" aria-hidden="true">
                            <span className={`h-full w-full rounded-full ${theme === 'dark' ? 'bg-red-800' : 'bg-red-200'}`} />
                          </span>
                          <span className={`relative block h-2.5 w-2.5 rounded-full ${theme === 'dark' ? 'bg-red-400' : 'bg-red-600'}`} aria-hidden="true" />
                          <span className="sr-only">Step {stepNumber}</span>
                        </>
                      ) : (
                        <>
                          <div className={stepCircleClasses(stepNumber)}>
                            <span className="sr-only">Step {stepNumber}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </nav>
            <div className={`mt-4 text-center text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
                  className={`inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 border-gray-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
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
                  className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${theme === 'dark' ? 'bg-red-500 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark' ? 'bg-red-500 hover:bg-red-600' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {loading ? 'Submitting...' : 'Submit Appointment'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </UserLayout>
  );
}