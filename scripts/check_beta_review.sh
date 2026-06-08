#!/bin/bash
# Wrapper: odpala check_beta_review.py przez uv, potem sam się wyrejestrowuje (jednorazowy run).
set -e
UV="/Users/grzegorzjasionowicz/.local/bin/uv"
DIR="/Users/grzegorzjasionowicz/FIRMA/projekty/strength_save"
PLIST="$HOME/Library/LaunchAgents/com.strengthsave.betareview.plist"
LABEL="com.strengthsave.betareview"

"$UV" run --with pyjwt --with cryptography python "$DIR/scripts/check_beta_review.py" \
  >> "$DIR/beta_review_status.log" 2>&1 || true

# Self-cleanup: jednorazowy harmonogram, usuń się po wykonaniu
/bin/launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
/bin/rm -f "$PLIST" 2>/dev/null || true
