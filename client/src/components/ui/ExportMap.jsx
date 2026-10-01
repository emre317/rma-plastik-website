import { motion, useReducedMotion } from 'framer-motion';

import mapImage from '../../assets/maps/export-map.svg';

/*
  Animated export-route map, adapted from the "WorldMap" (map.tsx) block:
  - the dotted land map is pre-rendered by scripts/generate-export-map.mjs
    instead of being computed in the browser
  - next/image and next-themes are replaced with a plain <img> (the section
    is always dark)
  - labels are HTML overlays so they stay readable at every screen size
*/

const STAGGER = 0.35;
const DRAW_DURATION = 1.8;
const PAUSE = 2.2;

function curvedPath(start, end) {
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const distance = Math.hypot(end.x - start.x, end.y - start.y);

  // Arc upwards, higher for longer routes
  const controlY = midY - distance * 0.35;

  return `M ${start.x} ${start.y} Q ${midX} ${controlY} ${end.x} ${end.y}`;
}

// 'top' -> 'labelTop'
function positionClass(position = 'top') {
  return `label${position[0].toUpperCase()}${position.slice(1)}`;
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

export default function ExportMap({
  data,
  hubLabel,
  hubShortLabel,
  labels,
  activeKey = null,
  onActiveChange,
  lineColor = '#d51d2c',
}) {
  const reduceMotion = useReducedMotion();

  const { width, height, hub, destinations } = data;

  const totalDrawTime = destinations.length * STAGGER + DRAW_DURATION;
  const cycle = totalDrawTime + PAUSE;

  const toPercent = (point) => ({
    left: `${(point.x / width) * 100}%`,
    top: `${(point.y / height) * 100}%`,
  });

  return (
    <div
      className="exportMap"
      style={{ aspectRatio: `${width} / ${height}` }}
      dir="ltr"
    >
      <img
        src={mapImage}
        alt=""
        className="exportMapDots"
        draggable={false}
        loading="lazy"
        decoding="async"
      />

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="exportMapRoutes"
        aria-hidden="true"
      >
        {destinations.map((destination, index) => {
          const d = curvedPath(hub, destination);
          const isDimmed = activeKey && activeKey !== destination.key;
          const isActive = activeKey === destination.key;

          const start = (index * STAGGER) / cycle;
          const end = (index * STAGGER + DRAW_DURATION) / cycle;
          const reset = totalDrawTime / cycle;

          return (
            <g
              key={destination.key}
              className="exportRoute"
              style={{ opacity: isDimmed ? 0.18 : 1 }}
            >
              {reduceMotion ? (
                <path
                  d={d}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={isActive ? 0.55 : 0.35}
                  strokeLinecap="round"
                />
              ) : (
                <motion.path
                  d={d}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={isActive ? 0.55 : 0.35}
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: [0, 0, 1, 1, 0] }}
                  transition={{
                    duration: cycle,
                    times: [0, start, end, reset, 1],
                    ease: 'easeInOut',
                    repeat: Infinity,
                  }}
                />
              )}

              {!reduceMotion && (
                // Shipment travelling along the route, in sync with the line drawing
                <circle r="0.7" fill="#fff" opacity="0">
                  <animateMotion
                    dur={`${cycle}s`}
                    repeatCount="indefinite"
                    path={d}
                    calcMode="linear"
                    keyPoints="0;0;1;1"
                    keyTimes={`0;${start.toFixed(4)};${end.toFixed(4)};1`}
                  />
                  <animate
                    attributeName="opacity"
                    dur={`${cycle}s`}
                    repeatCount="indefinite"
                    values="0;0;1;1;0;0"
                    keyTimes={`0;${start.toFixed(4)};${(start + 0.01).toFixed(4)};${(end - 0.01).toFixed(4)};${end.toFixed(4)};1`}
                  />
                </circle>
              )}

              <Pulse
                x={destination.x}
                y={destination.y}
                color={lineColor}
                radius={0.8}
                delay={0.4 + index * 0.2}
              />
            </g>
          );
        })}

        {/* Central distribution hub */}
        <Pulse x={hub.x} y={hub.y} color="#fff" radius={1.1} />
        <circle
          cx={hub.x}
          cy={hub.y}
          r="2.4"
          fill="none"
          stroke={lineColor}
          strokeWidth="0.35"
        />
      </svg>

      <span
        className={`exportMapLabel exportMapLabelHub ${positionClass(hub.labelPosition)}`}
        style={toPercent(hub)}
      >
        <span className="exportMapLabelFull">{hubLabel}</span>
        <span className="exportMapLabelShort" aria-hidden="true">
          {hubShortLabel || hubLabel}
        </span>
      </span>

      {destinations.map((destination) => {
        const label = labels[destination.key];

        return (
          <button
            key={destination.key}
            type="button"
            className={[
              'exportMapLabel',
              positionClass(destination.labelPosition),
              activeKey === destination.key ? 'active' : '',
            ].join(' ')}
            style={toPercent(destination)}
            onMouseEnter={() => onActiveChange?.(destination.key)}
            onMouseLeave={() => onActiveChange?.(null)}
            onFocus={() => onActiveChange?.(destination.key)}
            onBlur={() => onActiveChange?.(null)}
          >
            <span className="exportMapLabelFull">{label.name}</span>
            <span className="exportMapLabelShort" aria-hidden="true">
              {label.short}
            </span>
          </button>
        );
      })}
    </div>
  );
}
