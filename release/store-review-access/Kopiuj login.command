#!/bin/bash
set -euo pipefail
/usr/bin/security find-generic-password -s 'Strength Save / Store Review' | /usr/bin/python3 -c 'import re,sys; match=re.search(r"\"acct\"<blob>=\"([^\"]+)\"",sys.stdin.read()); sys.exit("Nie znaleziono loginu w pęku kluczy") if not match else sys.stdout.write(match.group(1))' | /usr/bin/pbcopy
printf 'Login konta recenzenta jest w schowku. Wklej go przez Cmd+V.\n'
