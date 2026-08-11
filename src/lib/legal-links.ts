// Czyste adresy stron prawnych — trasy React na landingu (repo
// strength_save_landing, źródło: src/data/legal/*.html), które same dobierają
// wersję językową (PL/EN) i renderują dokument. Stare statyczne /legal/*.html
// nie istnieją: buildy <=85 to wyłącznie testy TestFlight (decyzja usera
// 2026-08-11), a stare adresy mają redirecty 308 w vercel.json landingu.
export const TERMS_URL = 'https://strengthsave.app/terms';
export const PRIVACY_URL = 'https://strengthsave.app/privacy';
export const COOKIES_URL = 'https://strengthsave.app/cookies';
export const HEALTH_DATA_URL = 'https://strengthsave.app/health-data-privacy';
