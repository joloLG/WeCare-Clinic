import Link from 'next/link';
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  href: string;
  color?: string;
  trend?: string;
  trendType?: 'increase' | 'decrease' | 'neutral';
}

export function StatCard({
  title,
  value,
  icon,
  href,
  color = 'bg-indigo-600',
  trend,
  trendType = 'neutral',
}: StatCardProps) {
  const trendIcons = {
    increase: '↑',
    decrease: '↓',
    neutral: '→',
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <Link href={href} className="block">
        <div className="px-6 py-5">
          <div className="flex items-start">
            <div className={cn(
              'flex-shrink-0 rounded-md p-3',
              color
            )}>
              {icon}
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-500 truncate">
                {title}
              </p>
              <div className="mt-1 flex items-center">
                <p className="text-2xl font-semibold text-gray-900">
                  {value}
                </p>
                {trend && (
                  <span className={cn(
                    'ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    trendType === 'increase' ? 'bg-green-100 text-green-800' :
                    trendType === 'decrease' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  )}>
                    {trendIcons[trendType]} {trend}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
          <div className="text-sm text-center">
            <span className="font-medium text-indigo-600 hover:text-indigo-500">
              View details
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
