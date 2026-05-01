import {
  Bell,
  CarFront,
  CreditCard,
  History,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react';

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
    {
      id: 6,
      title: 'Ustawienia',
      href: `${baseRoute}/settings`,
      icon: Settings,
    },
  ],
  [
    {
      id: 7,
      title: 'Płatność',
      href: `${baseRoute}/payments`,
      icon: CreditCard,
    },
    {
      id: 8,
      title: 'Admin',
      href: `${baseRoute}/admin`,
      icon: Shield,
    },
    {
      id: 9,
      title: 'Użytkownicy',
      href: `${baseRoute}/users`,
      icon: Users,
    },
    {
      id: 10,
      title: 'Przypisanie pojazdów',
      href: `${baseRoute}/vehicle-assignments`,
      icon: Warehouse,
    },
  ],
];
