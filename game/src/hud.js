// hud.js — the instruments: top bar (alt/speed/heading/timer/score),
// compass strip, lit round gauges, fuel and damage bars, warnings.
import { missionObjective } from './missions.js';

const INK = '#12233a';

function roundGauge(ctx, cx, cy, r, label, value, max, unit, ticks) {
  // Lit face: warm bright dial with a soft glow, like a backlit instrument.
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.25);
  glow.addColorStop(0, 'rgba(255, 240, 180, 0.5)');
  glow.addColorStop(1, 'rgba(255, 240, 180, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 1.3, cy - r * 1.3, r * 2.6, r * 2.6);
  ctx.fillStyle = '#fff6d8';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#2c3e55';
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.font = `bold ${Math.round(r * 0.22)}px monospace`;
  ctx.textAlign = 'center';
  for (let i = 0; i <= ticks; i++) {
    const a = (-225 + (i / ticks) * 270) * (Math.PI / 180);
    const v = Math.round((i / ticks) * max);
    const x1 = cx + Math.cos(a) * r * 0.82;
    const y1 = cy + Math.sin(a) * r * 0.82;
    const x2 = cx + Math.cos(a) * r * 0.94;
    const y2 = cy + Math.sin(a) * r * 0.94;
    ctx.lineWidth = i % 2 === 0 ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (i % 2 === 0 && i > 0 && i < ticks) {
      ctx.fillText(String(v), cx + Math.cos(a) * r * 0.62, cy + Math.sin(a) * r * 0.62 + 5);
    }
  }
  // Needle.
  const na = (-225 + Math.min(1, value / max) * 270) * (Math.PI / 180);
  ctx.strokeStyle = '#c0392b';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(na) * r * 0.78, cy + Math.sin(na) * r * 0.78);
  ctx.stroke();
  ctx.fillStyle = '#2c3e55';
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.font = `bold ${Math.round(r * 0.24)}px monospace`;
  ctx.fillText(label, cx, cy + r * 0.48);
  ctx.font = `${Math.round(r * 0.2)}px monospace`;
  ctx.fillText(`${Math.round(value)} ${unit}`, cx, cy + r * 0.68);
  ctx.textAlign = 'left';
}

export function drawHud(ctx, g, width, height) {
  const p = g.plane;
  const ms = g.missionState;
  const altFt = Math.max(0, (g.terrain.heightAt(p.x) - p.y) * 2);
  const spdKt = p.speed * 0.9;
  const hdg = 90 + Math.round(p.pitch * 30);

  // Top bar.
  ctx.fillStyle = 'rgba(10, 22, 38, 0.82)';
  ctx.fillRect(0, 0, width, 56);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(missionObjective(ms), 14, 22);
  ctx.fillStyle = '#cfe6ff';
  ctx.font = '13px monospace';
  ctx.fillText(`RINGS ${ms.ringsTaken}/${ms.rings.length}` + (ms.mission.id === 'rescue' ? (ms.pickedUp ? '  ·  HIKER ABOARD' : '  ·  PICKUP PENDING') : ''), 14, 42);

  // Compass strip, centred on heading.
  const ccx = width / 2;
  ctx.fillStyle = '#0e2036';
  ctx.fillRect(ccx - 150, 8, 300, 40);
  ctx.strokeStyle = '#4a6a8a';
  ctx.strokeRect(ccx - 150, 8, 300, 40);
  ctx.save();
  ctx.beginPath();
  ctx.rect(ccx - 150, 8, 300, 40);
  ctx.clip();
  ctx.fillStyle = '#cfe6ff';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';
  for (let d = -60; d <= 60; d += 10) {
    const deg = ((hdg + d) % 360 + 360) % 360;
    const x = ccx + d * 2.2;
    ctx.fillRect(x, 34, 1, 8);
    const label = deg % 30 === 0 ? String(deg).padStart(3, '0') : '';
    if (label) ctx.fillText(label, x, 28);
  }
  ctx.restore();
  ctx.fillStyle = '#ffd34d';
  ctx.beginPath();
  ctx.moveTo(ccx, 8);
  ctx.lineTo(ccx - 6, 18);
  ctx.lineTo(ccx + 6, 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`HDG ${String(hdg).padStart(3, '0')}°`, ccx, 62 - 8);
  ctx.textAlign = 'left';

  // Digital readouts, right side.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`ALT ${Math.round(altFt).toLocaleString()} FT`, width - 14, 22);
  ctx.fillText(`SPD ${Math.round(spdKt)} KT`, width - 14, 42);
  ctx.fillStyle = '#ffd34d';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`TIME ${fmtTime(ms.elapsed)}   SCORE ${ms.score}`, width - 14, 62 - 8);
  ctx.textAlign = 'left';

  // Round gauges, bottom corners.
  roundGauge(ctx, 92, height - 92, 66, 'AIRSPEED', spdKt, 220, 'KT', 10);
  roundGauge(ctx, width - 92, height - 92, 66, 'ALTITUDE', altFt, 9000, 'FT', 9);

  // Fuel and damage bars, bottom centre.
  bar(ctx, width / 2 - 190, height - 52, 170, 16, p.fuel / 100, p.fuel < 25 ? '#e74c3c' : '#37b24d', `FUEL ${Math.round(p.fuel)}%`);
  bar(ctx, width / 2 + 20, height - 52, 170, 16, 1 - p.damage / 100, p.damage > 60 ? '#e74c3c' : '#ffa94d', `DAMAGE ${Math.round(p.damage)}%`);

  // Warnings.
  if (p.stalled && g.state === 'flying') {
    ctx.fillStyle = Math.floor(g.time * 6) % 2 === 0 ? '#ff3b30' : '#ffffff';
    ctx.font = 'bold 30px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ STALL — NOSE DOWN, ADD POWER ⚠', width / 2, 108);
    ctx.textAlign = 'left';
  }
  if (p.fuel === 0 && g.state === 'flying') {
    ctx.fillStyle = '#ff3b30';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FUEL EMPTY — GLIDING', width / 2, 140);
    ctx.textAlign = 'left';
  }
  if (ms.mission.wind && g.state === 'flying') {
    ctx.fillStyle = '#cfe6ff';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    const arrow = ms.gust > 8 ? '→' : ms.gust < -8 ? '←' : '·';
    ctx.fillText(`WIND ${arrow} ${Math.abs(Math.round(ms.gust))} KT ${ms.gust > 0 ? 'TAIL' : ms.gust < 0 ? 'HEAD' : ''}`, width / 2, 168);
    ctx.textAlign = 'left';
  }
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(10, 22, 38, 0.8)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#22344a';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.max(0, w * frac), h);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h + 14);
  ctx.textAlign = 'left';
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
