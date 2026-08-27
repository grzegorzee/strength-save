import { describe, expect, it } from 'vitest';
import { safeInternalDeepLink } from '@/lib/internal-deep-link';

describe('safeInternalDeepLink', () => {
  it.each(['/profile', '/analytics?tab=weekly', '/history#latest'])(
    'przepuszcza wewnętrzną ścieżkę %s',
    (value) => expect(safeInternalDeepLink(value)).toBe(value),
  );

  it.each([
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/%5cevil.example',
    '/%2f%2fevil.example',
    '/%255cevil.example',
    '/%252f%252fevil.example',
    '/%2f\\evil.example',
    'javascript:alert(1)',
    '/history\n/evil',
    ' /profile',
    '/bad%escape',
  ])('odrzuca link opuszczający bezpieczną przestrzeń aplikacji: %s', (value) => {
    expect(safeInternalDeepLink(value)).toBeNull();
  });
});
