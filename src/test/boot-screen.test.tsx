import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BootScreen } from '@/components/BootScreen';

describe('BootScreen', () => {
  it('pokazuje małe logo i cienki pasek indeterminate bez wirującego kółka', () => {
    const { container } = render(<BootScreen />);

    expect(screen.getByRole('img', { name: 'Strength Save' })).toHaveClass('h-16', 'w-16');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', 'Loading');
    expect(container.querySelector('.animate-spin')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('jest jedynym loaderem dla auth, profilu, tras i paywalla', () => {
    const sources = [
      readFileSync('src/App.tsx', 'utf8'),
      readFileSync('src/components/AuthenticatedApp.tsx', 'utf8'),
      readFileSync('src/components/PaywallRouteGuard.tsx', 'utf8'),
    ];

    for (const source of sources) {
      expect(source).toContain("from '@/components/BootScreen'");
      expect(source).not.toMatch(/const AppLoader|Loader2[^\n]*animate-spin/);
    }
  });

  it('utrzymuje natywny pierwszy frame w tym samym rozmiarze i położeniu', () => {
    const ios = readFileSync('ios/App/App/Base.lproj/LaunchScreen.storyboard', 'utf8');
    const androidStyle = readFileSync('android/app/src/main/res/values/styles.xml', 'utf8');
    const androidSplash = readFileSync('android/app/src/main/res/drawable/boot_splash.xml', 'utf8');

    expect(ios).toContain('image="BootLogo"');
    expect(ios).toContain('constant="64"');
    expect(ios).toContain('firstAttribute="centerX"');
    expect(ios).toContain('firstAttribute="centerY"');
    expect(androidStyle).toContain('@drawable/boot_splash');
    expect(androidSplash).toContain('android:width="64dp"');
    expect(androidSplash).toContain('android:height="64dp"');
    expect(androidSplash).toContain('@drawable/boot_logo');
  });
});
