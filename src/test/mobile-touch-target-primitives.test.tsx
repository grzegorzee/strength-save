import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

describe('mobile touch-target baseline', () => {
  it.each([
    ['default', undefined, 'h-10'],
    ['small', 'sm' as const, 'h-9'],
    ['large', 'lg' as const, 'h-11'],
    ['icon', 'icon' as const, 'h-10'],
  ])('Button %s keeps its visual density inside a 44 px mobile target', (label, size, visualHeight) => {
    render(<Button size={size} aria-label={label}>{label}</Button>);

    const button = screen.getByRole('button', { name: label });
    expect(button).toHaveClass(
      'min-h-11',
      'min-w-11',
      'desktop-shell:min-h-0',
      'desktop-shell:min-w-0',
      visualHeight,
    );
  });

  it('TabsTrigger exposes a 44 px mobile target without enlarging its active pill', () => {
    render(
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Podsumowanie</TabsTrigger>
          <TabsTrigger value="charts">Wykresy</TabsTrigger>
        </TabsList>
      </Tabs>,
    );

    const tab = screen.getByRole('tab', { name: 'Podsumowanie' });
    expect(tab).toHaveClass(
      'min-h-11',
      'min-w-11',
      'desktop-shell:min-h-0',
      'desktop-shell:min-w-0',
      "before:content-['']",
      'before:inset-y-2',
      'desktop-shell:before:inset-y-0',
      'data-[state=active]:before:bg-background',
    );
    expect(tab).not.toHaveClass('data-[state=active]:bg-background');
  });
});
