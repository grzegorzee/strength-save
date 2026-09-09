# Android 50 — follow-up układu treningu

Źródła zamrożone po poprawkach dwóch zgłoszonych elementów. Bez publikacji, bumpu, operacji na prawdziwym koncie ani zmian danych treningowych.

## Tabela serii

Przyczyna, zakres oraz macierz opisane w [TABLE.md](TABLE.md). Zmierzona redukcja wysokości wiersza 360 px: **132,5 → 60 px** w nowoczesnym silniku; **132,5 → 80,5 px** przy ignorowaniu reguł kontenera. Minimum 44 px dla kontrolek, kg minimum 56 px, brak poziomego przewijania. Oba ćwiczenia/serie, IDB i reload zachowane.

## Notatka przyszłego dnia

Przyczyna: `WorkoutDayNoteSection` umieszczał tytuł, długi dopisek o przyszłym treningu oraz akcję edycji w jednym kurczącym się wierszu. Zdjęcie pokazywało trzy wąskie kolumny. RED przed zmianą: nowy test w `workout-day-notes.test.tsx`, 1 FAIL / 13 PASS (`note-red.log`).

Naprawa: zwięzły semantyczny tytuł i akcja edycji w nagłówku; wyjaśnienie w oddzielnej pełnej linii. Zapis/anulowanie/edycja zachowują minimum 44 px. Żadnych zmian hooka zapisującego notatkę, długości tekstu, klucza dnia ani zgód.

Przy 360 px pusty baner ma **80,5 px** wysokości, tytuł około **184 px** szerokości, wyjaśnienie pełne **296 px**, edycja **44 px** wysokości. Wszystkie informacje nadal widoczne. E2E 360/375/393: wpisanie wielowierszowej notatki z ustawieniem maszyny, zapis, reload, ponowna edycja i anulowanie zachowują cały tekst. Zrzuty i geometria: `chromium/future-note-360.png`, `webkit/future-note-360.png` oraz JSON.

## Weryfikacja wspólna

- **34/34 E2E** — Chromium i WebKit, świeżo uruchomiony Vite 8080, 2 workers (`browser-verified.log`). 14 testów nowej tabeli, 6 notatki, 14 istniejących regresji density/dużego tekstu.
- **130/130 unit, 8 plików** — karta, tracking/duration, zakończenie, liczby dziesiętne, źródło listy dnia, notatki oraz nienaruszony guard zakazujący poziomego przewijania kontrolek (`unit-final.log`).
- **Typecheck, scoped lint, build PASS.** Build uruchamia dodatkowo typecheck.
- Wszystkie dane syntetyczne (`e2e-test-user`), Firebase i Cloud Functions blokowane. Nie wykonano zapisów na prawdziwym koncie.

Testy geometrii wykonano w prawdziwych silnikach przeglądarek. Nie wykonano testu fizycznego Huawei, starego WebView o potwierdzonej wersji, suspend/resume ani systemowej klawiatury na urządzeniu. NOT RUN należy zachować w końcowym raporcie wydania; browser pass nie zastępuje tych testów.
