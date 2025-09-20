import { LayoutDashboard, Users, Calendar, FileText } from 'lucide-react';

import { SVGProps, ComponentType } from 'react';

export interface NavItem {
  title: string;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  role?: string[]; // Optional: restrict to specific roles
  disabled?: boolean;
}

export const adminNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Appointments',
    href: '/dashboard/admin/appointments',
    icon: Calendar,
  },
  {
    title: 'Patients',
    href: '/dashboard/admin/patients',
    icon: Users,
  },
  {
    title: 'Vaccine Inventory',
    href: '/dashboard/admin/inventory',
    icon: FileText,
  },
  {
    title: 'Messages',
    href: '/dashboard/admin/messages',
    icon: LayoutDashboard,
  },
];
