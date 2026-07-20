#!/usr/bin/env bash
# Build apki CIQ: ./build.sh <device> [sciezka-do-developer_key.der]
# Wymaga SDK w PATH (SDK Manager -> "Use as current SDK").
set -euo pipefail
DEVICE="${1:-fenix7}"
KEY="${2:-$HOME/.garmin/developer_key.der}"
mkdir -p bin
monkeyc -o "bin/strengthsave-$DEVICE.prg" -f monkey.jungle -d "$DEVICE" -y "$KEY" -w
echo "OK: bin/strengthsave-$DEVICE.prg (symulator: connectiq & monkeydo bin/strengthsave-$DEVICE.prg $DEVICE)"
