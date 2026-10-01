import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Animated export-route map, adapted from the "WorldMap" (map.tsx) block.

  Differences from the original:
  - the dotted world map is pre-rendered by scripts/generate-export-map.mjs
    instead of being computed in the browser
  - next/image and next-themes are replaced (the section is always dark)
  - the sequence is driven from outside (revealedCount / activeKey) so the
    country list and the map stay in sync; the camera frames each active
    route in turn and zooms out to the whole world at the end
  - zoom in / out / reset buttons and drag-to-pan when zoomed in
  - labels are HTML overlays so they stay readable at every zoom level
*/

const ROUTE_DRAW_SECONDS = 1.2;
const SHIPMENT_SECONDS = 1.8;
const VIEW_ANIMATION = { duration: 0.8, ease: [0.4, 0, 0.2, 1] };
const ZOOM_STEP = 1.6;
const MAX_ZOOM = 8;

function curvedPath(start, end) {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);

  // Arc upwards, higher for longer routes
  return `M ${start.x} ${start.y} Q ${midX} ${midY - distance * 0.35} ${end.x} ${end.y}`;
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

const MIN_ROUTE_VIEW_WIDTH = 64;

/* View framing one route (hub → destination), at the map's aspect ratio */
function routeView(hub, destination, width, height) {
  const ratio = width / height;
  const dx = Math.abs(destination.x - hub.x);
  const dy = Math.abs(destination.y - hub.y);
  const distance = Math.hypot(dx, dy);

  let w = Math.max(dx * 1.6, MIN_ROUTE_VIEW_WIDTH);
  let h = Math.max(dy * 2.4, distance * 0.6);

  if (w / h > ratio) {
    h = w / ratio;
  } else {
    w = h * ratio;
  }

  // The arc bulges upwards, so centre slightly above the straight line
  const cx = (hub.x + destination.x) / 2;
  const cy = (hub.y + destination.y) / 2 - distance * 0.09;

  return clampView({ x: cx - w / 2, y: cy - h / 2, w, h }, width, height);
}

function Pulse({ x, y, color, radius, delay = 0 }) {
  return (
    <>
      <circle cx={x} cy={y} r={radius} fill={color} />
      <circle cx={x} cy={y} r={radius} fill={color} opacity="0.5">
        <animate
          attributeName="r"
          from={radius}
          to={radius * 4}
          dur="2s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          from="0.6"
          to="0"
          dur="2s"
          begin={`${delay}s`}
          repeatCount="indefinite"
        />
      </circle>
    </>
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

  return <motion.circle r={radius} fill="#fff" cx={cx} cy={cy} style={{ opacity }} />;
}

function Route({ hub, destination, active, dimmed, unit, lineColor, reduceMotion }) {
  const pathRef = useRef(null);
  const d = curvedPath(hub, destination);

  const common = {
    d,
    fill: 'none',
    stroke: lineColor,
    strokeWidth: (active ? 0.55 : 0.32) * unit,
    strokeLinecap: 'round',
  };

  return (
    <g className="exportRoute" style={{ opacity: dimmed ? 0.3 : 1 }}>
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

      {active && !reduceMotion && (
        <Shipment pathRef={pathRef} radius={0.7 * unit} />
      )}

      <Pulse
        x={destination.x}
        y={destination.y}
        color={lineColor}
        radius={0.75 * unit}
      />
    </g>
  );
}

export default function ExportMap({
  data,
  hubLabel,
  hubShortLabel,
  labels,
  controlLabels,
  revealedCount = Infinity,
  activeKey = null,
  autoView = 'focus',
  cycle = 0,
  onHoverChange,
  lineColor = '#d51d2c',
}) {
  const reduceMotion = useReducedMotion();

  const { width, height, hub, destinations } = data;

  const world = useMemo(() => ({ x: 0, y: 0, w: width, h: height }), [width, height]);

  // Where the automatic sequence wants the camera: the active route, or the world
  const activeDestination = destinations.find((d) => d.key === activeKey);

  const autoTarget = useMemo(
    () =>
      autoView === 'world' || !activeDestination
        ? world
        : routeView(hub, activeDestination, width, height),
    [autoView, activeDestination, hub, width, height, world]
  );

  const [view, setView] = useState(world);
  const viewRef = useRef(view);
  const animationRef = useRef(null);

  // Once a visitor zooms or pans, the automatic sequence stops moving the map
  const [userControlled, setUserControlled] = useState(false);
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

  // Follow the sequence: frame each route in turn, then zoom out to the world
  useEffect(() => {
    if (!userControlled) {
      goTo(autoTarget);
    }
  }, [autoTarget, userControlled, goTo]);

  function zoom(factor) {
    setUserControlled(true);

    const current = viewRef.current;
    const w = current.w * factor;
    const h = w * (height / width);
    const cx = current.x + current.w / 2;
    const cy = current.y + current.h / 2;

    goTo({ x: cx - w / 2, y: cy - h / 2, w, h });
  }

  function reset() {
    setUserControlled(false);
    goTo(autoTarget);
  }

  /* Drag to pan when zoomed in */
  const canPan = view.w < width - 0.01;

  function handlePointerDown(event) {
    if (!canPan || event.button !== 0) {
      return;
    }

    animationRef.current?.stop();
    setUserControlled(true);
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

  // Line widths and dot sizes stay constant on screen at any zoom level
  const unit = view.w / 150;

  const toPercent = (point) => {
    const left = ((point.x - view.x) / view.w) * 100;
    const top = ((point.y - view.y) / view.h) * 100;

    return {
      style: { left: `${left}%`, top: `${top}%` },
      visible: left >= -2 && left <= 102 && top >= -2 && top <= 102,
    };
  };

  const zoomLevel = width / view.w;

  const hubPosition = toPercent(hub);

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

          {destinations.map((destination, index) =>
            index < revealedCount ? (
              <Route
                key={`${destination.key}-${cycle}`}
                hub={hub}
                destination={destination}
                active={activeKey === destination.key}
                dimmed={Boolean(activeKey) && activeKey !== destination.key}
                unit={unit}
                lineColor={lineColor}
                reduceMotion={reduceMotion}
              />
            ) : null
          )}

          {/* Central distribution hub */}
          <Pulse x={hub.x} y={hub.y} color="#fff" radius={1.1 * unit} />
          <circle
            cx={hub.x}
            cy={hub.y}
            r={2.4 * unit}
            fill="none"
            stroke={lineColor}
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

        {destinations.map((destination, index) => {
          const position = toPercent(destination);

          if (index >= revealedCount || !position.visible) {
            return null;
          }

          const label = labels[destination.key];

          return (
            <motion.span
              key={`${destination.key}-${cycle}`}
              className={[
                'exportMapLabel',
                positionClass(destination.labelPosition),
                activeKey === destination.key ? 'active' : '',
              ].join(' ')}
              style={position.style}
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: ROUTE_DRAW_SECONDS * 0.7 }}
              onMouseEnter={() => onHoverChange?.(destination.key)}
              onMouseLeave={() => onHoverChange?.(null)}
            >
              <span className="exportMapLabelFull">{label.name}</span>
              <span className="exportMapLabelShort" aria-hidden="true">
                {label.short}
              </span>
            </motion.span>
          );
        })}
      </div>

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
          disabled={zoomLevel <= 1.01}
          aria-label={controlLabels.zoomOut}
          title={controlLabels.zoomOut}
        >
          <Minus aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={reset}
          disabled={!userControlled}
          aria-label={controlLabels.reset}
          title={controlLabels.reset}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
