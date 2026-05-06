import { CarFront, Plus } from 'lucide-react';

const car = {
  id: 1,
  title: 'BMW',
  year: '2004',
  fuel: 'Gas',
  registration: 'SJ 0776A',
  mileage: 310000,
  vti: 18,
};

const activity = {
  id: 1,
  title: 'Pełny serwis',
  car: 'BMW E60',
  date: '3 kwi 2026',
  price: '1850.00',
  place: 'BMW Serwis Kraków',
};

const info = {
  id: 1,
  title: 'Moje pojazdy',
  count: 3,
  subtitle: 'aktywnych',
  status: 'default',
  icon: CarFront,
};

const carSingle = {
  id: 1,
  title: 'BMW',
  termin: 31,
};

const actions = {
  id: 1,
  title: 'Dodaj pojazd',
  onClick: () => {},
  icon: Plus,
};

export const activityArr = Array.from({ length: 6 }, (_, i) => ({ ...activity, id: i + 1 }));
export const carSingleArr = Array.from({ length: 2 }, (_, i) => ({ ...carSingle, id: i + 1 }));
export const infoArr = Array.from({ length: 3 }, (_, i) => ({ ...info, id: i + 1 }));
export const actionsArr = Array.from({ length: 3 }, (_, i) => ({ ...actions, id: i + 1 }));
export const carsArr = Array.from({ length: 5 }, (_, i) => ({ ...car, id: i + 1 }));
