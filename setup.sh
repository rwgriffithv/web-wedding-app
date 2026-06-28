#!/usr/bin/env bash
#
# setup.sh
#
# One-shot convenience script to initialize all toolkit submodules and run
# their setup-host and bootstrap scripts in dependency order.
#
# Usage: ./setup.sh [--force]
#
set -euo pipefail

########################################
# Logging
########################################

GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
CYAN="\033[0;36m"
NC="\033[0m"

info()    { echo -e "${BLUE}==>${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC} $*"; }
fail()    { echo -e "${RED}✗${NC} $*"; exit 1; }
section() { echo -e "\n${CYAN}━━━ $* ━━━${NC}"; }

########################################
# Guard: must run from project root
########################################

[[ -f .gitmodules ]] || fail "Run this script from the project root (where .gitmodules lives)."

########################################
# Parse Arguments
########################################

FORCE=false
FORCE_FLAG=""
while [[ $# -gt 0 ]]; do
    case "$1" in
        --force)
            FORCE=true
            FORCE_FLAG="--force"
            shift
            ;;
        --help|-h)
            cat <<EOF
Usage: setup.sh [options]

Options:
  --force   Pass --force to all submodule scripts, overwriting existing configs
  --help    Show this help message
EOF
            exit 0
            ;;
        *)
            fail "Unknown option: $1"
            ;;
    esac
done

if [[ "$FORCE" == true ]]; then
    info "Force mode enabled — will overwrite existing configurations."
fi

START_TIME=$(date +%s)

########################################
# Submodule Registry
#
# Add new toolkit submodules here. Order matters — earlier entries are
# processed first (use dependency order, not alphabetical).
#
# Each entry: "<relative-path>|<Human-readable label>"
########################################

SUBMODULES=(
    "web-deploy-env|Web Deployment Environment"
    "agent-dev-env|Agentic Development Environment"
)

########################################
# Step 1: Initialize / update submodules
########################################

section "Step 1: Git Submodules"

for entry in "${SUBMODULES[@]}"; do
    IFS="|" read -r path label <<< "$entry"

    # Submodule is initialized if its directory contains a .git entry (file or dir)
    if [[ -d "$path/.git" ]] || [[ -f "$path/.git" ]]; then
        success "$label already initialized in $path."
    else
        info "Initializing $label..."
        git submodule update --init --remote "$path"
        success "$label initialized in $path."
    fi
done

########################################
# Step 2: Run per-submodule scripts
########################################

section "Step 2: Submodule Scripts"

for entry in "${SUBMODULES[@]}"; do
    IFS="|" read -r path label <<< "$entry"

    echo -e "\n${CYAN}--- $label ($path) ---${NC}"

    setup_script="$path/scripts/setup-host.sh"
    bootstrap_script="$path/scripts/bootstrap.sh"

    # setup-host.sh
    if [[ -f "$setup_script" ]]; then
        info "Running setup-host.sh..."
        bash "$setup_script" $FORCE_FLAG
    else
        info "No setup-host.sh found — skipping."
    fi

    # bootstrap.sh
    if [[ -f "$bootstrap_script" ]]; then
        info "Running bootstrap.sh..."
        bash "$bootstrap_script" $FORCE_FLAG
    else
        info "No bootstrap.sh found — skipping."
    fi
done

########################################
# Summary
########################################

DURATION=$(( $(date +%s) - START_TIME ))

section "Complete"
success "All submodules initialized and bootstrapped in ${DURATION}s."
printf "  %-20s %s\n" "Submodules:" "${#SUBMODULES[@]} processed"
printf "  %-20s %s\n" "Force mode:" "$FORCE"
echo ""
