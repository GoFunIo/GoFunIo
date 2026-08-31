export type DriversActions = 'add' | 'edit' | 'delete' | 'showCars' | null;

// Pojazd aktualnie przypisany do kierowcy.
export interface DriverActiveVehicle {
  id: string;
  brand: string;
  model: string;
  registrationNumber: string;
}

// Dane kierowcy zwracane przez API.
// GET /drivers
// GET /drivers/{id}
export interface DriverType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string;
  userId: string;
  activeVehicles: DriverActiveVehicle[];
}

// Dane formularza kierowcy - wykorzystywane przy tworzeniu i edycji kierowcy
export interface DriverFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  id?: string;
}
