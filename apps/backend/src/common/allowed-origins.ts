export function resolveAllowedOrigins(
  frontendUrl: string,
  corsOrigins?: string,
): string[] {
  const configured = corsOrigins
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configured?.length ? configured : [new URL(frontendUrl).origin];
}
