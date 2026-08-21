import { useEffect, useMemo, useState } from 'react';
import { getCurrentAccent } from '@/lib/accent-theme';

// Lekki confetti bez zależności (CSS animacja). F-T2: kolory z akcentu usera.
// Naprawa r2 (2026-08-21, sędzia "jeden akcent"): bez hardkodowanego cyjanu —
// celebracja sypie wyłącznie odcieniami akcentu + bielą (brief: zakaz mieszania
// kolorów ozdobnych; przy amber/indigo cyjan łamał zasadę jednego akcentu).
const COLORS = () => {
  const accent = getCurrentAccent();
  return [accent.hex, '#ffffff', accent.lightHex];
};

interface ConfettiBurstProps {
  onDone?: () => void;
  durationMs?: number;
}

export const ConfettiBurst = ({ onDone, durationMs = 2600 }: ConfettiBurstProps) => {
  // X17D Z140.4: przy `prefers-reduced-motion` nie sypiemy konfetti w ogóle —
  // to czysta dekoracja, więc jej pominięcie niczego nie zabiera.
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [show, setShow] = useState(!reducedMotion);

  const pieces = useMemo(
    () => {
      const palette = COLORS();
      return Array.from({ length: 48 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1.8 + Math.random() * 1.2,
        color: palette[i % palette.length],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 6,
      }));
    },
    [],
  );

  useEffect(() => {
    const id = setTimeout(() => { setShow(false); onDone?.(); }, durationMs);
    return () => clearTimeout(id);
  }, [durationMs, onDone]);

  if (!show) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden" aria-hidden>
      <style>{`@keyframes ss-confetti-fall{0%{transform:translateY(-12vh) rotate(0);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: 'absolute',
            top: 0,
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            background: p.color,
            borderRadius: 2,
            transform: `rotate(${p.rotate}deg)`,
            animation: `ss-confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
};
