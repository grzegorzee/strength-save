# Connect IQ release evidence

This directory contains the source-controlled Store metadata for Strength Save.
Generated `.prg` and signed `.iq` files remain in ignored `garmin/bin/`.

## Build contract

- SDK: Connect IQ 9.2.0.
- Manifest products: every ID is classified in `device-matrix.json`.
- Representative simulator coverage: `epix2` (round/touch), `fr255`
  (round/buttons), and `venusq2` (rectangle/touch).
- Export command: `monkeyc -e -o bin/strengthsave.iq -f monkey.jungle
  -y ~/.garmin/developer_key.der -w`.
- The only accepted compiler warnings are launcher-icon scaling on products
  whose launcher slot is larger than the 40x40 on-device source. Store artwork
  is a separate 1024x1024 asset and is not affected.
- The 2026-08-10 export builds all 16 manifest device IDs into 27 product
  binaries. The signed package is 644900 bytes with SHA-256
  `5f4f4b5d3b638b3b69d957d21573bb79d3b87c545e7f9a5c09bf7cac7c8a8c98`;
  machine-readable evidence is in `artifact.json`.
- Simulator screenshots are real, unpaired application states on `fr255`
  (round/buttons) and `venusq2` (rectangle/touch). No account or production
  workout was used.

The signing key is intentionally outside the repository. The source and local
backup are mode 600 and share SHA-256
`63eee010b63c51cfb0d47b2a208eeb83917d7d68a4fb4e072b01c165875730e9`.
An off-host encrypted backup is still required before Store submission.

## Submission state

The package, bilingual listing, icon, two shape screenshots, privacy URL, and
review notes are locally ready. A populated-plan screenshot from the isolated
review account, portal upload/validation, physical-device G1-G9 result, and
**Submit for review** remain release gates, not substitutes for the local
export.
