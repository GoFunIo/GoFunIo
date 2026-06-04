import { CarFront, Plus } from 'lucide-react';

const timeline = {
  id: 1,
  date: '03.04.2026',
  title: 'Pełny serwis',
  brand: 'BMW',
  model: 'Seria 5 (E60)',
  registrationNumber: 'SJ 0776A',
  servicePlace: 'Auto Krakow',
  notes: 'Wymiana rozrządu',
  price: 1850,
};

// POPRAWIONE: dopasowanie kluczy do AddVehicleInputs
const car = {
  id: 1,
  brand: 'BMW',
  model: 'Seria 5 (E60)',
  productionYear: '2004',
  fuelType: 'Diesel',
  registrationNumber: 'SJ 0776A',
  currentMileage: 310000,
  vin: 'WBAAF71040BXXXXXX',
  purchaseDate: '2022-05-15',
  ocExpiry: '2026-11-20',
  acExpiry: '2026-07-20',
  technicalInspectionExpiry: '2026-06-18',
  notes: 'Samochód służbowy — zadbany, regularnie serwisowany.',
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

const reminder = {
  id: 1,
  car: 'BMW',
  plate: 'SJ 0776A',
  termin: 7,
};

export const activityArr = Array.from({ length: 6 }, (_, i) => ({ ...activity, id: i + 1 }));
export const carSingleArr = Array.from({ length: 2 }, (_, i) => ({ ...carSingle, id: i + 1 }));
export const infoArr = Array.from({ length: 3 }, (_, i) => ({ ...info, id: i + 1 }));
export const actionsArr = Array.from({ length: 3 }, (_, i) => ({ ...actions, id: i + 1 }));
export const carsArr = Array.from({ length: 15 }, (_, i) => ({ ...car, id: i + 1 }));
export const timelineArr = Array.from({ length: 5 }, (_, i) => ({ ...timeline, id: i + 1 }));
export const reminderArr = Array.from({ length: 5 }, (_, i) => ({ ...reminder, id: i + 1 }));
