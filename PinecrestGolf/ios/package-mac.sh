#!/bin/bash
set -euo pipefail
if [[ $# -ne 2 ]]; then
  echo 'Usage: bash package-mac.sh /path/PinecrestGolf.app /path/PinecrestGolf-Mac.zip' >&2
  exit 1
fi
app_path="$1"
zip_path="$2"
if [[ "$(uname -s)" != Darwin || ! -d "$app_path/Contents" ]]; then
  echo 'Run on macOS with the exported Mac .app, not an iPhone app or source folder.' >&2
  exit 1
fi
if [[ -e "$zip_path" ]]; then
  echo 'Output already exists. Choose a new ZIP filename.' >&2
  exit 1
fi
codesign --verify --deep --strict --verbose=2 "$app_path"
xcrun stapler validate "$app_path"
spctl --assess --type execute --verbose=2 "$app_path"
ditto -c -k --sequesterRsrc --keepParent "$app_path" "$zip_path"
echo "Download package created: $zip_path"
