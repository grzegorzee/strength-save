// WP-E (X28, Task E1): wspolny escapeHtml modulow share. Trzeci modul budujacy
// HTML string (share-utils, CycleShareCard, BodyCompareShareDialog) = koniec
// duplikacji: jedna implementacja, identyczne zachowanie (textContent →
// innerHTML escapuje < > &; cudzyslowy zostaja, bo tekst laduje w tresci
// elementow, nie w atrybutach).
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
