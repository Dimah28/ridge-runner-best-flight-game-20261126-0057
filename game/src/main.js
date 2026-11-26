// main.js — boot: read the screenshot query (?shot=…&seed=N),
// wire input to the game, and start the loop.
import { makeGame } from './game.js';
import { makeInput } from './input.js';

window.addEventListener('error', (e) => {
  document.title = `ERR: ${e.message}`;
});

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '1') || 1;

const canvas = document.getElementById('game');
const input = makeInput();
const entry = makeGame(canvas, shot, seed);

entry.attachInput(input);
entry.start();
document.title = 'Ridge Runner Airlift';
// Debug handle for automated play-tests (read-only state inspection).
window.__rr = entry.game;
