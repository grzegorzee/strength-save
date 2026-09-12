# Android 1.0.0 (54) — 12 września 2026

Google Play Internal Testing: **COMPLETED**. Wysłany AAB oraz jego hash
potwierdzono odczytem po publikacji i osobnym ponownym wywołaniem API.
[Instalacja dla testerów](https://play.google.com/apps/internaltest/4699979891077312306).

Naprawiono układ pól treningu przy większym tekście, zachowanie rozgrzewki,
blokowanie kolejki Firebase po błędzie sieci, rzeczywistą nazwę dnia przesuniętej
sesji i baner oczekującego zapisu po potwierdzeniu danych w chmurze. Android ma
osobne reguły CSS, ograniczone selektorem platformy.

- Źródło pakietu: `6a6bc2f5319b5c449deefdd7ed3b492699169eab`.
- AAB: 18 770 762 B, SHA-256
  `b58d1f034b115f1207ef6aa411549bde14776ca02e0280924049df120125d407`.
- JDK21, bundletool1.18.3: build i walidacja PASS. Podpis wszystkich wpisów
  zweryfikowany istniejącym certyfikatem uploadu. Kontrola 16 KB: PASS.
- 232 pliki runtime są zgodne z produkcyjnym buildem mobile oraz IPA148.
  Nie zawierają testowego konta, seeda ani mostu pomocniczego.
- Natywny fixture: API35 / 360dp / tekst100 i135%, pola czasu/asysty,
  rozgrzewka po zablokowaniu ekranu i zakończenie offline → potwierdzony sync.
- Podpisany produkcyjny APK54 zaktualizował lokalne53: cold start995ms,
  widoczny ekran logowania. To klucz uploadu, nie podpis Play App Signing.
  Instalacja sklepu na fizycznym Huawei pozostaje osobnym testem.

Dowody: [pakiet](artifact.json), [publikacja](play-delivery.json),
[niezależny odczyt](play-api-check.json), [lokalny preflight](local-preflight.json),
[pełny raport i screenshoty](../../../docs/STABILITY-2026-09-12.md).

Stan `state` w rejestrze źródeł nadal wymaga bieżącej weryfikacji przy następnym
wydaniu. Faktyczną dystrybucję tego builda opisują `verifiedDelivery` i powyższe
potwierdzenia. Publiczna premiera i konfiguracja płatności nie były częścią
tej aktualizacji testowej.
