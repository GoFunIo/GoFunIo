import { Bell, CarFront, LayoutDashboard, Settings, Wrench } from 'lucide-react';

const baseRoute = '/dashboard';

export const sidebar = [
  [
    {
      id: 1,
      title: 'Pulpit',
      href: `${baseRoute}/`,
      icon: LayoutDashboard,
    },
    {
      id: 2,
      title: 'Pojazdy',
      href: `${baseRoute}/my-cars`,
      icon: CarFront,
    },
    {
      id: 3,
      title: 'Serwis',
      href: `${baseRoute}/service`,
      icon: Wrench,
    },
    {
      id: 4,
      title: 'Alerty',
      href: `${baseRoute}/alerts`,
      icon: Bell,
    },
  ],
  [
    {
      id: 5,
      title: 'Ustawienia',
      href: `${baseRoute}/settings`,
      icon: Settings,
    },
  ],
];
