#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="${HOME}/.openclaw/openclaw.json"

# Resolve plugin directory: use local repo if running from it, otherwise download
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || echo "")"
REPO_DIR="$(dirname "$SCRIPT_DIR" 2>/dev/null || echo "")"

PLUGIN_VERSION="0.0.8"

if [[ -n "$REPO_DIR" && -f "$REPO_DIR/index.ts" && -f "$REPO_DIR/openclaw.plugin.json" ]]; then
  # Running from the repo — use it directly
  PLUGIN_DIR="$REPO_DIR"
  LOCAL_MODE=true
else
  # Download from GitHub
  PLUGIN_DIR="${HOME}/.openclaw/plugins/nats-channel"
  REPO_URL="https://m64.io/nats-channels/nats-agents-${PLUGIN_VERSION}.tgz"
  LOCAL_MODE=false
fi

echo ""
echo "🔌 NATS Agent Plugin for OpenClaw v${PLUGIN_VERSION}"
echo ""

# --- Guided setup ---
# When piped from curl, stdin is the script — read from terminal instead
if [[ -t 0 ]]; then
  INPUT=/dev/stdin
else
  INPUT=/dev/tty
fi

read -rp "Agent name (how you appear on the network): " AGENT_NAME < "$INPUT"
if [[ -z "$AGENT_NAME" ]]; then
  echo "Error: agent name is required."
  exit 1
fi
if [[ ! "$AGENT_NAME" =~ ^[-a-zA-Z0-9_]+$ ]]; then
  echo "Error: only letters, numbers, dashes, and underscores allowed."
  exit 1
fi

read -rp "Description [OpenClaw agent]: " DESCRIPTION < "$INPUT"
DESCRIPTION="${DESCRIPTION:-OpenClaw agent}"

read -rp "Organization namespace (optional, for shared servers): " ORG < "$INPUT"

read -rp "NATS server URL [demo.nats.io]: " NATS_URL < "$INPUT"
NATS_URL="${NATS_URL:-demo.nats.io}"

read -rp "Enable streaming responses? [Y/n]: " STREAMING_INPUT < "$INPUT"
STREAMING_INPUT="${STREAMING_INPUT:-Y}"
if [[ "$STREAMING_INPUT" =~ ^[Yy] ]]; then
  STREAMING=true
else
  STREAMING=false
fi

echo ""

if [[ "$LOCAL_MODE" == "true" ]]; then
  echo "Using local repo: $PLUGIN_DIR"
  cd "$PLUGIN_DIR" && npm install --silent 2>/dev/null
else
  echo "Downloading plugin..."
  rm -rf "$PLUGIN_DIR"
  mkdir -p "$PLUGIN_DIR"
  curl -fsSL "$REPO_URL" | tar xz -C "$PLUGIN_DIR"
  echo "Installing dependencies..."
  cd "$PLUGIN_DIR" && npm install --omit=dev --silent 2>/dev/null
fi

# --- Write config ---
echo "Configuring..."

# Add plugin load path if not already present
if command -v python3 &>/dev/null; then
  python3 -c "
import json, sys

cfg_path = '$CONFIG_FILE'
plugin_path = '$PLUGIN_DIR'
agent_name = '$AGENT_NAME'
description = '$DESCRIPTION'
nats_url = '$NATS_URL'
streaming = '$STREAMING' == 'true'
org = '$ORG'

try:
    with open(cfg_path, 'r') as f:
        cfg = json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    cfg = {}

# Add plugin load path
plugins = cfg.setdefault('plugins', {})
load = plugins.setdefault('load', {})
paths = load.setdefault('paths', [])
if plugin_path not in paths:
    paths.append(plugin_path)

# Add NATS channel config
channels = cfg.setdefault('channels', {})
nats = channels.setdefault('nats', {})
accounts = nats.setdefault('accounts', {})
account = {
    'url': 'nats://' + nats_url if '://' not in nats_url else nats_url,
    'agentName': agent_name,
    'description': description,
    'streaming': streaming,
}
if org:
    account['org'] = org
accounts['default'] = account

with open(cfg_path, 'w') as f:
    json.dump(cfg, f, indent=2)
    f.write('\n')

print('Config written to ' + cfg_path)
"
else
  echo "Warning: python3 not found — please add the NATS config to $CONFIG_FILE manually."
  echo "See doc/SETUP.md for the config format."
fi

echo ""
echo "✅ Done! Restart OpenClaw to connect."
echo "   Agent \"$AGENT_NAME\" will be live on $NATS_URL"
echo ""
echo "   Restart: openclaw gateway restart"
echo "   Verify:  nats micro list"
echo ""
