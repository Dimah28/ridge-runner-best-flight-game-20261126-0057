// render.js — draws the scene: sky, layers, ground, runways, rings,
// the Kestrel herself, and the title / end screens.
import { drawSky, drawFarLayers, drawGround, drawRunway } from './terrain.js';
import { drawHud, fmtTime } from './hud.js';
import { MISSIONS } from './missions.js';

export function drawPlane(ctx, sx, sy, pitch, time, scale = 1) {
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-pitch);
  ctx.scale(scale, scale);
  // Shadow under the plane is drawn by the caller on the ground.
  // Tail.
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.moveTo(-34, -4);
  ctx.lineTo(-48, -22);
  ctx.lineTo(-40, -22);
  ctx.lineTo(-28, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#a93226';
  ctx.beginPath();
  ctx.moveTo(-34, 2);
  ctx.lineTo(-50, 8);
  ctx.lineTo(-44, 12);
  ctx.lineTo(-30, 6);
  ctx.closePath();
  ctx.fill();
  // Fuselage: cream body, red cheatline.
  ctx.fillStyle = '#f5ecd7';
  ctx.beginPath();
  ctx.moveTo(-36, -6);
  ctx.quadraticCurveTo(-10, -14, 22, -8);
  ctx.quadraticCurveTo(40, -4, 40, 2);
  ctx.quadraticCurveTo(38, 10, 18, 11);
  ctx.lineTo(-28, 10);
  ctx.quadraticCurveTo(-38, 8, -36, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(-34, 2, 70, 3.5);
  // Cockpit windows.
  ctx.fillStyle = '#9fd8ef';
  ctx.beginPath();
  ctx.moveTo(6, -11);
  ctx.lineTo(20, -9);
  ctx.lineTo(18, -2);
  ctx.lineTo(4, -3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a5a38';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Wing (side view: the near wing below the fuselage).
  ctx.fillStyle = '#e8dcc0';
  ctx.beginPath();
  ctx.moveTo(-6, 6);
  ctx.lineTo(14, 6);
  ctx.lineTo(10, 26);
  ctx.lineTo(-12, 26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#b8a888';
  ctx.lineWidth = 1;
  ctx.stroke();
  // Landing gear.
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-8, 10);
  ctx.lineTo(-12, 24);
  ctx.moveTo(10, 10);
  ctx.lineTo(14, 24);
  ctx.beginPath();
  ctx.arc(-12, 26, 4, 0, Math.PI * 2);
  ctx.moveTo(18, 26);
  ctx.arc(14, 26, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(-12, 26, 4, 0, Math.PI * 2);
  ctx.arc(14, 26, 4, 0, Math.PI * 2);
  ctx.fill();
  // Registration.
  ctx.fillStyle = '#333333';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('RR-01', -30, -1);
  // Propeller: spinning blades + hub.
  const a = time * 28;
  ctx.strokeStyle = 'rgba(60, 60, 60, 0.85)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40 + Math.cos(a) * 16, Math.sin(a) * 16);
  ctx.lineTo(40 - Math.cos(a) * 16, -Math.sin(a) * 16);
  ctx.stroke();
  ctx.fillStyle = '#888888';
  ctx.beginPath();
  ctx.arc(40, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRing(ctx, sx, sy, time, taken, index) {
  if (taken) return;
  const bob = Math.sin(time * 1.6 + index) * 5;
  const y = sy + bob;
  const glow = ctx.createRadialGradient(sx, y, 10, sx, y, 70);
  glow.addColorStop(0, 'rgba(255, 211, 77, 0.5)');
  glow.addColorStop(1, 'rgba(255, 211, 77, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 70, y - 70, 140, 140);
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#e8a91c';
  ctx.beginPath();
  ctx.arc(sx, y, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#ffe27a';
  ctx.beginPath();
  ctx.arc(sx, y, 44, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#7a4d00';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(index + 1), sx, y - 56);
  ctx.textAlign = 'left';
}

function drawWorld(ctx, g, width, height) {
  const t = g.terrain;
  const camX = g.cam.x;
  const camY = g.cam.y;
  drawSky(ctx, camX, camY, g.time, t, width, height);
  drawFarLayers(ctx, camX, camY, t, width, height);
  drawGround(ctx, camX, camY, t, width, height);
  // Runways: base, storm strip, destination. On the title screen the menu
  // text sits over the runway, so the strip labels stay hidden there.
  const stripLabel = g.state === 'title' ? '' : null;
  drawRunway(ctx, camX, camY, 120, 980, 600, stripLabel ?? 'BASE');
  drawRunway(ctx, camX, camY, 8580, 9220, 600, stripLabel ?? 'SHORT STRIP');
  drawRunway(ctx, camX, camY, 10550, 11450, 600, stripLabel ?? 'FAR STRIP');
  // Storm rain.
  if (g.missionState.mission.wind && g.state === 'flying') {
    ctx.strokeStyle = 'rgba(200, 220, 240, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const rx = ((i * 137 + g.time * 900) % (width + 80)) - 40;
      const ry = (i * 211 + g.time * 1400) % height;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 8, ry + 22);
      ctx.stroke();
    }
  }
  // Rings.
  const ms = g.missionState;
  ms.rings.forEach((r, i) => drawRing(ctx, r.x - camX, r.y - camY, g.time, r.taken, i));
  // Pickup hiker marker.
  if (ms.mission.id === 'rescue' && !ms.pickedUp) {
    const hx = 6800 - camX;
    const hy = t.heightAt(6800) - camY;
    ctx.fillStyle = '#ff5b4d';
    ctx.beginPath();
    ctx.arc(hx, hy - 26, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HIKER', hx, hy - 40);
    ctx.textAlign = 'left';
  }
  // Plane + its ground shadow.
  const p = g.plane;
  const psx = p.x - camX;
  const psy = p.y - camY;
  const gy = t.heightAt(p.x) - camY;
  if (gy - psy < 220) {
    ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 0.28 - (gy - psy) * 0.001)})`;
    ctx.beginPath();
    ctx.ellipse(psx, gy + 4, 42, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawPlane(ctx, psx, psy, p.pitch, g.time);
}

function drawTitle(ctx, g, width, height) {
  ctx.fillStyle = 'rgba(8, 18, 34, 0.45)';
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 58px monospace';
  ctx.fillText('RIDGE RUNNER', width / 2, 128);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 44px monospace';
  ctx.fillText('A I R L I F T', width / 2, 182);
  ctx.fillStyle = '#dff0ff';
  ctx.font = '17px monospace';
  ctx.fillText('Bush pilot in the high valley — fly the Kestrel, mind the fuel, mind the rocks.', width / 2, 218);
  // Mission cards.
  g.titleButtons = [];
  const bw = 330;
  const bh = 132;
  const gap = 26;
  const x0 = width / 2 - (bw * 3 + gap * 2) / 2;
  MISSIONS.forEach((m, i) => {
    const x = x0 + i * (bw + gap);
    const y = 262;
    const hover = g.input.state.mouseX >= x && g.input.state.mouseX <= x + bw &&
      g.input.state.mouseY >= y && g.input.state.mouseY <= y + bh;
    g.titleButtons.push({ x, y, w: bw, h: bh, index: i });
    ctx.fillStyle = hover ? 'rgba(255, 211, 77, 0.28)' : 'rgba(10, 26, 46, 0.78)';
    ctx.fillRect(x, y, bw, bh);
    ctx.strokeStyle = i === g.selectedMission ? '#ffd34d' : '#4a6a8a';
    ctx.lineWidth = i === g.selectedMission ? 3 : 1.5;
    ctx.strokeRect(x, y, bw, bh);
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 19px monospace';
    ctx.fillText(`${i + 1}. ${m.name.toUpperCase()}`, width / 2 + (x + bw / 2 - width / 2), y + 34);
    ctx.fillStyle = '#dff0ff';
    ctx.font = '14px monospace';
    wrapText(ctx, m.blurb, x + bw / 2, y + 62, bw - 28, 19);
  });
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px monospace';
  ctx.fillText('ENTER or CLICK a mission to fly', width / 2, 452);
  ctx.fillStyle = '#cfe6ff';
  ctx.font = '15px monospace';
  ctx.fillText('W/S or ↑/↓ pitch   ·   A/D or ←/→ throttle   ·   SPACE flaps   ·   P pause   ·   R restart', width / 2, 486);
  ctx.fillText('Land soft on the strip. Rings pay 150. Fuel and damage are the real bosses.', width / 2, 514);
  ctx.textAlign = 'left';
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, cx, yy);
}

function drawEndPanel(ctx, g, width, height, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 18, 34, 0.55)';
  ctx.fillRect(0, 0, width, height);
  const pw = 620;
  const ph = 300;
  const px = width / 2 - pw / 2;
  const py = height / 2 - ph / 2;
  ctx.fillStyle = 'rgba(10, 26, 46, 0.92)';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.strokeRect(px, py, pw, ph);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px monospace';
  ctx.fillText(title, width / 2, py + 58);
  ctx.fillStyle = '#ffffff';
  ctx.font = '17px monospace';
  lines.forEach((l, i) => ctx.fillText(l, width / 2, py + 104 + i * 30));
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('R — fly again    ·    T — back to title', width / 2, py + ph - 26);
  ctx.textAlign = 'left';
}

export function drawScene(ctx, g, width, height) {
  drawWorld(ctx, g, width, height);
  if (g.state === 'title') {
    drawTitle(ctx, g, width, height);
    return;
  }
  drawHud(ctx, g, width, height);
  if (g.state === 'paused') {
    drawEndPanel(ctx, g, width, height, 'PAUSED', ['The Kestrel waits. The valley does not.'], '#cfe6ff');
  } else if (g.state === 'crashed') {
    drawEndPanel(ctx, g, width, height, 'CRASHED', [
      g.endReason || 'The valley wins this one.',
      `Rings: ${g.missionState.ringsTaken}/${g.missionState.rings.length}   ·   Score: ${g.missionState.score}`,
    ], '#ff5b4d');
  } else if (g.state === 'landed') {
    drawEndPanel(ctx, g, width, height, 'LANDED', [
      g.endReason || 'Wheels down.',
      `Rings: ${g.missionState.ringsTaken}/${g.missionState.rings.length}   ·   Score: ${g.missionState.score}`,
    ], '#cfe6ff');
  } else if (g.state === 'complete') {
    const ms = g.missionState;
    drawEndPanel(ctx, g, width, height, 'MISSION COMPLETE', [
      `${ms.mission.name} — flown and delivered.`,
      `Time ${fmtTime(ms.elapsed)}   ·   Rings ${ms.ringsTaken}/${ms.rings.length}`,
      `Damage ${Math.round(g.plane.damage)}%   ·   Fuel left ${Math.round(g.plane.fuel)}%`,
      `FINAL SCORE: ${ms.score}`,
    ], '#37b24d');
  }
}
