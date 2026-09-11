#!/bin/bash
cd /Users/zp/Code/doc-site/.claude/worktrees/anti-bot || exit 1
for i in $(seq 1 30); do
  if git push origin HEAD:main 2>/dev/null; then
    echo "PUSHED_OK attempt=$i"
    exit 0
  fi
  sleep 45
done
echo "PUSH_FAILED_AFTER_30_TRIES"
exit 1
