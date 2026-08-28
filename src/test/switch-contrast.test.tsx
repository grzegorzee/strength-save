import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Switch } from '@/components/ui/switch';

describe('Switch visual contract', () => {
  it('keeps the inactive track and thumb visible and exposes a keyboard focus indicator', () => {
    render(<Switch aria-label="Test switch" />);

    const control = screen.getByRole('switch', { name: 'Test switch' });
    const track = control.querySelector('[aria-hidden="true"]');
    const thumb = control.lastElementChild;

    expect(control).toHaveClass('h-11', 'w-11');
    expect(track).toHaveClass('h-6', 'border-2', 'border-muted-foreground');
    expect(control).toHaveClass(
      'focus-visible:outline-none',
      'focus-visible:ring-2',
      'focus-visible:ring-ring',
      'focus-visible:ring-offset-2',
    );
    expect(thumb).toHaveClass(
      'data-[state=unchecked]:bg-foreground',
      'data-[state=checked]:bg-primary-foreground',
    );
  });

  it('routes every production switch through the outlined shared primitive', () => {
    const sourceRoot = join(process.cwd(), 'src');
    const productionFiles: string[] = [];
    const visit = (directory: string) => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'test') visit(path);
        } else if (entry.name.endsWith('.tsx')) {
          productionFiles.push(path);
        }
      }
    };

    visit(sourceRoot);

    const switchConsumers = productionFiles.filter((path) => {
      if (path.endsWith(join('components', 'ui', 'switch.tsx'))) return false;
      return readFileSync(path, 'utf8').includes('<Switch');
    });

    expect(switchConsumers.length).toBeGreaterThan(0);
    for (const path of switchConsumers) {
      const source = readFileSync(path, 'utf8');
      expect(
        source,
        `${relative(process.cwd(), path)} must use the shared outlined Switch`,
      ).toContain("import { Switch } from '@/components/ui/switch';");
    }

    const customSwitches = productionFiles.filter((path) =>
      readFileSync(path, 'utf8').includes('role="switch"'),
    );
    expect(customSwitches, 'custom role="switch" controls bypass the shared outline').toEqual([]);

    const unnamedSwitches = switchConsumers.flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      return [...source.matchAll(/<Switch\b[\s\S]*?\/>/g)]
        .filter(([tag]) => !/aria-label(?:ledby)?=/.test(tag))
        .map(() => relative(process.cwd(), path));
    });
    expect(unnamedSwitches, 'every switch must expose an accessible name').toEqual([]);
  });
});
