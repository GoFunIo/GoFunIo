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

export enum VehicleFuelType {
  DIESEL = 'DIESEL',
  PETROL = 'PETROL',
  LPG = 'LPG',
  HYBRID = 'HYBRID',
  ELECTRIC = 'ELECTRIC',
}

@Entity('vehicles')
@Unique('UQ_vehicles_id_company', ['id', 'companyId'])
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column({ type: 'varchar', length: 100 })
  brand!: string;

  @Column({ type: 'varchar', length: 100 })
  model!: string;

  @Column({ type: 'smallint', nullable: true })
  productionYear!: number | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  fuelType!: VehicleFuelType | null;

  @Column({ type: 'varchar', length: 17, nullable: true })
  vin!: string | null;

  @Column({ type: 'varchar', length: 10 })
  registrationNumber!: string;

  @Column({ type: 'integer', nullable: true })
  currentMileage!: number | null;

  @Column({ type: 'date', nullable: true })
  purchaseDate!: string | null;

  @Column({ type: 'date', nullable: true })
  ocExpiry!: string | null;

  @Column({ type: 'date', nullable: true })
  acExpiry!: string | null;

  @Column({ type: 'date', nullable: true })
  technicalInspectionExpiry!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt!: Date | null;
}
