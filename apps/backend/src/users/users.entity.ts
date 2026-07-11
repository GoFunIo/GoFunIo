import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../companies/companies.entity';

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
}

@Entity('users')
@Index(['email'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
@Index(['googleId'], {
  unique: true,
  where: '"deletedAt" IS NULL AND "googleId" IS NOT NULL',
})
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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn()
  deletedAt!: Date | null;
}
