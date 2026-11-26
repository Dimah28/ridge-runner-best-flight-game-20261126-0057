// input.js — keyboard and mouse state for the Kestrel.
// ArrowUp/Down or W/S pitch, ArrowLeft/Right or A/D throttle,
// Space flaps, R restart, P pause, Enter/click starts.
export function makeInput() {
  const keys = {};
  const state = {
    up: false, down: false, left: false, right: false, flaps: false,
    pressed: {}, // edge-triggered keys, consumed by the game loop
    mouseX: 0, mouseY: 0, clicked: false,
  };

  function refresh() {
    state.up = !!(keys.ArrowUp || keys.KeyW);
    state.down = !!(keys.ArrowDown || keys.KeyS);
    state.left = !!(keys.ArrowLeft || keys.KeyA);
    state.right = !!(keys.ArrowRight || keys.KeyD);
    state.flaps = !!keys.Space;
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) state.pressed[e.code] = true;
    keys[e.code] = true;
    refresh();
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    refresh();
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    refresh();
  });

  return {
    state,
    attachCanvas(canvas) {
      canvas.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        state.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
        state.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
      });
      canvas.addEventListener('pointerdown', (e) => {
        const r = canvas.getBoundingClientRect();
        state.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
        state.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
        state.clicked = true;
      });
    },
    endFrame() {
      state.pressed = {};
      state.clicked = false;
    },
  };
}
