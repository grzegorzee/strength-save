import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const read = (path: string) => readFileSync(path, 'utf8');
const android = 'android/app/src/main/java/com/grzegorzjasionowicz/strengthsave/HealthSyncPlugin.kt';
const ios = 'ios/App/App/HealthSync/HealthSyncPlugin.swift';

describe('native Health system contracts for launch', () => {
  it('a first Android request launches the system permission contract and resolves its result', () => {
    const source = read(android);
    expect(source).toContain('PermissionController.createRequestPermissionResultContract()');
    expect(source).toContain('startActivityForResult(call, intent, "healthPermissionsResult")');
    expect(source).toContain('@ActivityCallback');
    expect(source).toContain('permissionContract.parseResult(result.resultCode, result.data)');
    expect(source).not.toContain('ACTION_HEALTH_CONNECT_SETTINGS');
  });
  it('Health Connect can discover its provider and open the required policy on both Android generations', () => {
    const source = read('android/app/src/main/AndroidManifest.xml');
    expect(source).toContain('com.google.android.apps.healthdata');
    expect(source).toContain('androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE');
    expect(source).toContain('android.intent.action.VIEW_PERMISSION_USAGE');
    expect(source).toContain('android.permission.START_VIEW_PERMISSION_USAGE');
  });
  it('iOS distinguishes request completion from actual workout write permission without claiming read status', () => {
    const source = read(ios);
    expect(source).toContain('authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized');
    expect(source).toContain('purpose == "weight"');
  });
  it('system record identity survives a lost acknowledgement and a repeat write on both platforms', () => {
    expect(read(android)).toContain('clientRecordId = recordId');
    expect(read(android)).toContain('clientRecordVersion = recordVersion.toLong()');
    expect(read(ios)).toContain('HKMetadataKeySyncIdentifier: recordId');
    expect(read(ios)).toContain('HKMetadataKeySyncVersion: Int64(recordVersion)');
    expect(read(ios)).toContain('builder.addMetadata');
  });
  it('starts HealthKit collection before attaching any metadata', () => {
    const source = read(ios);
    expect(source.indexOf('builder.beginCollection')).toBeLessThan(source.indexOf('builder.addMetadata'));
  });
  it('optional energy samples require energy authorization and collection errors cannot silently succeed', () => {
    const source = read(ios);
    expect(source).toContain('authorizationStatus(for: energyType) == .sharingAuthorized');
    expect(source).toContain('guard ended else');
    expect(source).toContain('guard added else');
  });
});
