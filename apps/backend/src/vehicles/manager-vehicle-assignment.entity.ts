import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from '../companies/companies.entity';
import { Membership } from '../users/membership.entity';
import { Vehicle } from './vehicles.entity';

@Entity('manager_vehicle_assignments')
export class ManagerVehicleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  managerId!: string;

  @ManyToOne(() => Membership, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'managerId', referencedColumnName: 'userId' },
    { name: 'companyId', referencedColumnName: 'companyId' },
  ])
  managerMembership!: Membership;

  @Column({ type: 'uuid' })
  vehicleId!: string;

  @ManyToOne(() => Vehicle, (vehicle) => vehicle.managerAssignments, {
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
