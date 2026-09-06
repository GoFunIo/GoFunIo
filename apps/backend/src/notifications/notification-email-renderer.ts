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

const deadlineCardLabels: Record<VehicleDeadlineKind, string> = {
  [VehicleDeadlineKind.OC]: 'Ubezpieczenie OC',
  [VehicleDeadlineKind.AC]: 'Ubezpieczenie AC',
  [VehicleDeadlineKind.TECHNICAL_INSPECTION]: 'Przegląd techniczny',
};

const deadlineIcons: Record<VehicleDeadlineKind, string> = {
  [VehicleDeadlineKind.OC]: 'shield-alert',
  [VehicleDeadlineKind.AC]: 'shield-check',
  [VehicleDeadlineKind.TECHNICAL_INSPECTION]: 'calendar-cog',
};

interface AlertVariant {
  iconBg: string;
  badgeColor: string;
  badgeText: string;
}

// ponytail: naive PL pluralization ("1 dzień" / "N dni"); swap for an Intl.PluralRules
// helper if the wording ever needs the "2-4 dni" form.
function alertVariant(daysRemaining: number): AlertVariant {
  if (daysRemaining < 0) {
    const abs = -daysRemaining;
    return {
      iconBg: '#FBCEC9',
      badgeColor: '#D93025',
      badgeText: `${abs} ${abs === 1 ? 'dzień' : 'dni'} temu`,
    };
  }
  const remainingText =
    daysRemaining === 0
      ? 'Dzisiaj'
      : `Zostało ${daysRemaining} ${daysRemaining === 1 ? 'dzień' : 'dni'}`;
  if (daysRemaining <= 7) {
    return {
      iconBg: '#FBCEC9',
      badgeColor: '#D93025',
      badgeText: remainingText,
    };
  }
  if (daysRemaining <= 30) {
    return {
      iconBg: '#FFE0AD',
      badgeColor: '#F0B14A',
      badgeText: remainingText,
    };
  }
  return { iconBg: '#CFE4FF', badgeColor: '#1A73E8', badgeText: remainingText };
}

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
  const subjectName =
    input.deadlineKind === VehicleDeadlineKind.TECHNICAL_INSPECTION
      ? 'przeglądu technicznego'
      : input.deadlineKind;
  return {
    subject: `Termin ${subjectName} pojazdu ${input.registrationNumber}`,
    text: `${sentence}\n\nOtwórz powiadomienie: ${link}`,
    html: renderHtml(input, { date, link }),
  };
}

function renderHtml(
  input: VehicleDeadlineNotificationEmailInput,
  { date, link }: { date: string; link: string },
): string {
  const variant = alertVariant(input.daysRemaining);
  const registration = escapeHtml(input.registrationNumber);
  const cardLabel = deadlineCardLabels[input.deadlineKind];
  const assetBase = new URL('/', input.frontendBaseUrl)
    .toString()
    .replace(/\/$/, '');
  const iconUrl = `${assetBase}/images/icons/${deadlineIcons[input.deadlineKind]}.png`;
  const logoUrl = `${assetBase}/images/autokeep-logo-mailing.png`;
  const settingsLink = escapeHtml(
    new URL('/notifications', input.frontendBaseUrl).toString(),
  );
  const buttonLink = escapeHtml(link);
  const grey =
    'font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #666666;';

  return `<!doctype html>
<html lang="pl" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<title>Termin ${escapeHtml(cardLabel)} pojazdu ${registration}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fafbfb; font-family: Arial, Helvetica, sans-serif;">
<div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; font-size: 12px; line-height: 1px; color: #fafbfb;">Termin ${escapeHtml(cardLabel)} pojazdu ${registration} przypada ${date}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fafbfb;">
<tr><td align="center" style="padding: 32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width: 600px; max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e2d9;">
<tr><td align="center" style="padding: 32px 32px 20px;"><img src="${logoUrl}" width="140" height="38" alt="AutoKeep" style="display: block; width: 140px; height: 38px;" /></td></tr>
<tr><td style="padding: 0 32px;"><div style="border-top: 1px solid #e4e2d9; line-height: 1px; font-size: 1px;">&nbsp;</div></td></tr>
<tr><td style="padding: 28px 32px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: bold; line-height: 22px; color: #111518; padding-bottom: 4px;">Cześć,</td></tr>
<tr><td style="${grey} line-height: 20px; padding-bottom: 20px;">zbliża się termin dla jednego z Twoich pojazdów.</td></tr>
<tr><td style="padding-bottom: 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EEF0F6" style="border-radius: 8px;">
<tr><td style="padding: 16px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="36" valign="top" style="padding-right: 12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td width="36" height="36" bgcolor="${variant.iconBg}" style="border-radius: 8px; text-align: center; vertical-align: middle;"><img src="${iconUrl}" width="18" height="18" alt="" style="display: inline-block; width: 18px; height: 18px; vertical-align: middle;" /></td>
</tr></table>
</td>
<td valign="top">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #111518; padding-bottom: 2px;">${registration}</td></tr>
<tr><td style="${grey} padding-bottom: 10px;">${escapeHtml(cardLabel)} &middot; termin ${date}</td></tr>
<tr><td><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${variant.badgeColor}" style="border-radius: 4px; padding: 4px 10px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; color: #ffffff;">${escapeHtml(variant.badgeText)}</td></tr></table></td></tr>
</table>
</td>
</tr></table>
</td></tr></table>
</td></tr>
<tr><td align="left" style="padding-bottom: 24px;">
<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${buttonLink}" style="height: 44px; v-text-anchor: middle; width: 160px;" arcsize="18%" fillcolor="#124CBF" stroke="f"><w:anchorlock/><center style="color: #ffffff; font-family: Arial, sans-serif; font-size: 12px; font-weight: bold;">Zobacz pojazd</center></v:roundrect><![endif]-->
<!--[if !mso]><!--><a href="${buttonLink}" target="_blank" style="background-color: #124cbf; border-radius: 8px; color: #ffffff; display: inline-block; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; line-height: 44px; text-align: center; text-decoration: none; width: 160px; -webkit-text-size-adjust: none;">Zobacz pojazd</a><!--<![endif]-->
</td></tr>
</table>
</td></tr>
<tr><td style="padding: 24px 32px 32px;">
<div style="border-top: 1px solid #e4e2d9; line-height: 1px; font-size: 1px; margin-bottom: 16px;">&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #667085;">Otrzymujesz tę wiadomość, bo masz włączone powiadomienia e-mail dla kategorii Terminy floty.<br /><a href="${settingsLink}" target="_blank" style="color: #145ae2;">Zarządzaj powiadomieniami</a></td>
</tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
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
