import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';
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
  @Column({
    type: 'enum',
    enum: VehicleDeadlineKind,
    enumName: 'vehicle_deadline_kind',
  })
  deadlineKind!: VehicleDeadlineKind;
  @Column({ type: 'date' }) deadlineDate!: string;
  @Column({ type: 'smallint' }) leadDay!: number;
  @Column({ type: 'varchar', length: 10 }) registrationNumberSnapshot!: string;

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
