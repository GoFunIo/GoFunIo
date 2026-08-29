import './test-env';
import { randomBytes } from 'crypto';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { Company } from '../../src/companies/companies.entity';
import { User } from '../../src/users/users.entity';
import { Vehicle } from '../../src/vehicles/vehicles.entity';
import { ManagerVehicleAssignment } from '../../src/vehicles/manager-vehicle-assignment.entity';
import { Driver } from '../../src/drivers/drivers.entity';
import { DriverVehicleAssignment } from '../../src/drivers/driver-vehicle-assignment.entity';
import { Membership } from '../../src/users/membership.entity';
import { Service } from '../../src/services/services.entity';
import { ServiceAttachment } from '../../src/service-attachments/service-attachment.entity';
import { AttachmentObjectCleanup } from '../../src/service-attachments/attachment-object-cleanup.entity';
import { VehicleDeadlineAlertPolicy } from '../../src/alert-policy/vehicle-deadline-alert-policy.entity';
import { NotificationPreference } from '../../src/notification-preferences/notification-preference.entity';
import { Notification } from '../../src/notifications/notification.entity';
import { VehicleDeadlineNotificationDetail } from '../../src/notifications/vehicle-deadline-notification-detail.entity';
import { NotificationRecipient } from '../../src/notifications/notification-recipient.entity';
import { NotificationDelivery } from '../../src/notifications/notification-delivery.entity';
import { NotificationChange } from '../../src/notification-changes/notification-change.entity';

function postgresExtras(schema?: string): Record<string, string> | undefined {
  if (!schema) {
    return undefined;
  }
  return { options: `-c search_path=${schema},public` };
}

function adminDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
  });
}

function testDataSource(schema: string): DataSource {
  return new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    schema,
    entities: [
      User,
      Company,
      Vehicle,
      ManagerVehicleAssignment,
      Driver,
      DriverVehicleAssignment,
      Membership,
      Service,
      ServiceAttachment,
      AttachmentObjectCleanup,
      VehicleDeadlineAlertPolicy,
      NotificationPreference,
      Notification,
      VehicleDeadlineNotificationDetail,
      NotificationRecipient,
      NotificationDelivery,
      NotificationChange,
    ],
    migrations: [join(__dirname, '../../src/migrations', '*.{js,ts}')],
    synchronize: false,
    extra: postgresExtras(schema),
  });
}

async function withAdminDataSource<T>(
  callback: (ds: DataSource) => Promise<T>,
): Promise<T> {
  const ds = adminDataSource();
  await ds.initialize();
  try {
    return await callback(ds);
  } finally {
    await ds.destroy();
  }
}

async function withTestDataSource<T>(
  schema: string,
  callback: (ds: DataSource) => Promise<T>,
): Promise<T> {
  const ds = testDataSource(schema);
  await ds.initialize();
  try {
    return await callback(ds);
  } finally {
    await ds.destroy();
  }
}

export async function createTestSchema(): Promise<string> {
  const schema = `e2e_${randomBytes(4).toString('hex')}`;

  await withAdminDataSource(async (admin) => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
  });

  process.env.DATABASE_SCHEMA = schema;

  await withTestDataSource(schema, async (ds) => {
    await ds.runMigrations();
  });

  return schema;
}

export async function dropTestSchema(schema: string): Promise<void> {
  await withAdminDataSource(async (admin) => {
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  });
  delete process.env.DATABASE_SCHEMA;
}

export async function truncateTestTables(): Promise<void> {
  const schema = process.env.DATABASE_SCHEMA;
  if (!schema) {
    return;
  }

  // ponytail: hardcoded tables — extend list or switch to dynamic truncate when new FK tables appear
  await withAdminDataSource(async (admin) => {
    await admin.query(
      `TRUNCATE TABLE "${schema}"."notification_changes", "${schema}"."notification_deliveries", "${schema}"."notification_recipients", "${schema}"."vehicle_deadline_notification_details", "${schema}"."notifications", "${schema}"."notification_preferences", "${schema}"."vehicle_deadline_alert_policies", "${schema}"."attachment_object_cleanup", "${schema}"."service_attachments", "${schema}"."services", "${schema}"."driver_vehicle_assignments", "${schema}"."manager_vehicle_assignments", "${schema}"."drivers", "${schema}"."vehicles", "${schema}"."memberships", "${schema}"."users", "${schema}"."companies" RESTART IDENTITY CASCADE`,
    );
  });
}
