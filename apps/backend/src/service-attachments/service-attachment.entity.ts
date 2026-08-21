import {
  Check,
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
import { Service } from '../services/services.entity';

export enum ServiceAttachmentMimeType {
  PDF = 'application/pdf',
  JPEG = 'image/jpeg',
  PNG = 'image/png',
}

@Entity('service_attachments')
@Unique('UQ_service_attachments_object_key', ['objectKey'])
@Check('CHK_service_attachments_size', '"size" BETWEEN 1 AND 10485760')
@Check(
  'CHK_service_attachments_mime',
  `"mimeType" IN ('application/pdf', 'image/jpeg', 'image/png')`,
)
export class ServiceAttachment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  companyId!: string;

  @Column({ type: 'uuid' })
  serviceId!: string;

  @ManyToOne(() => Service, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn([
    { name: 'serviceId', referencedColumnName: 'id' },
    { name: 'companyId', referencedColumnName: 'companyId' },
  ])
  service!: Service;

  @Column({ type: 'varchar' })
  objectKey!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar' })
  mimeType!: ServiceAttachmentMimeType;

  @Column({ type: 'integer' })
  size!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt!: Date | null;
}
