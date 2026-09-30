import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// 2026-09-30 (1.0.2): https://strengthsave.app/open z maili otwiera apkę.
// Pliki weryfikacyjne leżą na landingu (public/.well-known/, kontrakt w
// strength_save_landing/api/well-known.test.ts). Tu pilnujemy strony apki.
const read = (path: string) => readFileSync(path, 'utf8');

describe('Universal Links (iOS)', () => {
  it('entitlement Associated Domains z applinks:strengthsave.app', () => {
    const entitlements = read('ios/App/App/App.entitlements');
    expect(entitlements).toMatch(
      /<key>com\.apple\.developer\.associated-domains<\/key>\s*<array>\s*<string>applinks:strengthsave\.app<\/string>\s*<\/array>/,
    );
  });

  it('AppDelegate przekazuje continueUserActivity do Capacitora (appUrlOpen)', () => {
    const delegate = read('ios/App/App/AppDelegate.swift');
    expect(delegate).toContain('ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)');
  });

  it('App target w Debug i Release podpisuje ten plik entitlements', () => {
    const pbx = read('ios/App/App.xcodeproj/project.pbxproj');
    expect(pbx.match(/CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/g)).toHaveLength(2);
  });
});

describe('App Links (Android)', () => {
  const manifest = read('android/app/src/main/AndroidManifest.xml');

  it('intent-filter autoVerify dla https://strengthsave.app/open*', () => {
    const filter = manifest.match(/<intent-filter android:autoVerify="true">[\s\S]*?<\/intent-filter>/)?.[0] ?? '';
    expect(filter).toContain('android.intent.action.VIEW');
    expect(filter).toContain('android.intent.category.DEFAULT');
    expect(filter).toContain('android.intent.category.BROWSABLE');
    expect(filter).toContain('<data android:scheme="https" />');
    expect(filter).toContain('<data android:host="strengthsave.app" />');
    expect(filter).toContain('<data android:pathPrefix="/open" />');
  });

  it('schemat strengthsave:// zostaje (intent z landingu dla buildów bez App Links)', () => {
    expect(manifest).toContain('<data android:scheme="strengthsave" />');
  });

  it('MainActivity singleTask: link w działającej apce idzie przez onNewIntent, bez drugiej instancji', () => {
    expect(manifest).toMatch(/android:name="\.MainActivity"[\s\S]*?android:launchMode="singleTask"/);
  });
});
