'use client';

import { UserLayout } from '@/components/user/UserLayout';
import dynamic from 'next/dynamic';

// Dynamically import the VaccinationCard component with SSR disabled
const VaccinationCard = dynamic(
  () => import('@/components/vaccination/VaccinationCard'),
  { ssr: false }
);

export default function EVaccinationCardPage() {
  return (
    <UserLayout>
      <VaccinationCard />
    </UserLayout>
  );
}
