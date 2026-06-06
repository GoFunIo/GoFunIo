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
  fuelType: 'Diesel',
  registrationNumber: 'SJ 0776A',
  currentMileage: 310000,
  vin: 'WBAAF71040BXXXXXX',
  purchaseDate: '2022-05-15',
  ocExpiry: '2026-11-20',
  acExpiry: '2026-07-20',
  technicalInspectionExpiry: '2026-06-18',
  notes: 'Samochód służbowy — zadbany, regularnie serwisowany.',
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
    vehicleId: '1',
    notes: 'Wymiana oleju i filtrów',
    car: 'Seria 5 (E60)',
    serviceDate: '2026-04-03',
    cost: 1850.0,
    servicePlace: 'BMW Serwis Kraków',
    serviceType: 'service',
    attachment: null,
  },
  {
    id: 2,
    vehicleId: '2',
    notes: 'Wymiana oleju',
    car: 'Toyota Corolla',
    serviceDate: '2026-03-19',
    cost: 450.0,
    servicePlace: 'Auto-Serwis Kowalski',
    serviceType: 'oil',
    attachment: null,
  },
  {
    id: 3,
    vehicleId: '2',
    notes: 'Układ hamulcowy - klocki i tarcze przód',
    car: 'Toyota Corolla',
    serviceDate: '2026-01-12',
    cost: 380.0,
    servicePlace: 'Auto-Serwis Kowalski',
    serviceType: 'other',
    attachment: null,
  },
  {
    id: 4,
    vehicleId: '2',
    notes: 'Dezynfekcja klimatyzacji i ozonowanie',
    car: 'Toyota Corolla',
    serviceDate: '2025-10-14',
    cost: 180.0,
    servicePlace: 'Klima-Centrum S.C.',
    serviceType: 'other',
    attachment: null,
  },
  {
    id: 5,
    vehicleId: '2',
    notes: 'Zakup wycieraczek i płynu do spryskiwaczy',
    car: 'Toyota Corolla',
    serviceDate: '2025-11-28',
    cost: 270.0,
    servicePlace: 'Sklep Motoryzacyjny CarPart',
    serviceType: 'other',
    attachment: null,
  },
  {
    id: 6,
    vehicleId: '2',
    notes: 'Przegląd techniczny',
    car: 'Toyota Corolla',
    serviceDate: '2025-12-19',
    cost: 99.0,
    servicePlace: 'Stacja Diagnostyczna SKP',
    serviceType: 'inspection',
    attachment: null,
  },
  {
    id: 7,
    vehicleId: '3',
    notes: 'Polisa ubezpieczeniowa AC',
    car: 'Ford Transit',
    serviceDate: '2026-03-04',
    cost: 2450.0,
    servicePlace: 'PZU',
    serviceType: 'insurance_ac',
    attachment: null,
  },
  {
    id: 8,
    vehicleId: '3',
    notes: 'Polisa ubezpieczeniowa OC',
    car: 'Ford Transit',
    serviceDate: '2026-03-04',
    cost: 1950.0,
    servicePlace: 'PZU',
    serviceType: 'insurance_oc',
    attachment: null,
  },
  {
    id: 9,
    vehicleId: '3',
    notes: 'Wymiana opon na letnie',
    car: 'Ford Transit',
    serviceDate: '2026-04-18',
    cost: 180.0,
    servicePlace: 'Wulkanizacja Express',
    serviceType: 'other',
    attachment: null,
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
    fuelType: 'Diesel',
    registrationNumber: 'SJ 0776A',
    currentMileage: 310000,
    vin: 'WBAAF71040BXXXXXX',
    purchaseDate: '2022-05-15',
    ocExpiry: '2026-08-20',
    acExpiry: '2026-06-10',
    technicalInspectionExpiry: '2026-06-12',
    notes: 'Samochód służbowy — zadbany, regularnie serwisowany.',
  },
  {
    id: 2,
    brand: 'Toyota',
    model: 'Corolla (E210)',
    productionYear: '2020',
    fuelType: 'Hybryda',
    registrationNumber: 'WI 982XF',
    currentMileage: 85200,
    vin: 'NMTBZ3JE00JXXXXXX',
    purchaseDate: '2020-11-02',
    ocExpiry: '2026-10-01',
    acExpiry: '2026-06-20',
    technicalInspectionExpiry: '2026-07-02',
    notes: 'Główny pojazd flotowy, bardzo ekonomiczny. Tylko autoryzowane serwisy.',
  },
  {
    id: 3,
    brand: 'Ford',
    model: 'Transit Custom',
    productionYear: '2018',
    fuelType: 'Diesel',
    registrationNumber: 'PO 4421M',
    currentMileage: 198500,
    vin: 'WF0XXXTTGXFXXXXXX',
    purchaseDate: '2023-02-10',
    ocExpiry: '2026-08-30',
    acExpiry: '2026-06-07',
    technicalInspectionExpiry: '2026-06-27',
    notes: 'Dostawczak roboczy. Często jeździ przeładowany, kontrolować stan zawieszenia.',
  },
  {
    id: 4,
    brand: 'Volkswagen',
    model: 'Passat B8',
    productionYear: '2016',
    fuelType: 'Elektyk',
    registrationNumber: 'KR 772TT',
    currentMileage: 245000,
    vin: 'WVWZZZ3CZGEXXXXXX',
    purchaseDate: '2021-08-19',
    ocExpiry: '2027-01-01',
    acExpiry: '2026-09-15',
    technicalInspectionExpiry: '2026-08-07',
    notes: 'Auto managera. Wymieniony rozrząd przy 210 tys. km.',
  },
  {
    id: 5,
    brand: 'Audi',
    model: 'A4 B9',
    productionYear: '2019',
    fuelType: 'Benzyna',
    registrationNumber: 'GD 552XX',
    currentMileage: 122400,
    vin: 'WAUZZZF4XGEXXXXXX',
    purchaseDate: '2024-03-12',
    ocExpiry: '2026-06-16',
    acExpiry: '2026-07-01',
    technicalInspectionExpiry: '2027-03-10',
    notes: 'Pojazd handlowca. Sprawdzać stan klocków hamulcowych przy najbliższym serwisie.',
  },
];
