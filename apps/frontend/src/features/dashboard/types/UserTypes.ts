export interface UserType {
  address: string | null;
  city: string | null;
  companyId: string;
  email: string;
  firstName: string | null;
  hasPassword: boolean;
  id: string;
  lastName: string | null;
  pendingEmail: string | null;
  phone: string | null;
  postalCode: string | null;
  role: string | null;
}

export interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  sendInvite: boolean;
  id?: string;
}
