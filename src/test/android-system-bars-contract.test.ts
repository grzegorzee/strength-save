import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Android system bars contract', () => {
  it('switches from the splash theme to a dark app window on Android 15+', () => {
    const styles = readFileSync('android/app/src/main/res/values/styles.xml', 'utf8');

    expect(styles).toContain(
      '<item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>',
    );
    expect(styles).toMatch(
      /<style name="AppTheme\.NoActionBar"[\s\S]*?<item name="android:windowBackground">#0E0E0E<\/item>/,
    );
  });

  it('configures the bundled Capacitor SystemBars for light icons on both dark bars', () => {
    const config = readFileSync('capacitor.config.ts', 'utf8');

    expect(config).toMatch(
      /SystemBars:\s*\{[\s\S]*?style:\s*['"]DARK['"]/,
    );
  });
});
