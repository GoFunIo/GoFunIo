import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { NotificationCategory } from '../notification-preferences/notification-preference.entity';

export enum NotificationType {
  VEHICLE_DEADLINE_REACHED = 'VEHICLE_DEADLINE_REACHED',
}

@Entity('notifications')
@Unique('UQ_notifications_id_company', ['id', 'companyId'])
export class Notification {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) companyId!: string;
  @Column({
    type: 'enum',
    enum: NotificationType,
    enumName: 'notification_type',
  })
  type!: NotificationType;
  @Column({
    type: 'enum',
    enum: NotificationCategory,
    enumName: 'notification_category',
  })
  category!: NotificationCategory;
  @Column({ type: 'smallint' }) rendererVersion!: number;
  @Column({ type: 'timestamptz' }) occurredAt!: Date;
  @Column({ type: 'timestamptz', nullable: true }) expiresAt!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) invalidatedAt!: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}
