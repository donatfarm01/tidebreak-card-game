// render.js — everything the player sees, built from game state. One job:
// turn a game object into DOM: the table, the cards, the tide meter, the
// log and the end screen. It never changes the rules, only shows them.

import { ELEMENTS, ELEMENT_ORDER, SPECIAL_KINDS, describeCard, isDoubled } from './cards.js';
import { nextElement, STARTING_LIFE } from './state.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function iconSvg(symbolId, className) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', className);
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `#${symbolId}`);
  svg.appendChild(use);
  return svg;
}

// One card face: big value, element icon + name, special label when it
// has one. Colours and shapes carry the element, never text alone.
export function buildCard(card, options) {
  const opts = options || {};
  const element = ELEMENTS[card.element];
  const node = el('div', 'card' + (opts.small ? ' card-small' : '') + (opts.mini ? ' card-mini' : '') + (opts.faceDown ? ' card-back' : ''));
  node.style.setProperty('--el', element.color);
  node.style.setProperty('--el-dark', element.dark);

  if (opts.faceDown) {
    node.appendChild(iconSvg('icon-lighthouse', 'card-back-icon'));
    node.appendChild(el('div', 'card-back-word', 'TIDEBREAK'));
    return node;
  }

  const special = SPECIAL_KINDS[card.kind];
  if (special.label) node.appendChild(el('div', 'card-special', special.label));

  const top = el('div', 'card-top');
  top.appendChild(iconSvg(element.icon, 'card-icon'));
  top.appendChild(el('span', 'card-element', element.name.toUpperCase()));
  node.appendChild(top);

  node.appendChild(el('div', 'card-value', String(card.value)));
  node.appendChild(el('div', 'card-effect', special.effect || element.note));

  if (opts.playable) {
    node.classList.add('card-playable');
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', `Play ${describeCard(card)}`);
  }
  if (opts.selected) node.classList.add('card-selected');
  if (opts.doubled) node.classList.add('card-doubled');
  return node;
}

// A life bar: a filled bar plus a big "16 / 20" number, readable at a glance.
export function renderLife(container, life, max) {
  container.innerHTML = '';
  const bar = el('div', 'life-bar');
  const fill = el('div', 'life-fill');
  fill.style.width = `${Math.max(0, (life / max) * 100)}%`;
  if (life <= 6) fill.classList.add('life-low');
  bar.appendChild(fill);
  const text = el('span', 'life-text', `${life} / ${max}`);
  container.appendChild(bar);
  container.appendChild(text);
}

// The tide meter: the four elements in rotation order, the current one
// lit in its own colour, the next one named. The table's focal point.
export function renderTide(container, game) {
  container.innerHTML = '';
  const label = el('div', 'tide-label', 'TIDE');
  container.appendChild(label);
  for (const id of ELEMENT_ORDER) {
    const element = ELEMENTS[id];
    const cell = el('div', 'tide-cell' + (id === game.currentElement ? ' tide-current' : ''));
    cell.style.setProperty('--el', element.color);
    cell.appendChild(iconSvg(element.icon, 'tide-icon'));
    cell.appendChild(el('span', 'tide-name', element.name.toUpperCase()));
    if (id === game.currentElement) {
      cell.appendChild(el('span', 'tide-times', '×2'));
    }
    container.appendChild(cell);
  }
  const next = ELEMENTS[nextElement(game)];
  const nextNote = el('div', 'tide-next', `Next: ${next.name}`);
  container.appendChild(nextNote);
}

// The two cards just played, with their trick totals, or empty slots.
export function renderPlayed(zone, game) {
  const playerSlot = zone.querySelector('#player-played');
  const aiSlot = zone.querySelector('#ai-played');
  playerSlot.innerHTML = '';
  aiSlot.innerHTML = '';
  const trick = game.lastTrick;
  if (!trick) {
    playerSlot.appendChild(el('div', 'played-empty', 'Your card'));
    aiSlot.appendChild(el('div', 'played-empty', 'Stormkeeper’s card'));
    return;
  }
  const playerCard = buildCard(trick.playerCard, { small: true });
  const aiCard = buildCard(trick.aiCard, { small: true });
  // Name the tide the trick was played on, so a total that doubled reads
  // true even after the meter has already turned to the next element.
  const tideName = ELEMENTS[trick.currentElement].name;
  const playerTotal = el('div', 'played-total', `Total ${trick.playerTotal}${isDoubled(trick.playerCard, trick.currentElement) ? ` (${tideName} ×2)` : ''}`);
  const aiTotal = el('div', 'played-total', `Total ${trick.aiTotal}${isDoubled(trick.aiCard, trick.currentElement) ? ` (${tideName} ×2)` : ''}`);
  if (trick.winner === 'player') playerCard.classList.add('trick-winner');
  if (trick.winner === 'ai') aiCard.classList.add('trick-winner');
  playerSlot.appendChild(playerCard);
  playerSlot.appendChild(playerTotal);
  aiSlot.appendChild(aiCard);
  aiSlot.appendChild(aiTotal);
}

