import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Membership } from '../users/membership.entity';
import { Notification } from './notification.entity';

@Entity('notification_recipients')
@Unique('UQ_notification_recipients_id_company', ['id', 'companyId'])
@Unique('UQ_notification_recipient_membership', [
  'companyId',
  'notificationId',
  'membershipId',
])
export class NotificationRecipient {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) companyId!: string;
  @Column({ type: 'uuid' }) notificationId!: string;
  @Column({ type: 'uuid' }) membershipId!: string;
  @Column({ type: 'timestamptz', nullable: true }) readAt!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) archivedAt!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt!: Date | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;

  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'notificationId', referencedColumnName: 'id' },
    { name: 'companyId', referencedColumnName: 'companyId' },
  ])
  notification!: Notification;
  @ManyToOne(() => Membership, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'membershipId', referencedColumnName: 'id' },
    { name: 'companyId', referencedColumnName: 'companyId' },
  ])
  membership!: Membership;
}
