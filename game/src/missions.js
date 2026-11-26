// missions.js — the three sorties: their rings, goals, wind and scoring.
import { makeRng } from './rng.js';

export const MISSIONS = [
  {
    id: 'mail',
    name: 'Mail Run',
    blurb: 'Thread 6 rings down the valley, then put her down on the far strip.',
    rings: [
      { x: 2000, y: 470 }, { x: 3500, y: 330 }, { x: 5000, y: 460 },
      { x: 6500, y: 380 }, { x: 8000, y: 470 }, { x: 9500, y: 420 },
    ],
    dest: { x0: 10550, x1: 11450, y: 600, label: 'FAR STRIP' },
    wind: 0,
  },
  {
    id: 'rescue',
    name: 'Ridge Rescue',
    blurb: 'Slip the ridge gap, slow over the clearing to pick up the hiker, fly home.',
    rings: [
      { x: 6100, y: 470 }, { x: 6800, y: 470 },
    ],
    pickup: { x0: 6480, x1: 7120, y: 560 },
    dest: { x0: 120, x1: 980, y: 600, label: 'BASE' },
    wind: 0,
  },
  {
    id: 'storm',
    name: 'Storm Delivery',
    blurb: 'Gusts all the way. Put the cargo down on the short strip — no second try.',
    rings: [
      { x: 2400, y: 450 }, { x: 5200, y: 400 }, { x: 7600, y: 450 },
    ],
    dest: { x0: 8580, x1: 9220, y: 600, label: 'SHORT STRIP' },
    wind: 1, // gusts on
  },
];

export function makeMissionState(mission, seed) {
  const rng = makeRng(seed * 31 + 7);
  return {
    mission,
    rings: mission.rings.map((r) => ({ ...r, taken: false, bob: rng.range(0, Math.PI * 2) })),
    pickedUp: false,
    ringsTaken: 0,
    startTime: 0,
    elapsed: 0,
    score: 0,
    gust: 0,
    gustTarget: 0,
  };
}

export function missionObjective(ms) {
  const m = ms.mission;
  if (m.id === 'mail') {
    if (ms.ringsTaken < ms.rings.length) return `MAIL RUN — ring ${ms.ringsTaken + 1} of ${ms.rings.length}, then land FAR STRIP`;
    return 'MAIL RUN — all rings! Land on FAR STRIP';
  }
  if (m.id === 'rescue') {
    if (!ms.pickedUp) {
      if (ms.ringsTaken < ms.rings.length) return `RESCUE — thread the gap, ring ${ms.ringsTaken + 1} of ${ms.rings.length}`;
      return 'RESCUE — slow below 160 over the clearing to pick up';
    }
    return 'RESCUE — hiker aboard! Fly home, land at BASE';
  }
  if (ms.ringsTaken < ms.rings.length) return `STORM — ring ${ms.ringsTaken + 1} of ${ms.rings.length}, then SHORT STRIP`;
  return 'STORM — cargo run done! Land on SHORT STRIP';
}

export function missionReadyToLand(ms) {
  if (ms.mission.id === 'mail' || ms.mission.id === 'storm') return ms.ringsTaken >= ms.rings.length;
  return ms.pickedUp; // rescue: only after the pickup
}

// Wind gusts for the storm mission: seeded, smooth, -70..+90 px/s.
export function stepWind(ms, dt, time) {
  if (!ms.mission.wind) {
    ms.gust = 0;
    return 0;
  }
  if (time - (ms._gustAt || 0) > 1.6) {
    ms._gustAt = time;
    ms.gustTarget = Math.sin(time * 0.9) * 55 + Math.sin(time * 2.3 + 1.7) * 35;
  }
  ms.gust += (ms.gustTarget - ms.gust) * Math.min(1, dt * 1.4);
  return ms.gust;
}

export function scoreLanding(ms, verticalSpeed, damage, elapsed) {
  const soft = Math.max(0, 500 - Math.abs(verticalSpeed) * 4);
  const timeBonus = Math.max(0, 600 - Math.round(elapsed) * 5);
  const ringBonus = ms.ringsTaken * 150;
  const healthBonus = Math.max(0, 100 - damage) * 2;
  return ringBonus + Math.round(soft) + timeBonus + Math.round(healthBonus);
}
