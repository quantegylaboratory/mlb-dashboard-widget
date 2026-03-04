#!/bin/bash
# Mets Widget Settings — double-click to open the settings UI
# Starts the server on localhost:1986 (if not already running) and opens Safari.

WIDGET_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PORT=1986
PID_FILE="/tmp/mlb_dashboard_server.pid"
LOG_FILE="/tmp/mlb_dashboard_server.log"
URL="http://localhost:${PORT}"

# ── Check if server is already running on this port ──────────────────────────
if lsof -ti tcp:${PORT} >/dev/null 2>&1; then
  echo "Server already running on port ${PORT}."
else
  echo "Starting MLB Dashboard settings server on port ${PORT}..."
  nohup python3 "${WIDGET_DIR}/dashboard.py" --serve \
    > "${LOG_FILE}" 2>&1 &
  echo $! > "${PID_FILE}"

  # Wait for server to come up (up to 5 seconds)
  for i in $(seq 1 10); do
    if curl -s -o /dev/null "${URL}/config"; then
      break
    fi
    sleep 0.5
  done
fi

# ── Open in default browser ───────────────────────────────────────────────────
echo "Opening ${URL} ..."
open "${URL}"
