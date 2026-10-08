import { useEffect, useRef } from 'react';

/*
  Soft cursor trail for the public site: a short fading blue line follows the
  mouse and a small ring eases after the pointer. Desktop mouse only; nothing
  runs on touch screens, with "reduced motion" or while the mouse is still.
  Purely decorative (pointer-events: none, hidden from screen readers).
*/
const POINTS = 22;

export default function CursorTrail() {
  const canvasRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduced.matches) return undefined;

    const canvas = canvasRef.current;
    const ring = ringRef.current;
    const context = canvas.getContext('2d');
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    let width = 0;
    let height = 0;
    let frame = 0;
    let running = false;
    let visible = false;

    const points = [];
    const target = { x: -100, y: -100 };
    const follow = { x: -100, y: -100 };

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

        context.strokeStyle = `rgba(29, 103, 213, ${0.62 * strength})`;
        context.lineWidth = 0.8 + 4 * strength;
        context.lineCap = 'round';
        context.beginPath();
        context.moveTo(a.x, a.y);
        context.lineTo(b.x, b.y);
        context.stroke();
      }

      // Ring eases towards the pointer
      follow.x += (target.x - follow.x) * 0.2;
      follow.y += (target.y - follow.y) * 0.2;
      ring.style.transform = `translate3d(${follow.x}px, ${follow.y}px, 0) translate(-50%, -50%)`;

      const settled = !points.length && Math.abs(target.x - follow.x) < 0.3 && Math.abs(target.y - follow.y) < 0.3;
      if (settled) {
        running = false;
        return;
      }

      frame = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(draw);
    };

    const onMove = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;

      target.x = event.clientX;
      target.y = event.clientY;

      if (!visible) {
        visible = true;
        follow.x = target.x;
        follow.y = target.y;
        ring.classList.add('on');
      }

      points.push({ x: target.x, y: target.y, life: POINTS });
      if (points.length > POINTS) points.shift();

      // Bigger ring over links and buttons
      const interactive = event.target instanceof Element && event.target.closest('a, button, [role="button"], input, select, textarea, label');
      ring.classList.toggle('link', Boolean(interactive));

      start();
    };

    const onLeave = () => {
      visible = false;
      ring.classList.remove('on');
      points.length = 0;
      start();
    };

    const onDown = () => ring.classList.add('down');
    const onUp = () => ring.classList.remove('down');

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="cursorTrail" aria-hidden="true" />
      <span ref={ringRef} className="cursorRing" aria-hidden="true" />
    </>
  );
}
