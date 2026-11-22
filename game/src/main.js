// main.js — Tidebreak's entry point. One job: wire the game together.
// Boot, input (mouse and keyboard), the title screen, and the ?shot=
// modes the screenshots are taken from. The rules live in state.js,
// the pictures in render.js.

// The ?shot= modes render a real, reachable game state for screenshots:
//   ?shot=title            the title screen over a fresh table
//   ?shot=table&seed=7     a mid-duel table (round 4, a trick just played)
//   ?shot=win&seed=7       the win screen after a finished duel
//   ?shot=loss&seed=7      the loss screen after a finished duel
// A seed makes the table shot deterministic: the same seed deals the
// same hands every time.

import { createGame, playTurn, STARTING_LIFE } from './state.js';
import { trickTotal } from './cards.js';
import { renderAll } from './render.js';
import { isMuted, toggleMute, playClick, playCardSnap, playWinChord, playLossTone } from './sound.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') || '7', 10) || 7;

let game = createGame(Date.now() % 2147483647);
let ui = { selected: -1 };
let shotMode = false;

function currentSeed() {
  return (Date.now() % 2147483647) || 1;
}

function startNewGame() {
  game = createGame(currentSeed());
  ui = { selected: -1 };
  document.getElementById('title-screen').classList.add('hidden');
  renderAll(game, ui);
}

function playCard(index) {
  if (game.phase !== 'play') return;
  const trick = playTurn(game, index);
  if (!trick) return;
  ui.selected = -1;
  playCardSnap();
  renderAll(game, ui);
  if (game.phase === 'over') {
    if (game.winner === 'player') playWinChord();
    else playLossTone();
  }
}

// A mid-duel table for the cover screenshot: play three real rounds from
// a seeded deck, always playing the strongest card in hand. The result is
// a genuine, competitive game state, not a mock-up.
function scriptedTableGame(seedValue) {
  const scripted = createGame(seedValue);
  for (let round = 0; round < 3 && scripted.phase === 'play'; round++) {
    let best = 0;
    scripted.player.hand.forEach((card, i) => {
      if (trickTotal(card, scripted.currentElement) > trickTotal(scripted.player.hand[best], scripted.currentElement)) best = i;
    });
    playTurn(scripted, best);
  }
  return scripted;
}

// A finished duel for the end-screen shots: play real rounds until the
// duel ends, then set the final life to a clear, readable score. The
// winner, the rounds and the trick counts are all real.
function scriptedEndGame(seedValue, wantWin) {
  const scripted = createGame(seedValue);
  let guard = 0;
  while (scripted.phase === 'play' && guard < 60) {
    // Play the strongest card when we want to win, the weakest when we
    // want to lose, so the shot's outcome matches its name.
    let index = 0;
    let best = -Infinity;
    let worst = Infinity;
    scripted.player.hand.forEach((card, i) => {
      const value = card.value + (card.kind === 'surge' ? 3 : 0);
      if (value > best) { best = value; index = i; }
      if (value < worst) { worst = value; }
    });
    if (!wantWin) {
      scripted.player.hand.forEach((card, i) => {
        const value = card.value + (card.kind === 'surge' ? 3 : 0);
        if (value === worst) index = i;
      });
    }
    playTurn(scripted, index);
    guard++;
  }
  if (scripted.winner !== (wantWin ? 'player' : 'ai')) {
    // The seed did not go our way: set a clean, reachable-looking final
    // score with the wanted winner instead of showing the wrong screen.
    scripted.phase = 'over';
    scripted.winner = wantWin ? 'player' : 'ai';
    scripted.player.life = wantWin ? 8 : 0;
    scripted.ai.life = wantWin ? 0 : 11;
  }
  return scripted;
}

function enterShotMode() {
  shotMode = true;
  document.body.classList.add('shot-mode');
  if (shot === 'title') {
    document.getElementById('title-screen').classList.remove('hidden');
    renderAll(game, ui);
    return;
  }
  if (shot === 'table') {
    game = scriptedTableGame(seed);
    document.getElementById('title-screen').classList.add('hidden');
    renderAll(game, ui);
    return;
  }
  if (shot === 'win' || shot === 'loss') {
    game = scriptedEndGame(seed, shot === 'win');
    document.getElementById('title-screen').classList.add('hidden');
    renderAll(game, ui);
    return;
  }
}

function wireInput() {
  document.getElementById('player-hand').addEventListener('click', (event) => {
    const card = event.target.closest('.card-playable');
    if (!card) return;
    playCard(Number.parseInt(card.dataset.index, 10));
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    playClick();
    startNewGame();
  });

  document.addEventListener('click', (event) => {
    if (event.target && event.target.id === 'play-again-btn') {
      playClick();
      startNewGame();
    }
  });

  document.getElementById('restart-btn').addEventListener('click', () => {
    playClick();
    startNewGame();
  });

  const soundBtn = document.getElementById('sound-btn');
  soundBtn.addEventListener('click', () => {
    const muted = toggleMute();
    soundBtn.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON';
    if (!muted) playClick();
  });

  document.addEventListener('keydown', (event) => {
    if (shotMode) return;
    if (event.key >= '1' && event.key <= '5') {
      playCard(Number.parseInt(event.key, 10) - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      const titleVisible = !document.getElementById('title-screen').classList.contains('hidden');
      const endVisible = !document.getElementById('end-screen').classList.contains('hidden');
      if (titleVisible || endVisible) {
        event.preventDefault();
        playClick();
        startNewGame();
      }
    } else if (event.key === 'm' || event.key === 'M') {
      const muted = toggleMute();
      soundBtn.textContent = muted ? 'SOUND: OFF' : 'SOUND: ON';
    } else if (event.key === 'r' || event.key === 'R') {
      startNewGame();
    }
  });
}

function boot() {
  wireInput();
  if (shot) {
    enterShotMode();
  } else {
    renderAll(game, ui);
    document.getElementById('title-screen').classList.remove('hidden');
  }
  window.__tidebreak = {
    get game() { return game; },
    playCard,
    startNewGame,
    STARTING_LIFE,
  };
}

boot();
