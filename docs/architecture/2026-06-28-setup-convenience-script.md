# Root-Level `setup.sh` Convenience Script

- **Date:** 2026-06-28
- **Context:** Toolkit submodules (`agent-dev-env`, `web-deploy-env`) each have their own `setup-host.sh` and `bootstrap.sh` scripts, but users had to run them individually in the correct order, remember the submodule update command, and know which submodules exist. This was friction for onboarding and maintenance.
- **Design Pattern:** Sequential Pipeline (Orchestrator). The script defines an ordered list of submodules and delegates to each submodule's own scripts without duplicating logic.
- **Blueprint:** `setup.sh` at project root.
- **Compliance:**
  - `agent-dev-env/rules/scripting-standards.md` — Uses `set -euo pipefail`, idempotent (delegates to idempotent sub-scripts), non-destructive, clear logging with `✓`/`⚠`/`✗` markers, explicit `--help`, `chmod +x`.
  - `agent-dev-env/rules/container-standards.md` — Not applicable (host-level).
  - `web-deploy-env` rules — Not applicable.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Script location | Root (`setup.sh`) | Matches existing `deploy.sh`, `backup.sh` convention |
| Submodule order | web-deploy-env → agent-dev-env | web-deploy base image must exist before agent-dev-env devcontainer builds on it |
| Submodule registry | Flat array with `path\|label` format | One line per submodule; easy to add more |
| Force flag | `--force` → passes through as `--force` | Leverages existing flag in submodule scripts |
| No idempotency reimplementation | Delegates entirely | Submodule scripts already guarantee idempotency |
| Root guard | Checks `.gitmodules` | Ensures correct CWD without guessing |

## Usage

```bash
./setup.sh           # Normal: safe, idempotent
./setup.sh --force   # Force: overwrite existing configs
./setup.sh --help    # Usage info
```
