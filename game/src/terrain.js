// terrain.js — procedural mountain valley: heightfield, parallax layers,
// pine trees, river, runways and the rescue clearing. All seeded.
import { makeRng } from './rng.js';

export const WORLD_LENGTH = 12400;
export const VALLEY_FLOOR = 600;

// Flat zones the heightfield blends toward: [x0, x1, y]
const FLAT_ZONES = [
  [120, 980, 600], // base runway
  [6480, 7120, 560], // rescue clearing inside the ridge gap
  [8580, 9220, 600], // storm short strip
  [10550, 11450, 600], // destination runway
];

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function gauss(x, center, width, height) {
  const d = (x - center) / width;
  return height * Math.exp(-d * d);
}

export function makeTerrain(seed) {
  const rng = makeRng(seed * 7919 + 13);
  // Rolling-hill phases, seeded.
  const p1 = rng.range(0, Math.PI * 2);
  const p2 = rng.range(0, Math.PI * 2);
  const p3 = rng.range(0, Math.PI * 2);
  // Value-noise control points every 500 px.
  const knots = [];
  for (let x = 0; x <= WORLD_LENGTH + 500; x += 500) {
    knots.push(rng.range(-26, 26));
  }
  // Far-peak and mid-hill ridge lines, seeded.
  const farPeaks = [];
  for (let i = 0; i < 9; i++) farPeaks.push({ x: i * 1600, h: rng.range(150, 320) });
  const midHills = [];
  for (let i = 0; i < 13; i++) midHills.push({ x: i * 1100, h: rng.range(60, 150) });
  // Pine trees: seeded x positions on gentle ground.
  const trees = [];
  for (let x = 300; x < WORLD_LENGTH; x += rng.range(55, 130)) {
    trees.push({ x, s: rng.range(0.7, 1.4), tint: rng.range(-8, 8) });
  }
  // Clouds: world x, sky y, size, drift speed.
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: rng.range(0, WORLD_LENGTH),
      y: rng.range(60, 240),
      s: rng.range(0.7, 1.8),
      v: rng.range(4, 12),
    });
  }

  function rawHeight(x) {
    const hills =
      34 * Math.sin(x * 0.0011 + p1) +
      20 * Math.sin(x * 0.0027 + p2) +
      10 * Math.sin(x * 0.0061 + p3);
    const ki = Math.max(0, Math.min(knots.length - 2, Math.floor(x / 500)));
    const kt = (x - ki * 500) / 500;
    const knot = knots[ki] + (knots[ki + 1] - knots[ki]) * (kt * kt * (3 - 2 * kt));
    let y = VALLEY_FLOOR + hills + knot;
    // Two big ridges the valley threads between.
    y -= gauss(x, 3400, 1050, 300);
    y -= gauss(x, 6800, 1150, 340);
    // The rescue gap carved through the second ridge.
    y += gauss(x, 6800, 330, 330);
    // River dip.
    y += gauss(x, 2350, 260, 26);
    return y;
  }

  function heightAt(x) {
    const cx = Math.max(0, Math.min(WORLD_LENGTH, x));
    let y = rawHeight(cx);
    for (const [x0, x1, fy] of FLAT_ZONES) {
      const edge = 170;
      const w =
        smoothstep(x0 - edge, x0 + 60, cx) * (1 - smoothstep(x1 - 60, x1 + edge, cx));
      y = y * (1 - w) + fy * w;
    }
    return y;
  }

  return { seed, heightAt, farPeaks, midHills, trees, clouds, flatZones: FLAT_ZONES };
}

// --- drawing ---------------------------------------------------------------

