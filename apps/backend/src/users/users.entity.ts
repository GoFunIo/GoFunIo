import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VirtualColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  email!: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  password!: string | null;

  @VirtualColumn({
    type: 'boolean',
    query: (alias) => `${alias}."password" IS NOT NULL`,
  })
  hasPassword?: boolean;

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
