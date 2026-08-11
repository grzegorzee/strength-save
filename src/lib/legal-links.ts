// Z249: czyste adresy stron prawnych — trasy React na landingu, które same
// dobierają wersję językową (PL/EN) i osadzają dokument. Statyczne
// /legal/*.html ZOSTAJĄ na landingu na zawsze: są zaszyte w starych buildach
// aplikacji (<=84) i w metadanych App Store/Google Play (release/*.md).
export const TERMS_URL = 'https://strengthsave.app/terms';
export const PRIVACY_URL = 'https://strengthsave.app/privacy';
