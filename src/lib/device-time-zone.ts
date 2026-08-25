// Bug 11 (X30): strefa IANA urządzenia z Intl — źródło pola users/{uid}.timeZone
// (TimeZoneSync). Limit 64 znaków zgodny z regułą Firestore.
export const readDeviceTimeZone = (): string | null => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof timeZone === 'string' && timeZone.length > 0 && timeZone.length <= 64 ? timeZone : null;
  } catch {
    return null;
  }
};
