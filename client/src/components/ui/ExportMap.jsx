import { useCallback, useEffect, useRef, useState } from 'react';
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from 'framer-motion';
import { Minus, Plus, RotateCcw } from 'lucide-react';

import mapImage from '../../assets/maps/export-map.svg';

/*
  Export network map, adapted from the "WorldMap" (map.tsx) block.

  - The dotted world map is pre-rendered by scripts/generate-export-map.mjs.
  - Export countries are highlighted dot-by-dot so they read as countries,
    not just pins; the active market is brightest.
  - The map always opens on the whole world; visitors can zoom in/out and
    drag to pan. The sequence never moves the camera, so the map stays
    recognisable.
  - The sequence (revealed markets / active market) is driven from outside
    so the step list and the map stay in sync.
*/

const ROUTE_DRAW_SECONDS = 1.1;
const SHIPMENT_SECONDS = 1.7;
const VIEW_ANIMATION = { duration: 0.7, ease: [0.4, 0, 0.2, 1] };
const ZOOM_STEP = 1.6;
const MAX_ZOOM = 5;

const COLORS = {
  market: '#4d94f5',
  hub: '#ffffff',
};

function curvedPath(start, end) {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);

  // Arc upwards, higher for longer routes
  return `M ${start.x} ${start.y} Q ${midX} ${midY - distance * 0.32} ${end.x} ${end.y}`;
}

// 'top' -> 'labelTop'
function positionClass(position = 'top') {
  return `label${position[0].toUpperCase()}${position.slice(1)}`;
}

function clampView(view, width, height) {
  const w = Math.min(Math.max(view.w, width / MAX_ZOOM), width);
  const h = w * (height / width);

  return {
    w,
    h,
    x: Math.min(Math.max(view.x, 0), width - w),
    y: Math.min(Math.max(view.y, 0), height - h),
  };
}

function Pulse({ x, y, color, radius }) {
  return (
    <circle cx={x} cy={y} r={radius} fill={color} opacity="0.5">
      <animate
        attributeName="r"
        from={radius}
        to={radius * 4}
        dur="2s"
        repeatCount="indefinite"
      />
      <animate
        attributeName="opacity"
        from="0.6"
        to="0"
        dur="2s"
        repeatCount="indefinite"
      />
    </circle>
  );
}

/* Shipment travelling from the hub along a route */
function Shipment({ pathRef, radius }) {
  const progress = useMotionValue(0);

  const point = (p) => {
    const path = pathRef.current;

    if (!path) {
      return { x: 0, y: 0 };
    }

    return path.getPointAtLength(p * path.getTotalLength());
  };

  const cx = useTransform(progress, (p) => point(p).x);
  const cy = useTransform(progress, (p) => point(p).y);
  const opacity = useTransform(progress, [0, 0.08, 0.9, 1], [0, 1, 1, 0]);

  useEffect(() => {
    const controls = animate(progress, 1, {
      duration: SHIPMENT_SECONDS,
      delay: ROUTE_DRAW_SECONDS * 0.4,
      ease: 'easeInOut',
    });

    return () => controls.stop();
  }, [progress]);

  return (
    <motion.circle
      r={radius}
      fill="#fff"
      cx={cx}
      cy={cy}
      style={{ opacity }}
    />
  );
}

function Route({ hub, destination, emphasis, unit, reduceMotion }) {
  const pathRef = useRef(null);

  const common = {
    d: curvedPath(hub, destination),
    fill: 'none',
    stroke: COLORS.market,
    strokeWidth: (emphasis === 'active' ? 0.5 : 0.3) * unit,
    strokeLinecap: 'round',
    strokeOpacity: emphasis === 'muted' ? 0.35 : 1,
  };

  return (
    <g className="exportRoute">
      {reduceMotion ? (
        <path ref={pathRef} {...common} />
      ) : (
        <motion.path
          ref={pathRef}
          {...common}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: ROUTE_DRAW_SECONDS, ease: 'easeInOut' }}
        />
      )}

      {emphasis === 'active' && !reduceMotion && (
        <Shipment pathRef={pathRef} radius={0.65 * unit} />
      )}
    </g>
  );
}

