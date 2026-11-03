import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Hand, Maximize, Minimize, Minus, Pause, Play, Plus, RotateCcw, Sparkles } from 'lucide-react';
import {
  AmbientLight, CanvasTexture, DirectionalLight, LinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  PerspectiveCamera, PlaneGeometry, Scene, SRGBColorSpace, Spherical, Vector3, WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { buildRelief } from './photoDepth';
import { track } from '../../analytics/track';

const GRID = 320;           // relief resolution (longest side, pixels)
const SEGMENTS = 180;       // mesh resolution (longest side)
const DEPTH = 0.34;         // relief height relative to the longest side
const YAW = 0.52;           // ±30° left and right
const PITCH_UP = 0.3;
const PITCH_DOWN = 0.18;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image'));
    image.src = src;
  });
}

const canUseWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

/* Soft round shadow under the product */
function shadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(16,19,23,0.55)');
  gradient.addColorStop(0.45, 'rgba(16,19,23,0.22)');
  gradient.addColorStop(1, 'rgba(16,19,23,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/*
  The product photo as an interactive 3D relief (see photoDepth.js):
  drag to turn it (about ±35°), zoom with the buttons (or the wheel in full
  screen), it sways gently while nobody touches it. Everything happens in the
  visitor's browser; nothing is uploaded.
*/
export default function Photo3DViewer({ src, alt = '', onUnsupported }) {
  const { t } = useTranslation();
  const v = (key) => t(`gallery3d.${key}`);

  const rootRef = useRef(null);
  const mountRef = useRef(null);
  const api = useRef({});
  const [state, setState] = useState('loading');
  const [touched, setTouched] = useState(false);
  const [sway, setSway] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const swayRef = useRef(true);

  useEffect(() => {
    swayRef.current = sway;
  }, [sway]);

  useEffect(() => {
    if (!src) return undefined;
    if (!canUseWebGL()) {
      setState('unsupported');
      onUnsupported?.();
      return undefined;
    }

    let disposed = false;
    let frame = 0;
    const cleanups = [];
    setState('loading');
    setTouched(false);

    (async () => {
      let image;
      try {
        image = await loadImage(src);
      } catch {
        if (!disposed) setState('error');
        return;
      }
      if (disposed || !mountRef.current) return;

      // Relief from a small copy of the photo
      const scale = GRID / Math.max(image.naturalWidth, image.naturalHeight);
      const width = Math.max(8, Math.round(image.naturalWidth * scale));
      const height = Math.max(8, Math.round(image.naturalHeight * scale));
      const small = document.createElement('canvas');
      small.width = width;
      small.height = height;
      const smallContext = small.getContext('2d', { willReadFrequently: true });
      smallContext.drawImage(image, 0, 0, width, height);
      const { data } = smallContext.getImageData(0, 0, width, height);
      const relief = buildRelief(data, width, height);

      // Photo texture with the background cut out (alpha from the relief mask)
      const textureCanvas = document.createElement('canvas');
      const textureScale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      textureCanvas.width = Math.round(image.naturalWidth * textureScale);
      textureCanvas.height = Math.round(image.naturalHeight * textureScale);
      const textureContext = textureCanvas.getContext('2d');
      textureContext.drawImage(image, 0, 0, textureCanvas.width, textureCanvas.height);

      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskContext = maskCanvas.getContext('2d');
      const mask = maskContext.createImageData(width, height);
      for (let i = 0; i < width * height; i += 1) {
        const value = Math.round(relief.alpha[i] * 255);
        mask.data[i * 4] = value;
        mask.data[i * 4 + 1] = value;
        mask.data[i * 4 + 2] = value;
        mask.data[i * 4 + 3] = 255;
      }
      maskContext.putImageData(mask, 0, 0);

      // Scene
      const mount = mountRef.current;
      const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-hidden', 'true');

      const scene = new Scene();
      const camera = new PerspectiveCamera(30, 1, 0.05, 50);

      const aspect = width / height;
      const planeWidth = aspect >= 1 ? 2 : 2 * aspect;
      const planeHeight = aspect >= 1 ? 2 / aspect : 2;
      const segmentsX = Math.round(aspect >= 1 ? SEGMENTS : SEGMENTS * aspect);
      const segmentsY = Math.round(aspect >= 1 ? SEGMENTS / aspect : SEGMENTS);

      const geometry = new PlaneGeometry(planeWidth, planeHeight, segmentsX, segmentsY);
      const positions = geometry.attributes.position;
      const uv = geometry.attributes.uv;
      const sample = (u, w) => {
        // Bilinear sample of the relief (uv origin bottom-left, image origin top-left)
        const x = u * (width - 1);
        const y = (1 - w) * (height - 1);
        const x0 = Math.floor(x);
        const y0 = Math.floor(y);
        const x1 = Math.min(width - 1, x0 + 1);
        const y1 = Math.min(height - 1, y0 + 1);
        const fx = x - x0;
        const fy = y - y0;
        const at = (px, py) => relief.depth[py * width + px];
        return (at(x0, y0) * (1 - fx) + at(x1, y0) * fx) * (1 - fy) + (at(x0, y1) * (1 - fx) + at(x1, y1) * fx) * fy;
      };
      const depthScale = DEPTH * Math.max(planeWidth, planeHeight) * (relief.cutout ? 1 : 0.5);
      for (let i = 0; i < positions.count; i += 1) {
        positions.setZ(i, sample(uv.getX(i), uv.getY(i)) * depthScale);
      }
      geometry.computeVertexNormals();

      const map = new CanvasTexture(textureCanvas);
      map.colorSpace = SRGBColorSpace;
      map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const alphaMap = new CanvasTexture(maskCanvas);
      alphaMap.minFilter = LinearFilter;
      alphaMap.magFilter = LinearFilter;

      // The photo keeps its colours (emissive) and gains shading from the lights
      const material = new MeshStandardMaterial({
        map,
        alphaMap,
        transparent: true,
        alphaTest: 0.04,
        roughness: 0.58,
        metalness: 0,
        emissive: 0xffffff,
        emissiveMap: map,
        emissiveIntensity: 0.34,
      });
      const mesh = new Mesh(geometry, material);
      mesh.scale.z = 0.001;
      scene.add(mesh);

      // Contact shadow at the foot of the product
      const footY = planeHeight / 2 - (relief.bounds.bottom / (height - 1)) * planeHeight;
      const productWidth = ((relief.bounds.right - relief.bounds.left + 1) / width) * planeWidth;
      const shadow = new Mesh(
        new PlaneGeometry(1, 1),
        new MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: relief.cutout ? 0.85 : 0 })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(((relief.bounds.left + relief.bounds.right) / 2 / (width - 1) - 0.5) * planeWidth, footY - 0.005, depthScale * 0.35);
      shadow.scale.set(productWidth * 1.25, depthScale * 1.6 + 0.2, 1);
      scene.add(shadow);

      scene.add(new AmbientLight(0xffffff, 0.5));
      const key = new DirectionalLight(0xffffff, 1.7);
      key.position.set(-1.6, 2.2, 3.2);
      scene.add(key);
      const rim = new DirectionalLight(0xdbeaff, 0.65);
      rim.position.set(2.4, 1.2, -1.5);
      scene.add(rim);
      const fill = new DirectionalLight(0xffffff, 0.35);
      fill.position.set(1.8, -0.8, 2.5);
      scene.add(fill);

      // Camera that fits the product
      const target = new Vector3(0, 0, depthScale * 0.35);
      const fitDistance = () => {
        const fov = (camera.fov * Math.PI) / 180;
        const fitHeight = planeHeight / 2 / Math.tan(fov / 2);
        const fitWidth = planeWidth / 2 / (Math.tan(fov / 2) * camera.aspect);
        return Math.max(fitHeight, fitWidth) * 1.18 + depthScale;
      };
      camera.position.set(0, 0, 4);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(target);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.rotateSpeed = 0.65;
      controls.minAzimuthAngle = -YAW;
      controls.maxAzimuthAngle = YAW;
      controls.minPolarAngle = Math.PI / 2 - PITCH_UP;
      controls.maxPolarAngle = Math.PI / 2 + PITCH_DOWN;

      let baseDistance = 4;
      const resize = () => {
        const { clientWidth, clientHeight } = mount;
        if (!clientWidth || !clientHeight) return;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
        const previous = baseDistance;
        baseDistance = fitDistance();
        controls.minDistance = baseDistance * 0.45;
        controls.maxDistance = baseDistance * 1.35;
        const offset = camera.position.clone().sub(controls.target);
        offset.setLength((offset.length() / previous) * baseDistance);
        camera.position.copy(controls.target).add(offset);
      };
      camera.position.set(0, 0.06, 4);
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(mount);

      // Gentle sway while idle; any touch stops it for a few seconds
      let lastInput = -10;
      // Seconds since the view opened
      const opened = performance.now();
      const clock = { getElapsedTime: () => (performance.now() - opened) / 1000 };
      const spherical = new Spherical();
      const onStart = () => {
        lastInput = clock.getElapsedTime();
        setTouched(true);
      };
      controls.addEventListener('start', onStart);
      controls.addEventListener('end', () => { lastInput = clock.getElapsedTime(); });

      let visible = true;
      const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
      io.observe(mount);

      const appear = { start: performance.now(), duration: 1100 };
      const ease = (x) => 1 - (1 - x) ** 3;

      const loop = () => {
        frame = requestAnimationFrame(loop);
        if (!visible || document.hidden) return;

        const progress = Math.min(1, (performance.now() - appear.start) / appear.duration);
        mesh.scale.z = Math.max(0.001, ease(progress));

        const now = clock.getElapsedTime();
        if (swayRef.current && now - lastInput > 3) {
          const offset = camera.position.clone().sub(controls.target);
          spherical.setFromVector3(offset);
          const goal = Math.sin(now * 0.55) * YAW * 0.55;
          spherical.theta += (goal - spherical.theta) * 0.04;
          spherical.phi += (Math.PI / 2 - 0.05 - spherical.phi) * 0.04;
          offset.setFromSpherical(spherical);
          camera.position.copy(controls.target).add(offset);
        }

        controls.update();
        renderer.render(scene, camera);
      };
      loop();

      api.current = {
        zoom(factor) {
          const offset = camera.position.clone().sub(controls.target);
          const length = Math.min(controls.maxDistance, Math.max(controls.minDistance, offset.length() * factor));
          offset.setLength(length);
          camera.position.copy(controls.target).add(offset);
          onStart();
        },
        reset() {
          camera.position.set(0, 0.06, baseDistance);
          controls.target.copy(target);
          lastInput = -10;
        },
        rotate(dx, dy) {
          const offset = camera.position.clone().sub(controls.target);
          spherical.setFromVector3(offset);
          spherical.theta = Math.max(-YAW, Math.min(YAW, spherical.theta + dx));
          spherical.phi = Math.max(Math.PI / 2 - PITCH_UP, Math.min(Math.PI / 2 + PITCH_DOWN, spherical.phi + dy));
          offset.setFromSpherical(spherical);
          camera.position.copy(controls.target).add(offset);
          onStart();
        },
        setWheel(enabled) {
          controls.enableZoom = enabled;
        },
      };

      cleanups.push(() => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        io.disconnect();
        controls.dispose();
        geometry.dispose();
        material.dispose();
        map.dispose();
        alphaMap.dispose();
        shadow.geometry.dispose();
        shadow.material.map?.dispose();
        shadow.material.dispose();
        renderer.dispose();
        renderer.forceContextLoss?.();
        renderer.domElement.remove();
      });

      if (!disposed) {
        setState('ready');
        track('product_3d_view', { cutout: relief.cutout });
      }
    })().catch(() => {
      if (!disposed) setState('error');
    });

    return () => {
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
      api.current = {};
    };
  }, [src, onUnsupported]);

  // Full screen: the wheel zooms there (on the page it keeps scrolling the page)
  useEffect(() => {
    const onChange = () => {
      const active = document.fullscreenElement === rootRef.current;
      setFullscreen(active);
      api.current.setWheel?.(active);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else rootRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  function onKeyDown(event) {
    const step = 0.12;
    const keys = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step * 0.6], ArrowDown: [0, step * 0.6],
    };
    if (keys[event.key]) {
      event.preventDefault();
      api.current.rotate?.(...keys[event.key]);
    } else if (event.key === '+' || event.key === '=') {
      api.current.zoom?.(0.85);
    } else if (event.key === '-') {
      api.current.zoom?.(1.18);
    }
  }

  const fullscreenSupported = typeof document !== 'undefined' && Boolean(document.fullscreenEnabled);

  return (
    <div
      ref={rootRef}
      className={`p3d p3d-${state} ${fullscreen ? 'isFullscreen' : ''}`}
      role="img"
      aria-label={`${alt} – ${v('label')}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="p3dStage" ref={mountRef} />

      {state === 'loading' && (
        <div className="p3dLoading" aria-live="polite">
          <span className="p3dSpinner" aria-hidden="true" />
          {v('loading')}
        </div>
      )}

      {(state === 'error' || state === 'unsupported') && (
        <div className="p3dLoading" role="status">{state === 'unsupported' ? v('unsupported') : v('error')}</div>
      )}

      {state === 'ready' && (
        <>
          <span className="p3dBadge" title={v('note')}>
            <Sparkles aria-hidden="true" />
            {v('badge')}
          </span>

          <span className={`p3dHint ${touched ? 'hidden' : ''}`} aria-hidden="true">
            <Hand />
            {v('hint')}
          </span>

          <div className="p3dControls" role="toolbar" aria-label={v('controls')}>
            <button type="button" className="p3dZoom" onClick={() => api.current.zoom?.(0.82)} aria-label={v('zoomIn')} title={v('zoomIn')}><Plus aria-hidden="true" /></button>
            <button type="button" className="p3dZoom" onClick={() => api.current.zoom?.(1.22)} aria-label={v('zoomOut')} title={v('zoomOut')}><Minus aria-hidden="true" /></button>
            <button type="button" onClick={() => api.current.reset?.()} aria-label={v('reset')} title={v('reset')}><RotateCcw aria-hidden="true" /></button>
            <button
              type="button"
              onClick={() => setSway((current) => !current)}
              aria-pressed={sway}
              aria-label={sway ? v('pause') : v('play')}
              title={sway ? v('pause') : v('play')}
            >
              {sway ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
            </button>
            {fullscreenSupported && (
              <button type="button" onClick={toggleFullscreen} aria-label={fullscreen ? v('exitFullscreen') : v('fullscreen')} title={fullscreen ? v('exitFullscreen') : v('fullscreen')}>
                {fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
