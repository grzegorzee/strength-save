#!/bin/sh
# SessionStart hook (Claude Code): stan CI "Deploy to GitHub Pages" na main.
# Czerwony = ostrzeżenie dla usera i kontekst dla agenta (naprawa przed nową pracą).
# Wdrożone 2026-10-05: run z 1.10 był czerwony 4 dni, bo nikt nie patrzył.
# Bez gh / sieci: cisza (hook nie może blokować startu sesji).
runs=$(gh run list --branch main --workflow deploy.yml --limit 10 \
  --json status,conclusion,headSha,displayTitle,url 2>/dev/null) || exit 0

printf '%s' "$runs" | jq -c '
  (map(select(.status == "completed" and .conclusion != "cancelled")) | first) as $last
  | (first | select(.status != "completed")) as $running
  | if $last == null then empty
    elif $last.conclusion == "success" then
      {hookSpecificOutput: {hookEventName: "SessionStart",
        additionalContext: ("CI main: zielone (\($last.headSha[0:8]) \($last.displayTitle))"
          + (if $running then "; w toku: \($running.headSha[0:8])" else "" end))}}
    else
      {systemMessage: "CI main CZERWONE: \($last.displayTitle) (\($last.headSha[0:8])) \($last.url)",
       hookSpecificOutput: {hookEventName: "SessionStart",
        additionalContext: ("UWAGA: ostatni run CI na main zakończył się \"\($last.conclusion)\" (\($last.headSha[0:8]) \($last.displayTitle), \($last.url))"
          + (if $running then "; nowszy run w toku: \($running.headSha[0:8])" else "" end)
          + ". Zanim zaczniesz nową pracę: poinformuj usera i zdiagnozuj fail (gh run view --log-failed).")}}
    end
' 2>/dev/null || exit 0