// The banner under the played cards: what the last trick did.
export function renderBanner(banner, game) {
  const trick = game.lastTrick;
  if (!trick) {
    banner.textContent = 'Play a card to open the duel. Matching the tide doubles your card.';
    banner.className = 'banner';
    return;
  }
  if (trick.winner === 'player') {
    banner.textContent = trick.blocked
      ? 'You win the trick — but the Anchor holds. No damage.'
      : `You win the trick! Stormkeeper takes ${trick.damage} damage.`;
    banner.className = 'banner banner-win';
  } else if (trick.winner === 'ai') {
    banner.textContent = trick.blocked
      ? 'Stormkeeper wins the trick — but your Anchor holds. No damage.'
      : `Stormkeeper wins the trick. You take ${trick.damage} damage.`;
    banner.className = 'banner banner-lose';
  } else {
    banner.textContent = `Tied at ${trick.playerTotal} — the tide takes nothing.`;
    banner.className = 'banner banner-tie';
  }
}

// The last two log lines, newest last (the bar fits two lines cleanly).
export function renderLog(logEl, game) {
  logEl.innerHTML = '';
  const lines = game.log.slice(-2);
  for (const line of lines) {
    logEl.appendChild(el('div', 'log-line', line));
  }
}

// The end screen: win or loss, final life, and the duel's stats.
export function renderEnd(overlay, game) {
  const won = game.winner === 'player';
  overlay.innerHTML = '';
  const box = el('div', 'end-box' + (won ? ' end-win' : 'end-lose'));
  box.appendChild(el('div', 'end-kicker', won ? 'THE LIGHT HOLDS' : 'THE STORM PREVAILS'));
  box.appendChild(el('h1', 'end-title', won ? 'You win!' : 'You lose'));
  box.appendChild(el('p', 'end-sub', won
    ? 'The Stormkeeper’s lamp gutters out. The strait is yours, Harbor Keeper.'
    : 'Your lamp gutters out. The Stormkeeper keeps the strait — this time.'));
  const score = el('div', 'end-score');
  score.appendChild(el('div', 'end-score-cell', `You: ${game.player.life} life`));
  score.appendChild(el('div', 'end-score-cell', `Stormkeeper: ${game.ai.life} life`));
  box.appendChild(score);
  box.appendChild(el('div', 'end-stats',
    `${game.round} rounds · ${game.tricksWon.player} tricks won · ${game.tricksWon.ai} lost · ${game.tricksWon.tied} tied`));
  const again = el('button', 'big-button', 'Play again');
  again.id = 'play-again-btn';
  again.type = 'button';
  box.appendChild(again);
  overlay.appendChild(box);
}

// Re-render the whole table from the current game state.
export function renderAll(game, ui) {
  document.getElementById('round-badge').textContent = `ROUND ${game.round}`;
  renderLife(document.getElementById('player-life'), game.player.life, STARTING_LIFE);
  renderLife(document.getElementById('ai-life'), game.ai.life, STARTING_LIFE);

  const aiHand = document.getElementById('ai-hand');
  aiHand.innerHTML = '';
  for (const card of game.ai.hand) {
    aiHand.appendChild(buildCard(card, { faceDown: true, mini: true }));
  }

  const playerHand = document.getElementById('player-hand');
  playerHand.innerHTML = '';
  game.player.hand.forEach((card, i) => {
    const node = buildCard(card, {
      playable: game.phase === 'play',
      selected: ui.selected === i,
      doubled: isDoubled(card, game.currentElement),
    });
    node.dataset.index = String(i);
    playerHand.appendChild(node);
  });

  renderTide(document.getElementById('tide-meter'), game);
  renderPlayed(document.getElementById('played-zone'), game);
  renderBanner(document.getElementById('banner'), game);
  renderLog(document.getElementById('log'), game);

  const hint = document.getElementById('hint');
  hint.textContent = game.phase === 'play'
    ? 'Click a card — or press 1–5 — to play it. Matching the tide doubles your card.'
    : 'The duel is over.';

  const endOverlay = document.getElementById('end-screen');
  if (game.phase === 'over') {
    renderEnd(endOverlay, game);
    endOverlay.classList.remove('hidden');
  } else {
    endOverlay.classList.add('hidden');
  }
}
