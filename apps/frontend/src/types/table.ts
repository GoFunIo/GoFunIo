export interface Column<T> {
  header: string;
  accessor: keyof T | string;
  className?: string;
  render?: (value: unknown, item: T) => React.ReactNode;
  isImportant?: boolean;
}

export interface ServiceTable {
  id: string;
  date: string;
  car: string;
  plate: string;
  type: string;
  workshop: string;
  hasAttachment: boolean;
  cost: number;
}

export interface UsersTable {
  id: string;
  user: string;
  email: string;
  role: string;
  carsAmount: number;
}
