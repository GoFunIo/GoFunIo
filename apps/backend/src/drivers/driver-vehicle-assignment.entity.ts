import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from '../companies/companies.entity';
import { Vehicle } from '../vehicles/vehicles.entity';
import { Driver } from './drivers.entity';

@Entity('driver_vehicle_assignments')
export class DriverVehicleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  driverId!: string;

  @ManyToOne(() => Driver, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'driverId', referencedColumnName: 'id' },
    { name: 'companyId', referencedColumnName: 'companyId' },
  ])
  driver!: Driver;

  @Column({ type: 'uuid' })
  vehicleId!: string;

  @ManyToOne(() => Vehicle, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn([
    { name: 'vehicleId', referencedColumnName: 'id' },
    { name: 'companyId', referencedColumnName: 'companyId' },
  ])
  vehicle!: Vehicle;

  @Column({ type: 'timestamptz', default: () => 'clock_timestamp()' })
  assignedFrom!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  assignedTo!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
