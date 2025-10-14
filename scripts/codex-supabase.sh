#!/usr/bin/env bash
set -euo pipefail

# Project-scoped Supabase MCP for Codex CLI
# Usage:
#   ./scripts/codex-supabase.sh [codex args...] [optional PROMPT]
#
# You can override via env vars:
#   SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN

PROJECT_REF="${SUPABASE_PROJECT_REF:-didbxinquugseweufvpr}"
ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-sbp_9b5191057e57e5f5f4164bac6f9cbaf6f4b0379e}"

exec codex \
  -c 'mcp_servers.supabase.command="npx"' \
  -c "mcp_servers.supabase.args=[\"-y\",\"@supabase/mcp-server-supabase@latest\",\"--project-ref=${PROJECT_REF}\"]" \
  -c "mcp_servers.supabase.env={\"SUPABASE_ACCESS_TOKEN\":\"${ACCESS_TOKEN}\"}" \
  "$@"

