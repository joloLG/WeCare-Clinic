import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function BookingSuccess() {
  return (
    <div className="text-center py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <CheckCircleIcon className="h-8 w-8 text-green-600" aria-hidden="true" />
      </div>
      <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
        Appointment Booked Successfully!
      </h2>
      <p className="mt-4 text-lg text-gray-600">
        Thank you for booking your anti-rabies vaccination appointment with WeCare Clinic.
      </p>
      <p className="mt-2 text-gray-600">
        We&apos;ve sent a confirmation to your email with all the details.
      </p>
      <div className="mt-10 flex items-center justify-center gap-x-6">
        <Link
          href="/dashboard"
          className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Back to Dashboard
        </Link>
        <Link
          href="/dashboard/history"
          className="text-sm font-semibold text-gray-900 hover:text-indigo-600"
        >
          View Appointment History <span aria-hidden="true">→</span>
        </Link>
      </div>
      <div className="mt-10 border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900">What to bring to your appointment:</h3>
        <ul className="mt-4 space-y-2 text-gray-600">
          <li className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            Valid ID (Government-issued)
          </li>
          <li className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            Any previous vaccination records
          </li>
          <li className="flex items-center">
            <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
            Face mask (required for entry)
          </li>
        </ul>
      </div>
    </div>
  );
}
