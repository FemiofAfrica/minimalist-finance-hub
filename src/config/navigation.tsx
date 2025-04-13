import { BarChart3, CreditCard, Home, LineChart, Receipt, Settings } from 'lucide-react';

export const sidebarLinks = [
  {
    href: '/',
    icon: <Home className="mr-2 h-4 w-4" />,
    label: 'Dashboard'
  },
  {
    href: '/transactions',
    icon: <Receipt className="mr-2 h-4 w-4" />,
    label: 'Transactions'
  },
  {
    href: '/accounts',
    icon: <CreditCard className="mr-2 h-4 w-4" />,
    label: 'Accounts & Cards'
  },
  {
    href: '/subscriptions',
    icon: <BarChart3 className="mr-2 h-4 w-4" />,
    label: 'Subscriptions'
  },
  {
    href: '/insights',
    icon: <LineChart className="mr-2 h-4 w-4" />,
    label: 'Insights'
  },
  {
    href: '/settings',
    icon: <Settings className="mr-2 h-4 w-4" />,
    label: 'Settings'
  }
];