import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('vehicle_deadline_custom_dates')
export class VehicleDeadlineCustomDate {
  @PrimaryColumn({ type: 'uuid' })
  vehicleId!: string;

  @PrimaryColumn({ type: 'uuid' })
  kindId!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'date' })
  deadlineDate!: string;
}
