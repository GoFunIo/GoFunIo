import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum VehicleDeadlineKind {
  OC = 'OC',
  AC = 'AC',
  TECHNICAL_INSPECTION = 'TECHNICAL_INSPECTION',
}

export const DEFAULT_VEHICLE_DEADLINE_KINDS = [
  VehicleDeadlineKind.OC,
  VehicleDeadlineKind.AC,
  VehicleDeadlineKind.TECHNICAL_INSPECTION,
] as const;
export const DEFAULT_VEHICLE_DEADLINE_LEAD_DAYS = [30, 14, 7, 0] as const;
export const DEFAULT_VEHICLE_DEADLINE_TIME_ZONE = 'Europe/Warsaw';

@Entity('vehicle_deadline_alert_policies')
export class VehicleDeadlineAlertPolicy {
  @PrimaryColumn({ type: 'uuid' })
  companyId!: string;

  @Column({
    type: 'enum',
    enum: VehicleDeadlineKind,
    enumName: 'vehicle_deadline_kind',
    array: true,
  })
  enabledDeadlineKinds!: VehicleDeadlineKind[];

  @Column({ type: 'smallint', array: true })
  leadDays!: number[];

  @Column({ type: 'text' })
  timeZone!: string;

  @Column({ type: 'timestamptz' })
  activatedAt!: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
