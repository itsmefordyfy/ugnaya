#!/usr/bin/env bash
# Runs every UGNAYA web app's dev server at once, each with its own colour-coded
# log prefix. Ctrl+C stops them all.
#
#   npm run dev:all                 marketing, app, admin, merchant
#   npm run dev:all -- admin app    only the ones named
#
# Ports come from each app's own `dev` script (not set here):
#   marketing 3000 · app 3001 · admin 3002 · merchant 3003
set -u

cd "$(dirname "$0")/.."

ALL=(marketing app admin merchant)
PORT_marketing=3000
PORT_app=3001
PORT_admin=3002
PORT_merchant=3003
COLOR_marketing=36 # cyan
COLOR_app=32       # green
COLOR_admin=35     # magenta
COLOR_merchant=33  # yellow

if [ "$#" -gt 0 ]; then
  APPS=("$@")
else
  APPS=("${ALL[@]}")
fi

for name in "${APPS[@]}"; do
  case " ${ALL[*]} " in
    *" $name "*) ;;
    *) echo "Unknown app '$name'. Choose from: ${ALL[*]}" >&2; exit 1 ;;
  esac
  port_var="PORT_$name"
  if lsof -nP -iTCP:"${!port_var}" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port ${!port_var} ($name) is already in use. Stop that process first." >&2
    exit 1
  fi
done

PIDS=()
cleanup() {
  trap '' INT TERM EXIT
  echo
  echo "Stopping dev servers..."
  # Each app runs in its own process group (set -m), so kill the groups.
  for pid in "${PIDS[@]}"; do kill -TERM -- "-$pid" 2>/dev/null; done
  wait 2>/dev/null
  exit 0
}
trap cleanup INT TERM EXIT

set -m
for name in "${APPS[@]}"; do
  color_var="COLOR_$name"
  port_var="PORT_$name"
  label=$(printf '%-9s' "$name")
  (
    npm run dev --workspace "apps/$name" 2>&1 |
      while IFS= read -r line; do
        printf '\033[%sm%s |\033[0m %s\n' "${!color_var}" "$label" "$line"
      done
  ) &
  PIDS+=("$!")
  echo "Starting $name -> http://localhost:${!port_var}"
done

wait
