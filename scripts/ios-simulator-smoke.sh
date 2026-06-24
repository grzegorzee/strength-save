#!/usr/bin/env bash
set -euo pipefail

project="ios/App/App.xcodeproj"
scheme="App"
derived_data="${RUNNER_TEMP:-/tmp}/strength-save-derived-data"
bundle_id="com.grzegorzjasionowicz.strengthsave"

simulator_id="$(xcrun simctl list devices available -j | node -e '
  let data = "";
  process.stdin.on("data", (chunk) => { data += chunk; });
  process.stdin.on("end", () => {
    const devices = Object.values(JSON.parse(data).devices)
      .flat()
      .filter((device) => device.isAvailable && device.name.includes("iPhone"));
    if (!devices[0]) process.exit(1);
    process.stdout.write(devices[0].udid);
  });
')"

xcrun simctl boot "$simulator_id" 2>/dev/null || true
xcrun simctl bootstatus "$simulator_id" -b

xcodebuild \
  -project "$project" \
  -scheme "$scheme" \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=$simulator_id" \
  -derivedDataPath "$derived_data" \
  build

app_path="$derived_data/Build/Products/Debug-iphonesimulator/App.app"
test -d "$app_path"
xcrun simctl install "$simulator_id" "$app_path"
xcrun simctl launch --terminate-running-process "$simulator_id" "$bundle_id"
