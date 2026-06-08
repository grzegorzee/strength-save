import { useEffect, useMemo, useState } from 'react';

// Lekki confetti bez zależności (CSS animacja). Kolory marki Kinetic.
const COLORS = ['#cefc22', '#00e3fd', '#ffffff', '#f4ffc9'];

interface ConfettiBurstProps {
  onDone?: () => void;
  durationMs?: number;
}

export const ConfettiBurst = ({ onDone, durationMs = 2600 }: ConfettiBurstProps) => {
  const [show, setShow] = useState(true);

  const pieces = useMemo(
    () => Array.from({ length: 48 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.5,
      duration: 1.8 + Math.random() * 1.2,
      color: COLORS[i % COLORS.length],
      rotate: Math.random() * 360,
      size: 6 + Math.random() * 6,
    })),
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
