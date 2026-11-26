// game.js — the loop: states (title / flying / paused / landed / crashed /
// complete), camera chase, ring pickups, ground contact and screenshot modes.
import { makeTerrain, WORLD_LENGTH } from './terrain.js';
import { makePlane, stepPlane, applyImpact } from './plane.js';
import { MISSIONS, makeMissionState, missionReadyToLand, stepWind, scoreLanding } from './missions.js';
import { drawScene } from './render.js';
import { makeAudio } from './audio.js';

const VIEW_W = 1280;
const VIEW_H = 720;

export function makeGame(canvas, shot, seed) {
  const ctx = canvas.getContext('2d');
  const terrain = makeTerrain(seed);
  const audio = makeAudio();

  const g = {
    canvas, ctx, terrain, seed, shot,
    state: 'title',
    time: 0,
    selectedMission: 0,
    plane: makePlane(420, terrain.heightAt(420) - 14),
    missionState: makeMissionState(MISSIONS[0], seed),
    cam: { x: 0, y: 0 },
    endReason: '',
    titleButtons: [],
    frozen: !!shot, // screenshot modes render one composed frame
    input: null,
  };

  function startMission(index) {
    g.selectedMission = index;
    g.missionState = makeMissionState(MISSIONS[index], g.seed);
    const m = MISSIONS[index];
    const startX = m.id === 'rescue' ? 420 : 420;
    g.plane = makePlane(startX, terrain.heightAt(startX) - 14);
    g.plane.onGround = true;
    g.state = 'flying';
    g.endReason = '';
    snapCamera();
  }

  function snapCamera() {
    g.cam.x = Math.max(0, Math.min(WORLD_LENGTH - VIEW_W, g.plane.x - 380));
    g.cam.y = Math.max(-560, Math.min(140, g.plane.y - 400));
  }

  function updateCamera(dt) {
    const tx = Math.max(0, Math.min(WORLD_LENGTH - VIEW_W, g.plane.x - 380));
    const ty = Math.max(-560, Math.min(140, g.plane.y - 400));
    const k = Math.min(1, dt * 3.2);
    g.cam.x += (tx - g.cam.x) * k;
    g.cam.y += (ty - g.cam.y) * k;
  }

  function checkRings() {
    const ms = g.missionState;
    const p = g.plane;
    for (const r of ms.rings) {
      if (r.taken) continue;
      const dx = p.x - r.x;
      const dy = p.y - (r.y + Math.sin(g.time * 1.6 + r.bob) * 5);
      if (dx * dx + dy * dy < 46 * 46) {
        r.taken = true;
        ms.ringsTaken++;
        ms.score += 150;
      }
    }
    // Rescue pickup: slow pass over the clearing.
    if (ms.mission.id === 'rescue' && !ms.pickedUp && ms.ringsTaken >= ms.rings.length) {
      const pk = ms.mission.pickup;
      if (p.x > pk.x0 && p.x < pk.x1 && p.speed < 170 && p.y > pk.y - 150) {
        ms.pickedUp = true;
        ms.score += 200;
      }
    }
  }

  function checkGround(dt) {
    const p = g.plane;
    const gy = terrain.heightAt(p.x);
    if (p.y + 14 < gy) {
      p.onGround = false;
      return;
    }
    p.y = gy - 14;
    // Taxiing on the wheels: rough ground at speed hurts the airframe.
    if (p.onGround) {
      const overFlat = terrain.flatZones.some(([x0, x1]) => p.x > x0 && p.x < x1);
      if (!overFlat && p.speed > 180) {
        p.damage = Math.min(100, p.damage + 30 * dt);
        if (p.damage >= 100) {
          g.state = 'crashed';
          g.endReason = 'Ran off the strip into the rough — the Kestrel is done.';
        }
      }
      return;
    }
    // Airborne contact: a touchdown, judged by how hard it is.
    p.onGround = true;
    const dest = g.missionState.mission.dest;
    const overStrip = p.x > dest.x0 && p.x < dest.x1;
    const impactVy = p.vy;
    const result = applyImpact(p, impactVy, !overStrip);
    if (result === 'landed') {
      p.speed = 0;
      p.vy = 0;
      if (missionReadyToLand(g.missionState)) {
        g.missionState.score = scoreLanding(g.missionState, impactVy, p.damage, g.missionState.elapsed);
        g.state = 'complete';
        g.endReason = 'Wheels down on the strip.';
      } else {
        g.state = 'landed';
        g.endReason = 'Down safe — but the job is not done. Press R to fly again.';
      }
    } else if (result === 'crashed') {
      g.state = 'crashed';
      g.endReason = overStrip
        ? 'Too hard on the strip — the Kestrel is done.'
        : 'Into the mountainside. The valley wins this one.';
    } else {
      // Rough bounce: back into the air, slower and hurt.
      p.onGround = false;
      p.y = gy - 16;
      p.vy = -40;
      p.speed *= 0.5;
    }
  }

  function step(dt) {
    g.time += dt;
    if (g.state === 'flying') {
      const wind = stepWind(g.missionState, dt, g.time);
      stepPlane(g.plane, g.input.state, dt, wind);
      g.missionState.elapsed += dt;
      checkRings();
      checkGround(dt);
      if (g.plane.x > WORLD_LENGTH - 200) {
        g.state = 'crashed';
        g.endReason = 'Flew clean off the end of the valley.';
      }
      updateCamera(dt);
    }
    audio.update(g.plane.throttle, g.plane.speed, g.state === 'flying');
  }

  function handleKeys() {
    const pr = g.input.state.pressed;
    // Number keys pick the mission first, so a fast "3, Enter" lands on
    // the mission the player just picked. Arrow browsing runs after Enter,
    // so holding Right to throttle up can never re-pick the mission.
    if (g.state === 'title') {
      if (pr.Digit1) g.selectedMission = 0;
      if (pr.Digit2) g.selectedMission = 1;
      if (pr.Digit3) g.selectedMission = 2;
    }
    if (pr.Enter) {
      if (g.state === 'title') startMission(g.selectedMission);
      else if (g.state === 'landed' || g.state === 'crashed' || g.state === 'complete') startMission(g.selectedMission);
    }
    if (g.state === 'title') {
      if (pr.ArrowLeft || pr.KeyA) g.selectedMission = (g.selectedMission + 2) % 3;
      if (pr.ArrowRight || pr.KeyD) g.selectedMission = (g.selectedMission + 1) % 3;
    }
    if (pr.KeyR && g.state !== 'title') startMission(g.selectedMission);
    if (pr.KeyT && g.state !== 'title' && g.state !== 'flying') {
      g.state = 'title';
      g.plane = makePlane(420, terrain.heightAt(420) - 14);
      snapCamera();
    }
    if (pr.KeyP && g.state === 'flying') g.state = 'paused';
    else if (pr.KeyP && g.state === 'paused') g.state = 'flying';
    if (g.state === 'title' && g.input.state.clicked) {
      for (const b of g.titleButtons) {
        const s = g.input.state;
        if (s.mouseX >= b.x && s.mouseX <= b.x + b.w && s.mouseY >= b.y && s.mouseY <= b.y + b.h) {
          startMission(b.index);
          break;
        }
      }
    }
  }

  function applyShot() {
    // Deterministic composed frames for screenshots (?shot=…&seed=N).
    const m = MISSIONS[0];
    g.missionState = makeMissionState(m, g.seed);
    if (shot === 'start') {
      g.state = 'title';
      g.plane = makePlane(420, terrain.heightAt(420) - 14);
    } else if (shot === 'play') {
      g.state = 'flying';
      g.missionState.ringsTaken = 2;
      g.missionState.rings[0].taken = true;
      g.missionState.rings[1].taken = true;
      g.missionState.elapsed = 24.6;
      g.missionState.score = 300;
      g.plane = makePlane(4800, 445);
      g.plane.speed = 235;
      g.plane.throttle = 0.72;
      g.plane.pitch = 0.1;
      g.plane.fuel = 78;
      g.plane.onGround = false;
      g.time = 24.6;
    } else if (shot === 'land') {
      g.state = 'flying';
      g.missionState.ringsTaken = 6;
      for (const r of g.missionState.rings) r.taken = true;
      g.missionState.elapsed = 61.2;
      g.missionState.score = 900;
      g.plane = makePlane(10860, terrain.heightAt(10860) - 26);
      g.plane.speed = 118;
      g.plane.throttle = 0.35;
      g.plane.pitch = 0.06;
      g.plane.flaps = true;
      g.plane.fuel = 41;
      g.plane.vy = 42;
      g.plane.onGround = false;
      g.time = 61.2;
    } else if (shot === 'end') {
      g.state = 'complete';
      g.missionState.ringsTaken = 6;
      for (const r of g.missionState.rings) r.taken = true;
      g.missionState.elapsed = 68.4;
      g.missionState.score = 1840;
      g.plane = makePlane(11040, terrain.heightAt(11040) - 14);
      g.plane.speed = 0;
      g.plane.throttle = 0;
      g.plane.fuel = 38;
      g.plane.damage = 4;
      g.plane.onGround = true;
      g.time = 68.4;
    }
    snapCamera();
    // Nudge the camera so the plane sits left-of-centre in the play shot.
    if (shot === 'play') g.cam.x = g.plane.x - 430;
    if (shot === 'land' || shot === 'end') g.cam.x = g.plane.x - 560;
  }

  let last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (!g.frozen) {
      handleKeys();
      step(dt);
    }
    drawScene(ctx, g, VIEW_W, VIEW_H);
    g.input.endFrame();
  }

  return {
    game: g,
    attachInput(input) {
      g.input = input;
      input.attachCanvas(canvas);
      canvas.addEventListener('pointerdown', () => audio.start(), { once: false });
      window.addEventListener('keydown', () => audio.start(), { once: true });
    },
    start() {
      if (shot) applyShot();
      else snapCamera();
      requestAnimationFrame(frame);
    },
  };
}
