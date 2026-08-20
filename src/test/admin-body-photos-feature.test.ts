import { describe, expect, it } from 'vitest';
import { AVAILABLE_FEATURES } from '@/pages/admin/admin-user-types';

// T14: toggle zdjec sylwetki before/after per user w panelu admina.
// Kontrakt kolejnosci: tablica AVAILABLE_FEATURES steruje renderem
// (AdminUserDetail + UsersActivityTable), wiec bodyPhotos MUSI byc
// bezposrednio po strava ("ponizej istniejacego feature'a Strava").

describe('AVAILABLE_FEATURES: bodyPhotos (T14)', () => {
  it('strava zostaje pierwsza na liscie (niezmiennik istniejacego panelu)', () => {
    expect(AVAILABLE_FEATURES[0].key).toBe('strava');
  });

  it('bodyPhotos jest zaraz pod strava', () => {
    expect(AVAILABLE_FEATURES[1].key).toBe('bodyPhotos');
  });

  it('bodyPhotos jest domyslnie wylaczone (feature wlacza tylko admin)', () => {
    const bodyPhotos = AVAILABLE_FEATURES.find((f) => f.key === 'bodyPhotos');
    expect(bodyPhotos?.defaultOn).toBe(false);
    expect(bodyPhotos?.descriptionKey).toBe('admin.featBodyPhotosDesc');
  });
});
