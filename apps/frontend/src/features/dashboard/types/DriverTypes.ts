export type DriversActions =
  | 'add_driver'
  | 'edit_driver'
  | 'delete_driver'
  | 'showCars_driver'
  | null;

export interface DriverActiveVehicle {
  id: string;
  brand: string;
  model: string;
  registrationNumber: string;
}

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

export interface DriverFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  id?: string;
}
