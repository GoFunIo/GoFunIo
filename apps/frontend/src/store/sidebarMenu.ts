import { Bell, CarFront, History, LayoutDashboard, Settings, Wrench } from 'lucide-react';

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
      title: 'Oś czasu',
      href: `${baseRoute}/timeline`,
      icon: History,
    },
    {
      id: 5,
      title: 'Alerty',
      href: `${baseRoute}/notifications`,
      icon: Bell,
    },
  ],
  [
    {
      id: 6,
      title: 'Ustawienia',
      href: `${baseRoute}/settings`,
      icon: Settings,
    },
  ],
];
