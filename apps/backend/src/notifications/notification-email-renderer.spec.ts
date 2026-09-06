import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';
import { renderVehicleDeadlineNotificationEmail } from './notification-email-renderer';

describe('renderVehicleDeadlineNotificationEmail', () => {
  it('renders deterministic version 1 Polish content and a Workspace/Notification link', () => {
    const rendered = renderVehicleDeadlineNotificationEmail({
      rendererVersion: 1,
      workspaceId: '11111111-1111-4111-8111-111111111111',
      notificationId: '22222222-2222-4222-8222-222222222222',
      frontendBaseUrl: 'https://app.gofun.io/dashboard/',
      deadlineKind: VehicleDeadlineKind.OC,
      deadlineDate: '2026-09-12',
      leadDay: 14,
      daysRemaining: 14,
      registrationNumber: 'WX 1234',
    });

    expect(rendered.subject).toBe('Termin OC pojazdu WX 1234');
    expect(rendered.text).toBe(
      'Termin ubezpieczenia OC pojazdu WX 1234 przypada 12.09.2026 (za 14 dni).\n\n' +
        'Otwórz powiadomienie: https://app.gofun.io/notifications?workspaceId=11111111-1111-4111-8111-111111111111&notificationId=22222222-2222-4222-8222-222222222222',
    );
    // WARNING variant badge (8-30 days out) and the deadline card label.
    expect(rendered.html).toContain('Zostało 14 dni');
    expect(rendered.html).toContain('#F0B14A');
    expect(rendered.html).toContain(
      'Ubezpieczenie OC &middot; termin 12.09.2026',
    );
    expect(rendered.html).toContain(
      'https://app.gofun.io/images/icons/shield-alert.png',
    );
    expect(rendered.html).toContain(
      'href="https://app.gofun.io/notifications?workspaceId=11111111-1111-4111-8111-111111111111&amp;notificationId=22222222-2222-4222-8222-222222222222"',
    );
    expect(rendered.html).toContain('Zarządzaj powiadomieniami');
  });

  it('uses overdue wording and escapes the registration snapshot in HTML', () => {
    const rendered = renderVehicleDeadlineNotificationEmail({
      rendererVersion: 1,
      workspaceId: '11111111-1111-4111-8111-111111111111',
      notificationId: '22222222-2222-4222-8222-222222222222',
      frontendBaseUrl: 'https://app.gofun.io',
      deadlineKind: VehicleDeadlineKind.TECHNICAL_INSPECTION,
      deadlineDate: '2026-08-27',
      leadDay: 0,
      daysRemaining: -1,
      registrationNumber: 'A&B<1>',
    });

    expect(rendered.subject).toBe(
      'Termin przeglądu technicznego pojazdu A&B<1>',
    );
    expect(rendered.text).toContain('minął 27.08.2026.');
    expect(rendered.html).toContain('A&amp;B&lt;1&gt;');
    expect(rendered.html).toContain('1 dzień temu');
    expect(rendered.html).toContain('#D93025');
    expect(rendered.html).toContain(
      'https://app.gofun.io/images/icons/calendar-cog.png',
    );
    expect(rendered.html).not.toContain('vehicleId');
  });

  it('rejects an unsupported persisted renderer version', () => {
    expect(() =>
      renderVehicleDeadlineNotificationEmail({
        rendererVersion: 2,
        workspaceId: '11111111-1111-4111-8111-111111111111',
        notificationId: '22222222-2222-4222-8222-222222222222',
        frontendBaseUrl: 'https://app.gofun.io',
        deadlineKind: VehicleDeadlineKind.AC,
        deadlineDate: '2026-08-28',
        leadDay: 0,
        daysRemaining: 0,
        registrationNumber: 'WX1234',
      }),
    ).toThrow('Unsupported VEHICLE_DEADLINE_REACHED renderer version: 2');
  });
});
