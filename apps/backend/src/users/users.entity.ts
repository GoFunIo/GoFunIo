import {
  AfterInsert,
  AfterUpdate,
  AfterRemove,
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ default: false })
  isVerified!: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  verificationTokenHash!: string | null;

  @Column({ type: 'datetime', nullable: true, select: false })
  verificationTokenExpiresAt!: Date | null;

  @AfterInsert()
  logInsert() {
    console.log('Inserted User with id', this.id);
  }

  @AfterUpdate()
  logUpdate() {
    console.log('Updated User with id', this.id);
  }

  @AfterRemove()
  logRemove() {
    console.log('Removed User with id', this.id);
  }
}
