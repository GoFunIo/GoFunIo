export interface NotificationChangeScope {
  companyId: string;
  userId: string | null;
}

export interface NotificationStreamScope {
  companyId: string;
  userId: string;
}
