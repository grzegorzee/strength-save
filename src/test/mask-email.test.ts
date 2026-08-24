import { describe, expect, it } from 'vitest';
import { maskEmail } from '@/lib/mask-email';

// WP-G (plan X29): maska emaila w Profilu i sidebarze. Pierwszy znak części
// lokalnej i domeny widoczny, reszta wypełniona U+2022, TLD w całości widoczny.

describe('maskEmail', () => {
  it('grzegorz@gmail.com -> g•••••••@g••••.com', () => {
    expect(maskEmail('grzegorz@gmail.com')).toBe('g•••••••@g••••.com');
  });

  it('tester@example.com -> t•••••@e••••••.com', () => {
    expect(maskEmail('tester@example.com')).toBe('t•••••@e••••••.com');
  });

  it('edge: a@b.co (jednoznakowe człony) zostaje czytelne bez wypełnienia', () => {
    expect(maskEmail('a@b.co')).toBe('a@b.co');
  });

  it('string bez @ wraca bez zmian', () => {
    expect(maskEmail('nie-email')).toBe('nie-email');
  });

  it('pusty string wraca bez zmian', () => {
    expect(maskEmail('')).toBe('');
  });

  it('domena bez kropki: maska po pierwszym znaku, bez TLD', () => {
    expect(maskEmail('ab@localhost')).toBe('a•@l••••••••');
  });

  it('domena wielopoziomowa: widoczny tylko ostatni człon (TLD)', () => {
    expect(maskEmail('x@mail.google.com')).toBe('x@m••••••••••.com');
  });
});
