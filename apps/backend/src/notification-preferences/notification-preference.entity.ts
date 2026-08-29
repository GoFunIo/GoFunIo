import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NotificationCategory {
  FLEET_DEADLINES = 'FLEET_DEADLINES',
  VEHICLE_ACCESS = 'VEHICLE_ACCESS',
  MEMBERSHIP = 'MEMBERSHIP',
  SERVICE = 'SERVICE',
  PRODUCT = 'PRODUCT',
}

export enum NotificationEmailMode {
  OFF = 'OFF',
  IMMEDIATE = 'IMMEDIATE',
}

export const NOTIFICATION_CATEGORIES = Object.values(NotificationCategory);
export const DEFAULT_NOTIFICATION_EMAIL_MODE = NotificationEmailMode.IMMEDIATE;
export const DEFAULT_SHOW_LIVE_TOASTS = true;

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryColumn({ type: 'uuid' })
  companyId!: string;

  @PrimaryColumn({ type: 'uuid' })
  membershipId!: string;

  @PrimaryColumn({
    type: 'enum',
    enum: NotificationCategory,
    enumName: 'notification_category',
  })
  category!: NotificationCategory;

  @Column({
    type: 'enum',
    enum: NotificationEmailMode,
    enumName: 'notification_email_mode',
  })
  emailMode!: NotificationEmailMode;

  @Column({ type: 'boolean' })
  showLiveToasts!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
