# Usage Instructions for `dotenvx-env-audit.sh`

**New script — the main deliverable:**
```zsh
# Audit all 4 repos
bash ~/LocalStorm/Workspace/DevProjects/GitHub/scripts/dotenvx-env-audit.sh

# Audit one repo
bash ~/LocalStorm/Workspace/DevProjects/GitHub/scripts/dotenvx-env-audit.sh --repo fas-medusa

# Stamp current key set as intentional (after adding/removing a key)
bash ~/LocalStorm/Workspace/DevProjects/GitHub/scripts/dotenvx-env-audit.sh --ack --note "added SENTRY_DSN"

# Stamp a single repo
bash ~/LocalStorm/Workspace/DevProjects/GitHub/scripts/dotenvx-env-audit.sh --repo fas-dash --ack --note "removed GMC keys"

# See full key lists, not just deltas
bash ~/LocalStorm/Workspace/DevProjects/GitHub/scripts/dotenvx-env-audit.sh --verbose
```
---

**Daily Use:**
```bash
env-audit
```
```bash
env-ack --repo fas-cms-fresh --note "reason"
```

**Existing commands that got corrected** (were pointing at `.env` or `.env-railway`, now point at `.env.local`):
```zsh
# fas-medusa
npm run env:check:local          # was --file .env, now .env.local

# fas-cms-fresh  
yarn env:check:local             # already correct
yarn env:check:netlify           # was --file .env, now .env.local

# fas-dash
npm run env:check:vercel         # was already correct (.env.local)

# cross-repo runner
node GitHub/scripts/check-all-fas-env.mjs   # stale checks removed, all now use .env.local
```

**`secret-link.sh` default corrected** (used when symlinking a new `.env.local`):
```zsh
# Was defaulting to .env, now defaults to .env.local
bash fas-sanity/scripts/secret-link.sh fas-medusa /path/to/fas-medusa
#                                                  ↑ third arg defaults to .env.local now
```