export default function ExportMap({
  data,
  labels,
  hubLabel,
  hubShortLabel,
  controlLabels,
  legendLabels,
  isRevealed = () => true,
  activeKey = null,
  highlightAll = false,
  cycle = 0,
  onHoverChange,
}) {
  const reduceMotion = useReducedMotion();

  const { width, height, dotRadius, hub, destinations } = data;

  const world = { x: 0, y: 0, w: width, h: height };

  const [view, setView] = useState(world);
  const viewRef = useRef(view);
  const animationRef = useRef(null);

  const [dragging, setDragging] = useState(false);
  const containerRef = useRef(null);
  const dragRef = useRef(null);

  const goTo = useCallback(
    (target) => {
      animationRef.current?.stop();

      const from = viewRef.current;
      const to = clampView(target, width, height);

      if (reduceMotion) {
        viewRef.current = to;
        setView(to);
        return;
      }

      animationRef.current = animate(0, 1, {
        ...VIEW_ANIMATION,
        onUpdate: (t) => {
          const next = {
            x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t,
            w: from.w + (to.w - from.w) * t,
            h: from.h + (to.h - from.h) * t,
          };

          viewRef.current = next;
          setView(next);
        },
      });
    },
    [width, height, reduceMotion]
  );

  useEffect(() => () => animationRef.current?.stop(), []);

  function zoom(factor) {
    const current = viewRef.current;
    const w = current.w * factor;
    const h = w * (height / width);
    const cx = current.x + current.w / 2;
    const cy = current.y + current.h / 2;

    goTo({ x: cx - w / 2, y: cy - h / 2, w, h });
  }

  const zoomLevel = width / view.w;
  const canPan = zoomLevel > 1.01;

  /* Drag to pan when zoomed in */
  function handlePointerDown(event) {
    if (!canPan || event.button !== 0) {
      return;
    }

    animationRef.current?.stop();
    setDragging(true);

    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      view: viewRef.current,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const scale = drag.view.w / rect.width;

    const next = clampView(
      {
        ...drag.view,
        x: drag.view.x - (event.clientX - drag.x) * scale,
        y: drag.view.y - (event.clientY - drag.y) * scale,
      },
      width,
      height
    );

    viewRef.current = next;
    setView(next);
  }

  function handlePointerUp() {
    dragRef.current = null;
    setDragging(false);
  }

  // Lines and markers keep the same on-screen size at every zoom level
  const unit = view.w / 190;

  const toPercent = (point) => {
    const left = ((point.x - view.x) / view.w) * 100;
    const top = ((point.y - view.y) / view.h) * 100;

    return {
      style: { left: `${left}%`, top: `${top}%` },
      visible: left >= -1 && left <= 101 && top >= -1 && top <= 101,
    };
  };

  const emphasisFor = (key) => {
    if (highlightAll || !activeKey) {
      return 'normal';
    }

    return key === activeKey ? 'active' : 'muted';
  };

  const hubPosition = toPercent(hub);
  const activeDestination = destinations.find((d) => d.key === activeKey);
  const activePosition = activeDestination && toPercent(activeDestination);

  return (
    <div className="exportMapFrame">
      <div
        ref={containerRef}
        className={['exportMap', canPan ? 'canPan' : '', dragging ? 'dragging' : ''].join(' ')}
        style={{ aspectRatio: `${width} / ${height}` }}
        dir="ltr"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <svg
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className="exportMapCanvas"
          aria-hidden="true"
        >
          <image href={mapImage} x="0" y="0" width={width} height={height} />

          {/* Home country */}
          <path
            d={hub.dots}
            stroke={COLORS.hub}
            strokeOpacity="0.45"
            strokeWidth={dotRadius * 2}
            strokeLinecap="round"
            fill="none"
          />

          {/* Export markets, highlighted dot by dot */}
          {destinations.map((destination) =>
            isRevealed(destination.key) ? (
              <path
                key={`country-${destination.key}`}
                className="exportCountry"
                d={destination.dots}
                stroke={COLORS.market}
                strokeOpacity={emphasisFor(destination.key) === 'active' || highlightAll ? 1 : 0.55}
                strokeWidth={dotRadius * 2}
                strokeLinecap="round"
                fill="none"
              />
            ) : null
          )}

          {destinations.map((destination) =>
            isRevealed(destination.key) ? (
              <Route
                key={`${destination.key}-${cycle}`}
                hub={hub}
                destination={destination}
                emphasis={emphasisFor(destination.key)}
                unit={unit}
                reduceMotion={reduceMotion}
              />
            ) : null
          )}

          {/* Market pins */}
          {destinations.map((destination) => {
            if (!isRevealed(destination.key)) {
              return null;
            }

            const active = destination.key === activeKey;

            return (
              <g key={`pin-${destination.key}`}>
                {(active || highlightAll) && !reduceMotion && (
                  <Pulse
                    x={destination.x}
                    y={destination.y}
                    color={COLORS.market}
                    radius={0.8 * unit}
                  />
                )}
                <circle
                  cx={destination.x}
                  cy={destination.y}
                  r={(active ? 1 : 0.75) * unit}
                  fill={COLORS.market}
                  stroke="#0f1e3c"
                  strokeWidth={0.25 * unit}
                />
              </g>
            );
          })}

          {/* Central distribution hub */}
          {!reduceMotion && (
            <Pulse x={hub.x} y={hub.y} color={COLORS.hub} radius={1 * unit} />
          )}
          <circle cx={hub.x} cy={hub.y} r={1.05 * unit} fill={COLORS.hub} />
          <circle
            cx={hub.x}
            cy={hub.y}
            r={2.1 * unit}
            fill="none"
            stroke={COLORS.market}
            strokeWidth={0.35 * unit}
          />
        </svg>

        {hubPosition.visible && (
          <span
            className={`exportMapLabel exportMapLabelHub ${positionClass(hub.labelPosition)}`}
            style={hubPosition.style}
          >
            <span className="exportMapLabelFull">{hubLabel}</span>
            <span className="exportMapLabelShort" aria-hidden="true">
              {hubShortLabel || hubLabel}
            </span>
          </span>
        )}

        {/* Only the active market is labelled, so labels never collide */}
        {activeDestination && activePosition.visible && (
          <motion.span
            key={`${activeDestination.key}-${cycle}`}
            className={`exportMapLabel exportMapLabelActive ${positionClass(activeDestination.labelPosition)}`}
            style={activePosition.style}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.25 }}
            onMouseEnter={() => onHoverChange?.(activeDestination.key)}
            onMouseLeave={() => onHoverChange?.(null)}
          >
            {labels[activeDestination.key].name}
          </motion.span>
        )}
      </div>

      <ul className="exportMapLegend" aria-hidden="true">
        <li>
          <span className="legendHub" />
          {legendLabels.hub}
        </li>
        <li>
          <span className="legendMarket" />
          {legendLabels.market}
        </li>
        <li>
          <span className="legendRoute" />
          {legendLabels.route}
        </li>
      </ul>

      <div className="exportMapControls">
        <button
          type="button"
          onClick={() => zoom(1 / ZOOM_STEP)}
          disabled={zoomLevel >= MAX_ZOOM - 0.01}
          aria-label={controlLabels.zoomIn}
          title={controlLabels.zoomIn}
        >
          <Plus aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => zoom(ZOOM_STEP)}
          disabled={!canPan}
          aria-label={controlLabels.zoomOut}
          title={controlLabels.zoomOut}
        >
          <Minus aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => goTo(world)}
          disabled={!canPan}
          aria-label={controlLabels.reset}
          title={controlLabels.reset}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
