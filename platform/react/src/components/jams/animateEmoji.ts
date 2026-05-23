// floating emoji animation — Gregor Mitscha-Baude 2021

const g = -0.4e-4;
const G = Math.abs(g);
const tmax = 5000;
const Rx = 2 * G;
const Fx = 4 * G;
const vx0 = 0.1 * tmax * G;
const Fy = 2 * G;
const vy0 = 0.4 * tmax * G;
const size = 80;
const Ra = 1e-8 * size * 360;
const Fa = 5e-4;
const Sa = (5 * G) / size;

function move(
  t: number,
  x: number,
  vx: number,
  y: number,
  vy: number,
  a: number,
  va: number,
) {
  const dt = Date.now() - t;
  t += dt;
  x += dt * vx;
  y += dt * vy;
  a += dt * va;
  vx += dt * (Rx * randn() - Fx * vx);
  vy += dt * (g - Fy * vy);
  va += dt * (-Sa * a + Ra * randn() - Fa * va);
  return [t, x, vx, y, vy, a, va] as const;
}

function render(
  emojiStyle: CSSStyleDeclaration,
  t: number,
  t0: number,
  tend: number,
  x: number,
  y: number,
  a: number,
) {
  const timeFraction = (t - t0) / (tend - t0);
  const scale = 1 - 0.75 * timeFraction;
  const opacity = 1 - timeFraction ** 2;
  emojiStyle.opacity = `${opacity}`;
  emojiStyle.transform = `scale(${scale}) translate(${x / scale}px,${-y / scale}px) rotate(${a}deg)`;
}

const randn = () =>
  Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

export default function animateEmoji(element: HTMLElement) {
  const emojiStyle = element.style;
  const t0 = Date.now();
  const tend = t0 + tmax;
  const vx00 = vx0 * randn();
  let [t, x, vx, y, vy, a, va]: [number, number, number, number, number, number, number] = [
    t0,
    0,
    vx00,
    0,
    vy0,
    0,
    0,
  ];

  function step() {
    if (t > tend) return;
    [t, x, vx, y, vy, a, va] = [...move(t, x, vx, y, vy, a, va)];
    render(emojiStyle, t, t0, tend, x, y, a);
    window.requestAnimationFrame(step);
  }

  window.requestAnimationFrame(step);
}
