# Deploy-Only Mode & Default Base Image Decoupling

## Context

`setup.sh` unconditionally ran submodule scripts for both `web-deploy-env` (Docker host setup, infrastructure templates) and `agent-dev-env` (Ollama, devcontainer, agent skills). On a deployment-only host, the agent setup was unnecessary and could fail (e.g., no GPU, missing `BRAVE_API_KEY`).

Additionally, the Dockerfile's `dev-base` stage defaulted to `agent-dev-env` as its base image — a layer that adds tools (opencode-ai, Playwright deps, git, curl) which are irrelevant for `npm install && npm run build`. This forced a dependency on the agent image even for production builds.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Flag name | `--deploy-only` | Explicit about what it skips (agent = deploy-*only*, not just deploy-adjacent). |
| Submodule filtering | Skip by path matching `*agent-dev-env*` | Simple, no new data structures needed. The submodule registry already separates concerns by path. |
| Default `DEV_BASE_IMAGE` | `web-deploy-base` | The agent image adds only dev tools; `web-deploy-base` has everything needed for building (Node.js, npm). Smaller, faster, fewer dependencies. |
| Override mechanism | `.env` via `docker-compose.yml` `build.args` | Docker Compose resolves `${VAR:-default}` from `.env` automatically. No script or template changes needed for customization. |
| `deploy.sh` changes | None | The default is now correct, and overrides flow through `.env`. No reason to touch the deploy orchestrator. |

## Blueprint

- [`setup.sh`](../../setup.sh) — `--deploy-only` flag, submodule filtering, updated help text
- [`web-deploy-env/templates/Dockerfile`](../../web-deploy-env/templates/Dockerfile) — changed `DEV_BASE_IMAGE` default
- [`web-deploy-env/templates/docker-compose.yml`](../../web-deploy-env/templates/docker-compose.yml) — added `build.args` for `DEV_BASE_IMAGE` and `PROD_BASE_IMAGE`
- [`web-deploy-env/docs/deployment-strategy.md`](../../web-deploy-env/docs/deployment-strategy.md) — updated lineage hierarchy and configuration table

## Compliance

- [x] `agent-dev-env/rules/scripting-standards.md` — idempotent arg parsing (`--deploy-only` follows same pattern as `--force`)
- [x] `rules/typescript-nextjs.md` — not applicable (infrastructure change)
- [x] `web-deploy-env/docs/deployment-strategy.md` — updated to reflect new defaults
- [x] No secrets or credentials introduced
- [x] Backward compatible — `--deploy-only` is optional, existing usage unchanged
