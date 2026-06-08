// Mapa domen e-mail na link do webmaila — żeby user mógł jednym kliknięciem
// otworzyć skrzynkę i znaleźć kod weryfikacyjny.

export interface InboxProvider {
  provider: string;
  url: string;
}

const PROVIDER_BY_DOMAIN: Record<string, InboxProvider> = {
  'gmail.com': { provider: 'Gmail', url: 'https://mail.google.com' },
  'googlemail.com': { provider: 'Gmail', url: 'https://mail.google.com' },
  'icloud.com': { provider: 'iCloud', url: 'https://www.icloud.com/mail' },
  'me.com': { provider: 'iCloud', url: 'https://www.icloud.com/mail' },
  'mac.com': { provider: 'iCloud', url: 'https://www.icloud.com/mail' },
  'outlook.com': { provider: 'Outlook', url: 'https://outlook.live.com/mail' },
  'hotmail.com': { provider: 'Outlook', url: 'https://outlook.live.com/mail' },
  'live.com': { provider: 'Outlook', url: 'https://outlook.live.com/mail' },
  'msn.com': { provider: 'Outlook', url: 'https://outlook.live.com/mail' },
  'yahoo.com': { provider: 'Yahoo', url: 'https://mail.yahoo.com' },
  'proton.me': { provider: 'Proton', url: 'https://mail.proton.me' },
  'protonmail.com': { provider: 'Proton', url: 'https://mail.proton.me' },
  'wp.pl': { provider: 'WP Poczta', url: 'https://poczta.wp.pl' },
  'o2.pl': { provider: 'o2 Poczta', url: 'https://poczta.o2.pl' },
  'onet.pl': { provider: 'Onet Poczta', url: 'https://poczta.onet.pl' },
  'op.pl': { provider: 'Onet Poczta', url: 'https://poczta.onet.pl' },
  'interia.pl': { provider: 'Interia Poczta', url: 'https://poczta.interia.pl' },
};

const FALLBACK: InboxProvider[] = [
  { provider: 'Gmail', url: 'https://mail.google.com' },
  { provider: 'iCloud', url: 'https://www.icloud.com/mail' },
];

/**
 * Zwraca przyciski do otwarcia skrzynki: dopasowanego providera (gdy domena znana),
 * w przeciwnym razie Gmail + iCloud (najczęstsze).
 */
export const getInboxProviders = (email: string): InboxProvider[] => {
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return FALLBACK;
  const match = PROVIDER_BY_DOMAIN[domain];
  return match ? [match] : FALLBACK;
};
