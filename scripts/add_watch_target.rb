#!/usr/bin/env ruby
# Dodaje target watchOS "StrengthWatch" do ios/App/App.xcodeproj:
# - aplikacja SwiftUI (single-target watch app, companion dla apki iOS)
# - pliki źródłowe z ios/App/WatchApp/
# - embed "Embed Watch Content" w targecie App
# - pliki WatchBridge (plugin Capacitora) dopisane do targetu App
# Idempotentny: można odpalić wielokrotnie.

require 'xcodeproj'

PROJECT_PATH = File.expand_path('../ios/App/App.xcodeproj', __dir__)
WATCH_TARGET_NAME = 'StrengthWatch'
PHONE_BUNDLE_ID = 'com.grzegorzjasionowicz.strengthsave'
WATCH_BUNDLE_ID = "#{PHONE_BUNDLE_ID}.watchkitapp"
TEAM_ID = 'J4CRD2SA6D'

project = Xcodeproj::Project.open(PROJECT_PATH)
app_target = project.targets.find { |t| t.name == 'App' }
raise 'Brak targetu App' unless app_target

# --- 1. Pliki WatchBridge w targecie App ---
app_group = project.main_group.find_subpath('App', false) || project.main_group
watch_bridge_group = app_group['WatchBridge'] || app_group.new_group('WatchBridge', 'WatchBridge')
%w[PhoneWatchSessionManager.swift WatchBridgePlugin.swift BridgeViewController.swift].each do |name|
  next if watch_bridge_group.files.any? { |f| f.display_name == name }
  ref = watch_bridge_group.new_file(name)
  app_target.source_build_phase.add_file_reference(ref, true)
  puts "App <- WatchBridge/#{name}"
end

# --- 2. Target watchOS ---
watch_target = project.targets.find { |t| t.name == WATCH_TARGET_NAME }
if watch_target.nil?
  watch_target = project.new_target(:application, WATCH_TARGET_NAME, :watchos, '10.0')
  puts "Utworzono target #{WATCH_TARGET_NAME}"
end

watch_target.build_configurations.each do |config|
  s = config.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = WATCH_BUNDLE_ID
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['DEVELOPMENT_TEAM'] = TEAM_ID
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['SWIFT_VERSION'] = '5.0'
  s['WATCHOS_DEPLOYMENT_TARGET'] = '10.0'
  s['SDKROOT'] = 'watchos'
  s['TARGETED_DEVICE_FAMILY'] = '4'
  s['GENERATE_INFOPLIST_FILE'] = 'YES'
  s.delete('INFOPLIST_FILE')
  s['INFOPLIST_KEY_WKApplication'] = 'YES'
  s['INFOPLIST_KEY_WKCompanionAppBundleIdentifier'] = PHONE_BUNDLE_ID
  s['INFOPLIST_KEY_CFBundleDisplayName'] = 'Strength Save'
  s['CODE_SIGN_ENTITLEMENTS'] = 'WatchApp/StrengthWatch.entitlements'
  s['INFOPLIST_KEY_NSHealthShareUsageDescription'] = 'Tetno i kalorie podczas treningu silowego.'
  s['INFOPLIST_KEY_NSHealthUpdateUsageDescription'] = 'Zapis treningu silowego do Apple Health.'
  s['CURRENT_PROJECT_VERSION'] = '34'
  s['MARKETING_VERSION'] = '0.0.1'
  s['ENABLE_PREVIEWS'] = 'YES'
  s['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'AppIcon'
  s['ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME'] = 'AccentColor'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks']
end

# --- 3. Źródła watch ---
watch_group = project.main_group['WatchApp'] || project.main_group.new_group('WatchApp', 'WatchApp')
%w[StrengthWatchApp.swift ContentView.swift ExerciseDetailView.swift WorkoutModels.swift WorkoutStore.swift WorkoutSessionManager.swift].each do |name|
  next if watch_group.files.any? { |f| f.display_name == name }
  ref = watch_group.new_file(name)
  watch_target.source_build_phase.add_file_reference(ref, true)
  puts "#{WATCH_TARGET_NAME} <- WatchApp/#{name}"
end

# Asset catalog (AppIcon/AccentColor)
assets_name = 'Assets.xcassets'
if Dir.exist?(File.expand_path('../ios/App/WatchApp/Assets.xcassets', __dir__)) &&
   watch_group.files.none? { |f| f.display_name == assets_name }
  ref = watch_group.new_file(assets_name)
  watch_target.resources_build_phase.add_file_reference(ref, true)
  puts "#{WATCH_TARGET_NAME} <- WatchApp/#{assets_name}"
end

# --- 4. Zależność i embed w App ---
unless app_target.dependencies.any? { |d| d.target&.name == WATCH_TARGET_NAME }
  app_target.add_dependency(watch_target)
  puts 'App zależy od StrengthWatch'
end

embed_phase = app_target.copy_files_build_phases.find { |p| p.name == 'Embed Watch Content' }
if embed_phase.nil?
  embed_phase = app_target.new_copy_files_build_phase('Embed Watch Content')
  embed_phase.dst_subfolder_spec = '16' # products directory
  embed_phase.dst_path = '$(CONTENTS_FOLDER_PATH)/Watch'
  puts 'Dodano fazę Embed Watch Content'
end
product_ref = watch_target.product_reference
unless embed_phase.files_references.include?(product_ref)
  build_file = embed_phase.add_file_reference(product_ref, true)
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  puts 'Embed: StrengthWatch.app'
end

project.save
puts 'OK: projekt zapisany'
