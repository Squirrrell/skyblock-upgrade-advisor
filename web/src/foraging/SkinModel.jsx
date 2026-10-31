// The player's skin as a 3D figure made of CSS boxes, one textured face per
// side, like the model in the game. Drag to turn it. The skin comes from
// mc-heads.net (which allows reading its pixels), so slim "Alex" arms and old
// 64x32 skins are detected from the image itself.
import { useEffect, useRef, useState } from 'react';

const U = 'var(--u)';
const px = (n) => `calc(${n} * ${U})`;

/** Read the skin: 64x32 (old, no separate left limbs or overlays) and slim arms. */
function useSkinInfo(url) {
  const [info, setInfo] = useState({ legacy: false, slim: false, ready: false });
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!alive) return;
      const legacy = img.naturalHeight === 32;
      let slim = false;
      if (!legacy) {
        try {
          const c = document.createElement('canvas');
          c.width = 64;
          c.height = 64;
          const g = c.getContext('2d');
          g.drawImage(img, 0, 0);
          // Slim skins leave the outer column of the right arm's front transparent.
          slim = g.getImageData(54, 20, 1, 1).data[3] === 0;
        } catch {
          slim = false;
        }
      }
      setInfo({ legacy, slim, ready: true });
    };
    img.onerror = () => alive && setInfo((i) => ({ ...i, ready: true }));
    img.src = url;
    return () => {
      alive = false;
    };
  }, [url]);
  return info;
}

/**
 * One box with the standard Minecraft texture layout: from (u, v), top and
 * bottom (w x d) on the first row, then right, front, left, back (h tall).
 * `mirror` flips the faces, for old skins' left limbs.
 */
function Box({ skin, sheetH, u, v, w, h, d, className = '', style, mirror = false }) {
  const face = (x, y, fw, fh, transform, shade) => ({
    width: px(fw),
    height: px(fh),
    backgroundImage: `url(${skin})`,
    backgroundSize: `${px(64)} ${px(sheetH)}`,
    backgroundPosition: `calc(${-x} * ${U}) calc(${-y} * ${U})`,
    transform: `${transform}${mirror ? ' scaleX(-1)' : ''}`,
    filter: shade ? `brightness(${shade})` : undefined,
  });
  // The skin's "right" side is the player's right, which faces the viewer's left.
  const faces = [
    ['front', face(u + d, v + d, w, h, `translateZ(${px(d / 2)})`, 1)],
    ['back', face(u + d + w + d, v + d, w, h, `rotateY(180deg) translateZ(${px(d / 2)})`, 0.72)],
    ['side', { ...face(u, v + d, d, h, `rotateY(-90deg) translateZ(${px(w / 2)})`, 0.84), left: px((w - d) / 2) }],
    ['side', { ...face(u + d + w, v + d, d, h, `rotateY(90deg) translateZ(${px(w / 2)})`, 0.84), left: px((w - d) / 2) }],
    ['cap', { ...face(u + d, v, w, d, `rotateX(90deg) translateZ(${px(h / 2)})`, 1.08), top: px((h - d) / 2) }],
    ['cap', { ...face(u + d + w, v, w, d, `rotateX(-90deg) translateZ(${px(h / 2)})`, 0.62), top: px((h - d) / 2) }],
  ];
  return (
    <div className={`skin-box ${className}`} style={{ width: px(w), height: px(h), ...style }}>
      {faces.map(([kind, s], i) => (
        <div key={i} className={`skin-face skin-${kind}`} style={s} />
      ))}
    </div>
  );
}

/**
 * A limb or the head with its overlay layer just outside it. `at` places it
 * in the 16 x 32 figure, in skin pixels.
 */
function Part({ skin, sheetH, base, over, size, at, className, mirror, grow = 1.08 }) {
  const [w, h, d] = size;
  return (
    <div className={`skin-part ${className}`} style={{ left: px(at[0]), top: px(at[1]), width: px(w), height: px(h) }}>
      <Box skin={skin} sheetH={sheetH} u={base[0]} v={base[1]} w={w} h={h} d={d} mirror={mirror} />
      {over && <Box skin={skin} sheetH={sheetH} u={over[0]} v={over[1]} w={w} h={h} d={d} mirror={mirror} className="skin-over" style={{ transform: `scale3d(${grow}, ${1 + (grow - 1) * (w / h)}, ${grow})` }} />}
    </div>
  );
}

/** The figure; `uuid` picks the skin. Turn it by dragging; it sways slowly on its own. */
export default function SkinModel({ uuid, name }) {
  const skin = `https://mc-heads.net/skin/${uuid}`;
  const { legacy, slim } = useSkinInfo(skin);
  const sheetH = legacy ? 32 : 64;
  const stage = useRef(null);
  const drag = useRef(null);

  // Turning writes a CSS variable straight to the element, not React state.
  const onDown = (e) => {
    const el = stage.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const start = Number(getComputedStyle(el).getPropertyValue('--ry').replace('deg', '')) || -24;
    drag.current = { x: e.clientX, start };
    el.classList.add('is-dragging');
  };
  const onMove = (e) => {
    if (!drag.current) return;
    stage.current.style.setProperty('--ry', `${drag.current.start + (e.clientX - drag.current.x) * 0.6}deg`);
  };
  const onUp = () => {
    drag.current = null;
    stage.current?.classList.remove('is-dragging');
  };
  const onKey = (e) => {
    const el = stage.current;
    if (!el || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
    const now = Number(getComputedStyle(el).getPropertyValue('--ry').replace('deg', '')) || -24;
    el.style.setProperty('--ry', `${now + (e.key === 'ArrowLeft' ? -15 : 15)}deg`);
    el.classList.add('is-dragging');
  };

  const arm = slim ? 3 : 4;
  return (
    <div
      ref={stage}
      className="skin-stage"
      role="img"
      tabIndex={0}
      aria-label={`${name}'s skin. Drag or use the arrow keys to turn it.`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onKeyDown={onKey}
    >
      <div className="skin-figure">
        <Part className="skin-head" skin={skin} sheetH={sheetH} base={[0, 0]} over={[32, 0]} size={[8, 8, 8]} at={[4, 0]} grow={1.125} />
        <Part className="skin-body" skin={skin} sheetH={sheetH} base={[16, 16]} over={legacy ? null : [16, 32]} size={[8, 12, 4]} at={[4, 8]} />
        <Part className="skin-arm skin-arm-r" skin={skin} sheetH={sheetH} base={[40, 16]} over={legacy ? null : [40, 32]} size={[arm, 12, 4]} at={[4 - arm, 8]} />
        <Part
          className="skin-arm skin-arm-l"
          skin={skin}
          sheetH={sheetH}
          base={legacy ? [40, 16] : [32, 48]}
          over={legacy ? null : [48, 48]}
          size={[arm, 12, 4]}
          at={[12, 8]}
          mirror={legacy}
        />
        <Part className="skin-leg skin-leg-r" skin={skin} sheetH={sheetH} base={[0, 16]} over={legacy ? null : [0, 32]} size={[4, 12, 4]} at={[4, 20]} />
        <Part className="skin-leg skin-leg-l" skin={skin} sheetH={sheetH} base={legacy ? [0, 16] : [16, 48]} over={legacy ? null : [0, 48]} size={[4, 12, 4]} at={[8, 20]} mirror={legacy} />
      </div>
    </div>
  );
}