export function drawSky(ctx, camX, camY, time, terrain, width, height) {
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#7ec3ee');
  g.addColorStop(0.45, '#a8d8f2');
  g.addColorStop(0.75, '#e8f3e2');
  g.addColorStop(1, '#f6e8c8');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Sun with glow.
  const sunX = width - 190 - camX * 0.02;
  const sunY = 96 - camY * 0.05;
  const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 90);
  glow.addColorStop(0, 'rgba(255, 244, 190, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 226, 130, 0.55)');
  glow.addColorStop(1, 'rgba(255, 226, 130, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 90, sunY - 90, 180, 180);
  ctx.fillStyle = '#fff3b0';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();

  // Drifting clouds, parallax 0.4.
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  for (const c of terrain.clouds) {
    const sx = (((c.x + time * c.v - camX * 0.4) % (WORLD_LENGTH + 800)) + WORLD_LENGTH + 800) % (WORLD_LENGTH + 800) - 400;
    const sy = c.y - camY * 0.15;
    if (sx < -260 || sx > width + 260) continue;
    ctx.beginPath();
    ctx.ellipse(sx, sy, 74 * c.s, 20 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + 44 * c.s, sy + 6 * c.s, 52 * c.s, 16 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx - 48 * c.s, sy + 7 * c.s, 46 * c.s, 14 * c.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ridgeLine(ctx, peaks, camX, parallax, baseY, color, width, height, snow) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-4, height + 4);
  for (let sx = -4; sx <= width + 8; sx += 8) {
    const wx = sx + camX * parallax;
    let y = baseY;
    for (const p of peaks) {
      const d = (wx - p.x) / 900;
      y -= p.h * Math.exp(-d * d);
    }
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(width + 4, height + 4);
  ctx.closePath();
  ctx.fill();
  if (!snow) return;
  // Snow caps on the far peaks.
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const p of peaks) {
    const sx = p.x - camX * parallax;
    if (sx < -120 || sx > width + 120) continue;
    ctx.beginPath();
    ctx.moveTo(sx - 52, baseY - p.h + 26);
    ctx.lineTo(sx, baseY - p.h - 6);
    ctx.lineTo(sx + 52, baseY - p.h + 26);
    ctx.lineTo(sx + 22, baseY - p.h + 14);
    ctx.lineTo(sx, baseY - p.h + 30);
    ctx.lineTo(sx - 22, baseY - p.h + 14);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawFarLayers(ctx, camX, camY, terrain, width, height) {
  ridgeLine(ctx, terrain.farPeaks, camX, 0.22, 470 - camY * 0.1, '#8aa8cf', width, height, true);
  ridgeLine(ctx, terrain.midHills, camX, 0.5, 540 - camY * 0.2, '#6f9a72', width, height, false);
}

export function drawGround(ctx, camX, camY, terrain, width, height) {
  const top = [];
  for (let sx = -4; sx <= width + 8; sx += 8) {
    top.push([sx, terrain.heightAt(sx + camX) - camY]);
  }
  // Dirt body.
  ctx.fillStyle = '#7a5a38';
  ctx.beginPath();
  ctx.moveTo(-4, height + 4);
  for (const [sx, sy] of top) ctx.lineTo(sx, sy);
  ctx.lineTo(width + 4, height + 4);
  ctx.closePath();
  ctx.fill();
  // Grassy top band.
  ctx.fillStyle = '#5d8a48';
  ctx.beginPath();
  ctx.moveTo(-4, top[0][1]);
  for (const [sx, sy] of top) ctx.lineTo(sx, sy);
  for (let i = top.length - 1; i >= 0; i--) ctx.lineTo(top[i][0], top[i][1] + 16);
  ctx.closePath();
  ctx.fill();
  // River glint where the valley dips.
  ctx.fillStyle = '#4f9fd8';
  ctx.beginPath();
  const r0 = 2100 - camX, r1 = 2620 - camX;
  if (r1 > -40 && r0 < width + 40) {
    ctx.moveTo(Math.max(-4, r0), terrain.heightAt(Math.max(0, r0 + camX)) - camY + 4);
    for (let sx = Math.max(-4, r0); sx <= Math.min(width + 4, r1); sx += 8) {
      ctx.lineTo(sx, terrain.heightAt(sx + camX) - camY + 4);
    }
    for (let sx = Math.min(width + 4, r1); sx >= Math.max(-4, r0); sx -= 8) {
      ctx.lineTo(sx, terrain.heightAt(sx + camX) - camY + 14);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Pine trees on gentle slopes.
  for (const t of terrain.trees) {
    const sx = t.x - camX;
    if (sx < -30 || sx > width + 30) continue;
    const gy = terrain.heightAt(t.x) - camY;
    const h = 34 * t.s;
    const green = t.tint >= 0 ? '#2f6b34' : '#357a3a';
    ctx.fillStyle = '#5a3d24';
    ctx.fillRect(sx - 2, gy - 8 * t.s, 4, 8 * t.s);
    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.moveTo(sx, gy - h - 6 * t.s);
    ctx.lineTo(sx - 11 * t.s, gy - 6 * t.s);
    ctx.lineTo(sx + 11 * t.s, gy - 6 * t.s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(sx, gy - h * 0.72);
    ctx.lineTo(sx - 8 * t.s, gy - 4 * t.s);
    ctx.lineTo(sx + 8 * t.s, gy - 4 * t.s);
    ctx.closePath();
    ctx.fill();
  }
}

export function drawRunway(ctx, camX, camY, x0, x1, y, label) {
  const sx0 = x0 - camX;
  const sx1 = x1 - camX;
  const sy = y - camY;
  ctx.fillStyle = '#3c3f45';
  ctx.fillRect(sx0, sy - 4, sx1 - sx0, 10);
  ctx.fillStyle = '#f2f2f2';
  for (let x = sx0 + 26; x < sx1 - 20; x += 64) ctx.fillRect(x, sy, 30, 2.5);
  // Edge lights.
  for (let x = sx0 + 8; x <= sx1 - 8; x += 72) {
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.arc(x, sy - 8, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, (sx0 + sx1) / 2, sy - 18);
  ctx.textAlign = 'left';
}
