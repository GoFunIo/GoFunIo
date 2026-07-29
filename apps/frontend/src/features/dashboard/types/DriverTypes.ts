export interface DriverType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  notes?: string;
}

export interface DriverFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  id?: string;
}
