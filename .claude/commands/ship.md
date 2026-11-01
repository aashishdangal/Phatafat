---
description: Check, review, and commit the current work
argument-hint: [commit message]
---

1. Use the test-runner subagent. If anything fails, stop and show me.
2. Use the reviewer subagent on the diff. Fix every "must fix" item, then re-run tests.
3. Commit with this message, or write a clear one if none is given: $ARGUMENTS
4. Show the commit hash and a one-line summary.

Do not push.
