import { useEffect, useRef } from 'react';

/*
  Soft cursor trail for the public site: a short, light blue line follows the
  mouse and fades out. Desktop mouse only; nothing runs on touch screens,
  with "reduced motion" or while the mouse is still.
  Purely decorative (pointer-events: none, hidden from screen readers).
*/
const POINTS = 10;

export default function CursorTrail() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return undefined;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;

    const points = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      // Points age out, so the line shrinks back when the mouse stops
      points.forEach((point) => { point.life -= 1; });
      while (points.length && points[0].life <= 0) points.shift();

      for (let index = 1; index < points.length; index += 1) {
        const a = points[index - 1];
        const b = points[index];
        const strength = (index / points.length) * Math.min(1, b.life / POINTS);

        context.strokeStyle = `rgba(143, 188, 255, ${0.5 * strength})`;
        context.lineWidth = 0.6 + 2.2 * strength;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }

      if (!points.length) {
        running = false;
        return;
      }

      frame = requestAnimationFrame(draw);
    };

    const onMove = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;

      points.push({ x: event.clientX, y: event.clientY, life: POINTS });
      if (points.length > POINTS) points.shift();

      if (!running) {
        running = true;
        frame = requestAnimationFrame(draw);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="cursorTrail" aria-hidden="true" />;
}
