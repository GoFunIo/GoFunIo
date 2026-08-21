import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../companies/companies.entity';
import { Vehicle } from '../vehicles/vehicles.entity';

export enum ServiceType {
  FULL = 'FULL',
  OIL_CHANGE = 'OIL_CHANGE',
  TECHNICAL_INSPECTION = 'TECHNICAL_INSPECTION',
  OC = 'OC',
  AC = 'AC',
  OTHER = 'OTHER',
}

@Entity('services')
@Unique('UQ_services_id_company', ['id', 'companyId'])
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'uuid' })
  vehicleId!: string;

  @ManyToOne(() => Vehicle, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'vehicleId', referencedColumnName: 'id' },
    { name: 'companyId', referencedColumnName: 'companyId' },
  ])
  vehicle!: Vehicle;

  @Column({ type: 'date' })
  serviceDate!: string;

  @Column({ type: 'varchar' })
  type!: ServiceType;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  cost!: string;

  @Column({ type: 'varchar', length: 255 })
  providerName!: string;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt!: Date | null;
}
