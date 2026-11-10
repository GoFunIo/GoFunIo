import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { Vehicle } from '../vehicles/vehicles.entity';
import { Notification } from './notification.entity';

@Entity('vehicle_deadline_notification_details')
@Unique('UQ_vehicle_deadline_notification_trigger', [
  'companyId',
  'vehicleId',
  'deadlineKind',
  'deadlineDate',
  'leadDay',
])
export class VehicleDeadlineNotificationDetail {
  @PrimaryColumn({ type: 'uuid' }) notificationId!: string;
  @Column({ type: 'uuid' }) companyId!: string;
  @Column({ type: 'uuid' }) vehicleId!: string;
  @Column({ type: 'text' })
  deadlineKind!: string;
  @Column({ type: 'date' }) deadlineDate!: string;
  @Column({ type: 'smallint' }) leadDay!: number;
  @Column({ type: 'varchar', length: 10 }) registrationNumberSnapshot!: string;
  @Column({ type: 'varchar', length: 60, nullable: true })
  deadlineLabelSnapshot!: string | null;

  @ManyToOne(() => Notification, { onDelete: 'CASCADE' })
  @JoinColumn([
    { name: 'notificationId', referencedColumnName: 'id' },
    { name: 'companyId', referencedColumnName: 'companyId' },
  ])
  notification!: Notification;

  @ManyToOne(() => Vehicle, { onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'vehicleId', referencedColumnName: 'id' },
    { name: 'companyId', referencedColumnName: 'companyId' },
  ])
  vehicle!: Vehicle;
}
