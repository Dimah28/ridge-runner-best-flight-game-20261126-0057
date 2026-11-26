// plane.js — the Kestrel bush plane: throttle, pitch, lift, stall, drag,
// fuel burn and damage. Arcade physics tuned to feel like a light prop plane.
export const STALL_SPEED = 96; // px/s, 78 with flaps
export const MAX_PITCH = 0.62;

export function makePlane(x, y) {
  return {
    x, y, // centre, world px (y down)
    speed: 0, // along the nose, px/s
    pitch: 0, // rad, positive = nose up
    throttle: 0,
    flaps: false,
    fuel: 100,
    damage: 0,
    vy: 0, // vertical speed, px/s (positive = sinking)
    stalled: false,
    onGround: true,
  };
}

export function stepPlane(p, input, dt, wind) {
  // Throttle: Left/Right (or A/D). Pitch: Up/Down (or W/S).
  if (input.left) p.throttle = Math.max(0, p.throttle - 0.7 * dt);
  if (input.right) p.throttle = Math.min(1, p.throttle + 0.7 * dt);
  if (input.up) p.pitch = Math.min(MAX_PITCH, p.pitch + 0.9 * dt);
  if (input.down) p.pitch = Math.max(-MAX_PITCH, p.pitch - 0.9 * dt);
  p.flaps = !!input.flaps;
  // Gentle auto-level when the pilot lets go of the stick.
  if (!input.up && !input.down) p.pitch += (0 - p.pitch) * 0.35 * dt;

  const stall = p.flaps ? STALL_SPEED * 0.8 : STALL_SPEED;
  const liftFactor = Math.min(1, (p.speed / stall) * (p.speed / stall));
  p.stalled = p.speed < stall && !p.onGround;

  // Thrust vs drag along the nose. Rolling on the ground costs extra drag.
  const thrust = p.throttle * 165;
  const drag = 16 + p.speed * 0.055 + p.speed * p.speed * 0.0011 + (p.flaps ? 26 : 0) + (p.onGround ? 90 : 0);
  p.speed += (thrust - drag) * dt;
  if (p.speed < 0) p.speed = 0;

  // Taxiing: the wheels hold the plane up, no sink. Lift off once there is
  // flying speed and the pilot pulls the nose up.
  if (p.onGround) {
    p.vy = 0;
    if (p.speed >= stall && p.pitch > 0.04) p.onGround = false;
    else {
      p.x += p.speed * Math.cos(p.pitch) * dt;
      if (p.throttle > 0 && p.fuel > 0) {
        p.fuel = Math.max(0, p.fuel - (0.22 + p.throttle * 1.05) * dt);
        if (p.fuel === 0) p.throttle = 0;
      }
      return p;
    }
  }

  // Stall: the nose drops and the plane sinks.
  if (p.stalled) p.pitch = Math.max(-0.5, p.pitch - 1.1 * dt);

  const vx = p.speed * Math.cos(p.pitch) + wind;
  const sink = 300 * (1 - liftFactor);
  p.vy = -p.speed * Math.sin(p.pitch) + sink;
  p.x += vx * dt;
  p.y += p.vy * dt;

  // Service ceiling: thin air pushes the Kestrel back down.
  if (p.y < -120) p.y += (-120 - p.y) * 8 * dt;
  if (p.y < -220) p.y = -220;

  // Fuel burns with throttle; empty tank means a glide.
  if (p.throttle > 0 && p.fuel > 0) {
    p.fuel = Math.max(0, p.fuel - (0.22 + p.throttle * 1.05) * dt);
    if (p.fuel === 0) p.throttle = 0;
  }
  return p;
}

export function applyImpact(p, verticalSpeed, hard) {
  // Returns 'landed' | 'damaged' | 'crashed'.
  const v = Math.abs(verticalSpeed);
  if (!hard && v < 95 && Math.abs(p.pitch) < 0.28 && p.speed < 330) return 'landed';
  // Into rough ground at speed, or a very hard hit, is fatal outright.
  if (hard && (p.speed > 190 || v > 150)) {
    p.damage = 100;
    return 'crashed';
  }
  const hit = Math.round(v * 0.16 + p.speed * 0.05);
  p.damage = Math.min(100, p.damage + hit);
  p.speed *= 0.45;
  if (p.damage >= 100) return 'crashed';
  return 'damaged';
}
