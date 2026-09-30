#!/bin/bash
set -euo pipefail
/usr/bin/security find-generic-password -s 'Strength Save / Store Review' -w | /usr/bin/pbcopy
printf 'Hasło konta recenzenta jest w schowku. Wklej je przez Cmd+V.\n'
