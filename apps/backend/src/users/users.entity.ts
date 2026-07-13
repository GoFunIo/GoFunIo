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

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
}

@Entity('users')
@Unique('UQ_users_id_company', ['id', 'companyId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { nullable: false })
  @JoinColumn({ name: 'companyId' })
  company!: Company;

  @Column()
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  password!: string | null;

  @Column({ type: 'varchar', nullable: true })
  googleId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  firstName!: string | null;

  @Column({ type: 'varchar', nullable: true })
  lastName!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ type: 'varchar', length: 6, nullable: true })
  postalCode!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city!: string | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  pendingEmail!: string | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  emailChangeTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  emailChangeTokenExpiresAt!: Date | null;

  @Column({ type: 'enum', enum: UserRole, enumName: 'user_role' })
  role!: UserRole;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ default: 1 })
  passwordVersion!: number;

  @Column({ type: 'varchar', nullable: true, select: false })
  verificationTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  verificationTokenExpiresAt!: Date | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  passwordResetTokenHash!: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  passwordResetTokenExpiresAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt!: Date | null;
}
