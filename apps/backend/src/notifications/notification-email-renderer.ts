import { VehicleDeadlineKind } from '../alert-policy/vehicle-deadline-alert-policy.entity';

export interface VehicleDeadlineNotificationEmailInput {
  rendererVersion: number;
  workspaceId: string;
  notificationId: string;
  frontendBaseUrl: string;
  deadlineKind: VehicleDeadlineKind;
  deadlineDate: string;
  leadDay: number;
  daysRemaining: number;
  registrationNumber: string;
}

export interface RenderedNotificationEmail {
  subject: string;
  text: string;
  html: string;
}

const deadlineNames: Record<VehicleDeadlineKind, string> = {
  [VehicleDeadlineKind.OC]: 'ubezpieczenia OC',
  [VehicleDeadlineKind.AC]: 'ubezpieczenia AC',
  [VehicleDeadlineKind.TECHNICAL_INSPECTION]: 'przeglądu technicznego',
};

export function renderVehicleDeadlineNotificationEmail(
  input: VehicleDeadlineNotificationEmailInput,
): RenderedNotificationEmail {
  if (input.rendererVersion !== 1) {
    throw new Error(
      `Unsupported VEHICLE_DEADLINE_REACHED renderer version: ${input.rendererVersion}`,
    );
  }
  const deadlineName = deadlineNames[input.deadlineKind];
  const date = polishDate(input.deadlineDate);
  const timing = timingPhrase(input.daysRemaining, date);
  const sentence = `Termin ${deadlineName} pojazdu ${input.registrationNumber} ${timing}`;
  const link = notificationLink(input);
  const htmlSentence = `Termin ${deadlineName} pojazdu <strong>${escapeHtml(input.registrationNumber)}</strong> ${timingPhrase(input.daysRemaining, `<strong>${date}</strong>`)}`;
  const subjectName =
    input.deadlineKind === VehicleDeadlineKind.TECHNICAL_INSPECTION
      ? 'przeglądu technicznego'
      : input.deadlineKind;
  return {
    subject: `Termin ${subjectName} pojazdu ${input.registrationNumber}`,
    text: `${sentence}\n\nOtwórz powiadomienie: ${link}`,
    html: `<p>${htmlSentence}</p><p><a href="${escapeHtml(link)}">Otwórz powiadomienie</a></p>`,
  };
}

function notificationLink(
  input: Pick<
    VehicleDeadlineNotificationEmailInput,
    'frontendBaseUrl' | 'workspaceId' | 'notificationId'
  >,
): string {
  const url = new URL('/notifications', input.frontendBaseUrl);
  url.searchParams.set('workspaceId', input.workspaceId);
  url.searchParams.set('notificationId', input.notificationId);
  return url.toString();
}

function polishDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}.${month}.${year}`;
}

function timingPhrase(daysRemaining: number, date: string): string {
  if (daysRemaining < 0) return `minął ${date}.`;
  if (daysRemaining === 0) return `przypada dzisiaj (${date}).`;
  if (daysRemaining === 1) return `przypada ${date} (za 1 dzień).`;
  return `przypada ${date} (za ${daysRemaining} dni).`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  );
}
