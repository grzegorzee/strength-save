#!/usr/bin/env ruby
# Dodaje widget extension "StrengthWatchWidgets" (komplikacje WidgetKit) do
# aplikacji zegarkowej StrengthWatch. Idempotentny.

require 'xcodeproj'

PROJECT_PATH = File.expand_path('../ios/App/App.xcodeproj', __dir__)
WIDGET_TARGET_NAME = 'StrengthWatchWidgets'
WATCH_TARGET_NAME = 'StrengthWatch'
WIDGET_BUNDLE_ID = 'com.grzegorzjasionowicz.strengthsave.watchkitapp.widgets'
TEAM_ID = 'J4CRD2SA6D'
BUILD_NUMBER = '35'

project = Xcodeproj::Project.open(PROJECT_PATH)
watch_target = project.targets.find { |t| t.name == WATCH_TARGET_NAME }
raise 'Brak targetu StrengthWatch — odpal najpierw add_watch_target.rb' unless watch_target

widget_target = project.targets.find { |t| t.name == WIDGET_TARGET_NAME }
if widget_target.nil?
  widget_target = project.new_target(:app_extension, WIDGET_TARGET_NAME, :watchos, '10.0')
  puts "Utworzono target #{WIDGET_TARGET_NAME}"
end

widget_target.build_configurations.each do |config|
  s = config.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = WIDGET_BUNDLE_ID
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['DEVELOPMENT_TEAM'] = TEAM_ID
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['SWIFT_VERSION'] = '5.0'
  s['WATCHOS_DEPLOYMENT_TARGET'] = '10.0'
  s['SDKROOT'] = 'watchos'
  s['TARGETED_DEVICE_FAMILY'] = '4'
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['INFOPLIST_FILE'] = 'WatchWidgets/Info.plist'
  s['CURRENT_PROJECT_VERSION'] = BUILD_NUMBER
  s['MARKETING_VERSION'] = '0.0.1'
  s['SKIP_INSTALL'] = 'YES'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
end

# Źródła
widget_group = project.main_group['WatchWidgets'] || project.main_group.new_group('WatchWidgets', 'WatchWidgets')
%w[StrengthWidgets.swift].each do |name|
  next if widget_group.files.any? { |f| f.display_name == name }
  ref = widget_group.new_file(name)
  widget_target.source_build_phase.add_file_reference(ref, true)
  puts "#{WIDGET_TARGET_NAME} <- WatchWidgets/#{name}"
end
if widget_group.files.none? { |f| f.display_name == 'Info.plist' }
  widget_group.new_file('Info.plist')
end

# Zależność + embed w aplikacji zegarkowej (PlugIns)
unless watch_target.dependencies.any? { |d| d.target&.name == WIDGET_TARGET_NAME }
  watch_target.add_dependency(widget_target)
  puts 'StrengthWatch zależy od StrengthWatchWidgets'
end

embed_phase = watch_target.copy_files_build_phases.find { |p| p.name == 'Embed App Extensions' }
if embed_phase.nil?
  embed_phase = watch_target.new_copy_files_build_phase('Embed App Extensions')
  embed_phase.dst_subfolder_spec = '13' # PlugIns
  embed_phase.dst_path = ''
  puts 'Dodano fazę Embed App Extensions'
end
product_ref = widget_target.product_reference
unless embed_phase.files_references.include?(product_ref)
  build_file = embed_phase.add_file_reference(product_ref, true)
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  puts 'Embed: StrengthWatchWidgets.appex'
end

project.save
puts 'OK: projekt zapisany'
