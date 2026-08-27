import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { NotificationRecipient } from './notification-recipient.entity';

export enum NotificationChannel {
  EMAIL = 'EMAIL',
}
export enum NotificationDeliveryStatus {
  PENDING = 'PENDING',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('notification_deliveries')
@Unique('UQ_notification_delivery_channel', [
  'companyId',
  'recipientId',
  'channel',
])
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) companyId!: string;
  @Column({ type: 'uuid' }) recipientId!: string;
  @Column({
    type: 'enum',
    enum: NotificationChannel,
    enumName: 'notification_channel',
  })
  channel!: NotificationChannel;
  @Column({
    type: 'enum',
    enum: NotificationDeliveryStatus,
    enumName: 'notification_delivery_status',
  })
  status!: NotificationDeliveryStatus;
  @Column({ type: 'integer', default: 0 }) attempts!: number;
  @Column({ type: 'timestamptz' }) nextAttemptAt!: Date;
  @Column({ type: 'timestamptz', nullable: true }) lockedAt!: Date | null;
  @Column({ type: 'varchar', nullable: true }) recipientAddress!: string | null;
  @Column({ type: 'varchar', nullable: true }) providerMessageId!:
    | string
    | null;
  @Column({ type: 'varchar', length: 500, nullable: true }) lastError!:
    | string
    | null;
  @Column({ type: 'timestamptz', nullable: true }) sentAt!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;

  @ManyToOne(() => NotificationRecipient, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'recipientId', referencedColumnName: 'id' },
    { name: 'companyId', referencedColumnName: 'companyId' },
  ])
  recipient!: NotificationRecipient;
}
