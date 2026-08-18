export interface UserAccount {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  pendingEmail: string | null;
  hasPassword: boolean;
}
