import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ProgressRedirect } from '@/components/ProgressRedirect';

// A5 (X70): zakładka nazywa się "Postępy", więc stary/intuicyjny deep link
// /progress musi lądować na kanonicznym /achievements (jak /settings → /profile).

const Probe = () => {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}{location.search}</div>;
};

const renderAt = (entry: string) =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/progress" element={<ProgressRedirect />} />
        <Route path="/achievements" element={<Probe />} />
      </Routes>
    </MemoryRouter>,
  );

describe('trasa /progress → redirect do /achievements', () => {
  it('/progress ląduje na /achievements', () => {
    renderAt('/progress');
    expect(screen.getByTestId('path').textContent).toBe('/achievements');
  });
});
