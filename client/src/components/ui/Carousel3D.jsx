import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/*
  3D cylinder gallery: cards stand on a ring and rotate with page scroll,
  arrow buttons, dots, drag/swipe and the keyboard (← →).
  The card closest to the front is "active" and reported to the parent.

  Props:
    items        array of anything; renderCard(item, { active, index }) draws a card
    onActiveChange(index)
    labels       { prev, next, hint, goTo: (n) => string }
*/
export default function Carousel3D({ items, renderCard, onActiveChange, labels }) {
  const count = items.length;
  const step = 360 / count;

  const stageRef = useRef(null);
  const drag = useRef({ active: false, startX: 0, startOffset: 0, moved: 0 });

  const [offset, setOffset] = useState(0); // from arrows, dots, drag
  const [scrollTurn, setScrollTurn] = useState(0); // from page scroll
  const [dragging, setDragging] = useState(false);
  const [cardWidth, setCardWidth] = useState(320);
  const [reduced, setReduced] = useState(false);

  const rotation = offset + scrollTurn;
  const activeIndex = ((Math.round(-rotation / step) % count) + count) % count;

  useEffect(() => {
    onActiveChange?.(activeIndex);
  }, [activeIndex, onActiveChange]);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // Card size follows the stage width
  useEffect(() => {
    const element = stageRef.current;

    if (!element || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      setCardWidth(Math.round(Math.min(340, Math.max(200, width * 0.27))));
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  // Page scroll turns the ring (about half a turn while the gallery crosses the screen)
  useEffect(() => {
    if (reduced) {
      return undefined;
    }

    let frame = 0;

    const update = () => {
      frame = 0;
      const element = stageRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;
      const progress = Math.min(1, Math.max(0, (viewport - rect.top) / (viewport + rect.height)));

      setScrollTurn(-(progress - 0.5) * 180);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [reduced]);

  const snap = useCallback(
    (value) => {
      // Snap so that a card sits exactly at the front, whatever the scroll turn
      const total = value + scrollTurn;
      return Math.round(total / step) * step - scrollTurn;
    },
    [scrollTurn, step]
  );

  const go = useCallback((direction) => setOffset((value) => snap(value) - direction * step), [snap, step]);

  const goTo = (index) => {
    // Shortest way round to the chosen card
    let delta = -index * step - rotation;
    delta = ((delta + 180) % 360 + 360) % 360 - 180;
    setOffset((value) => snap(value + delta));
  };

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;

    drag.current = { active: true, startX: event.clientX, startOffset: offset, moved: 0 };
    setDragging(true);
  }

  function onPointerMove(event) {
    if (!drag.current.active) return;

    const dx = event.clientX - drag.current.startX;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));

    if (drag.current.moved > 4 && !stageRef.current.hasPointerCapture?.(event.pointerId)) {
      stageRef.current.setPointerCapture?.(event.pointerId);
    }

    setOffset(drag.current.startOffset + dx * (180 / Math.max(cardWidth * 3, 600)));
  }

  function onPointerUp() {
    if (!drag.current.active) return;

    drag.current.active = false;
    setDragging(false);
    setOffset((value) => snap(value));
  }

  // A drag must not open the card link
  function onClickCapture(event) {
    if (drag.current.moved > 6) {
      event.preventDefault();
      event.stopPropagation();
      drag.current.moved = 0;
    }
  }

  function onKeyDown(event) {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(document.documentElement.dir === 'rtl' ? -1 : 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(document.documentElement.dir === 'rtl' ? 1 : -1);
    }
  }

  const radius = Math.round((cardWidth / 2) / Math.tan(Math.PI / count) + cardWidth * 0.18);

  return (
    <div className="carousel3d">
      <div
        className={`carousel3dStage ${dragging ? 'dragging' : ''}`}
        ref={stageRef}
        style={{ '--card-w': `${cardWidth}px` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={labels?.hint}
      >
        <div
          className="carousel3dRing"
          style={{
            transform: `translateZ(${-radius}px) rotateY(${rotation}deg)`,
            transition: dragging || reduced ? 'none' : undefined,
          }}
        >
          {items.map((item, index) => {
            // Angle of this card relative to the front (-180…180)
            let relative = (index * step + rotation) % 360;
            relative = ((relative + 540) % 360) - 180;
            const distance = Math.abs(relative) / 180;
            const active = index === activeIndex;

            return (
              <div
                key={index}
                className={`carousel3dCard ${active ? 'active' : ''}`}
                style={{
                  transform: `rotateY(${index * step}deg) translateZ(${radius}px)`,
                  opacity: 1 - distance * 0.7,
                  filter: `brightness(${1 - distance * 0.55})`,
                  pointerEvents: Math.abs(relative) < step * 0.75 ? 'auto' : 'none',
                }}
                aria-hidden={!active}
              >
                {renderCard(item, { active, index })}
              </div>
            );
          })}
        </div>

        <button type="button" className="carousel3dArrow prev" onClick={() => go(-1)} aria-label={labels?.prev}>
          <ChevronLeft aria-hidden="true" />
        </button>

        <button type="button" className="carousel3dArrow next" onClick={() => go(1)} aria-label={labels?.next}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="carousel3dDots" role="tablist">
        {items.map((_, index) => (
          <button
            key={index}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={labels?.goTo ? labels.goTo(index + 1) : String(index + 1)}
            className={index === activeIndex ? 'active' : ''}
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
