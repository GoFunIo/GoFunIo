import { Activity, CarFront, Plus, Wrench } from 'lucide-react';

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
  fuelType: 'GAS',
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

export const activityArray = [
  {
    id: 1,
    title: 'Pełny serwis',
    car: 'Volkswagen Passat',
    date: '3 kwi 2026',
    price: '1850.00',
    place: 'VW Serwis Kraków',
    type: 'service',
  },
  {
    id: 2,
    title: 'Wymiana oleju',
    car: 'Toyota Corolla',
    date: '19 mar 2026',
    price: '320.00',
    place: 'Auto-Serwis Kowalski',
    type: 'oil',
  },
  {
    id: 3,
    title: 'Przegląd techniczny',
    car: 'Toyota Corolla',
    date: '19 gru 2025',
    price: '99.00',
    place: 'Stacja Diagnostyczna SKP',
    type: 'inspection',
  },
  {
    id: 4,
    title: 'Ubezpieczenie AC',
    car: 'Ford Transit',
    date: '4 mar 2026',
    price: '2450.00',
    place: 'PZU',
    type: 'insurance',
  },
  {
    id: 5,
    title: 'Ubezpieczenie OC',
    car: 'Ford Transit',
    date: '4 mar 2026',
    price: '1950.00',
    place: 'PZU',
    type: 'insurance',
  },
  {
    id: 6,
    title: 'Inny np. wymiana klocków itd',
    car: 'Ford Transit',
    date: '4 mar 2026',
    price: '50.00',
    place: 'Ford-Serwis Warszawa',
    type: 'other',
  },
];

export const actionsArray = [
  {
    id: 1,
    title: 'Dodaj pojazd',
    icon: Plus,
    actionType: 'modal',
  },
  {
    id: 2,
    title: 'Dodaj wpis serwisowy',
    icon: Wrench,
    actionType: 'modal_service',
  },
  {
    id: 3,
    title: 'Oś czasu serwisu',
    icon: Activity,
    actionType: 'link',
    href: '/dashboard/timeline',
  },
];

export const mockCars = [
  {
    id: 1,
    brand: 'BMW',
    model: 'Seria 5 (E60)',
    productionYear: '2004',
    fuelType: 'GAS',
    registrationNumber: 'SJ 0776A',
    currentMileage: 310000,
    vin: 'WBAAF71040BXXXXXX',
    purchaseDate: '2022-05-15',
    ocExpiry: '2026-11-20',
    acExpiry: '2026-06-18',
    technicalInspectionExpiry: '2028-06-18',
    notes: 'Samochód służbowy — zadbany, regularnie serwisowany.',
    vti: 13,
  },
  {
    id: 2,
    brand: 'Toyota',
    model: 'Corolla (E210)',
    productionYear: '2020',
    fuelType: 'HYBRID',
    registrationNumber: 'WI 982XF',
    currentMileage: 85200,
    vin: 'NMTBZ3JE00JXXXXXX',
    purchaseDate: '2020-11-02',
    ocExpiry: '2026-11-01',
    acExpiry: '2026-11-01',
    technicalInspectionExpiry: '2026-11-02',
    notes: 'Główny pojazd flotowy, bardzo ekonomiczny. Tylko autoryzowane serwisy.',
    vti: 150,
  },
  {
    id: 3,
    brand: 'Ford',
    model: 'Transit Custom',
    productionYear: '2018',
    fuelType: 'DIESEL',
    registrationNumber: 'PO 4421M',
    currentMileage: 198500,
    vin: 'WF0XXXTTGXFXXXXXX',
    purchaseDate: '2023-02-10',
    ocExpiry: '2026-06-30',
    acExpiry: '2026-06-07',
    technicalInspectionExpiry: '2026-06-07',
    notes: 'Dostawczak roboczy. Często jeździ przeładowany, kontrolować stan zawieszenia.',
    vti: 2,
  },
  {
    id: 4,
    brand: 'Volkswagen',
    model: 'Passat B8',
    productionYear: '2016',
    fuelType: 'DIESEL',
    registrationNumber: 'KR 772TT',
    currentMileage: 245000,
    vin: 'WVWZZZ3CZGEXXXXXX',
    purchaseDate: '2021-08-19',
    ocExpiry: '2027-01-15',
    acExpiry: '2027-01-15',
    technicalInspectionExpiry: '2026-11-07',
    notes: 'Auto managera. Wymieniony rozrząd przy 210 tys. km.',
    vti: 32,
  },
];
