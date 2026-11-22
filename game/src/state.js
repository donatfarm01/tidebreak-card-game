// state.js — the rules of Tidebreak as pure state changes. One job: the
// game state (deck, hands, life, current element) and what a turn does to
// it. Nothing here touches the DOM, so the same logic drives the browser
// game and the headless play-test.

import { buildDeck, ELEMENT_ORDER, trickTotal } from './cards.js';
import { chooseCard } from './ai.js';
import { mulberry32, shuffle } from './random.js';

export const STARTING_LIFE = 20;
export const HAND_SIZE = 5;

// A fresh game: shuffled deck, 5 cards each, Wave is the first current.
export function createGame(seed) {
  const rng = mulberry32(seed);
  const deck = shuffle(buildDeck(), rng);
  const game = {
    seed,
    rng,
    round: 1,
    currentElement: 'wave',
    deck,
    discards: [],
    player: { name: 'You', title: 'Harbor Keeper', life: STARTING_LIFE, hand: [] },
    ai: { name: 'Stormkeeper', title: 'Rival Keeper', life: STARTING_LIFE, hand: [] },
    phase: 'play',
    lastTrick: null,
    winner: null,
    tricksWon: { player: 0, ai: 0, tied: 0 },
    log: ['The strait is calm. Wave is the current element — Wave cards count double.'],
  };
  drawUp(game, game.player);
  drawUp(game, game.ai);
  return game;
}

// Draw a player up to a full hand, reshuffling the discards when the
// deck runs dry (a long game never stalls on an empty deck).
export function drawUp(game, who) {
  while (who.hand.length < HAND_SIZE) {
    if (game.deck.length === 0) {
      if (game.discards.length === 0) return;
      game.deck = shuffle(game.discards, game.rng);
      game.discards = [];
      game.log.push('The tide turns the discards back into the deck.');
    }
    who.hand.push(game.deck.pop());
  }
}

// Resolve one round: the player plays hand[playerIndex], the Stormkeeper
// answers, totals are compared and the loser takes the difference as
// damage. Ties deal nothing. Anchor blocks damage taken that round.
export function playTurn(game, playerIndex) {
  if (game.phase !== 'play') return null;
  if (playerIndex < 0 || playerIndex >= game.player.hand.length) return null;

  const playerCard = game.player.hand.splice(playerIndex, 1)[0];
  const aiIndex = chooseCard(game.ai.hand, game.currentElement, game.rng);
  const aiCard = game.ai.hand.splice(aiIndex, 1)[0];

  const playerTotal = trickTotal(playerCard, game.currentElement);
  const aiTotal = trickTotal(aiCard, game.currentElement);

  let winner = 'tie';
  let damage = 0;
  let blocked = false;
  if (playerTotal > aiTotal) {
    winner = 'player';
    damage = playerTotal - aiTotal;
    if (aiCard.kind === 'anchor') {
      blocked = true;
      damage = 0;
    }
    game.ai.life = Math.max(0, game.ai.life - damage);
    game.tricksWon.player++;
  } else if (aiTotal > playerTotal) {
    winner = 'ai';
    damage = aiTotal - playerTotal;
    if (playerCard.kind === 'anchor') {
      blocked = true;
      damage = 0;
    }
    game.player.life = Math.max(0, game.player.life - damage);
    game.tricksWon.ai++;
  } else {
    game.tricksWon.tied++;
  }

  const trick = {
    round: game.round,
    playerCard,
    aiCard,
    playerTotal,
    aiTotal,
    winner,
    damage,
    blocked,
    currentElement: game.currentElement,
  };
  game.lastTrick = trick;
  game.discards.push(playerCard, aiCard);
  game.log.push(describeTrick(trick, game));

  if (game.player.life <= 0 || game.ai.life <= 0) {
    game.phase = 'over';
    game.winner = game.player.life <= 0 && game.ai.life <= 0
      ? (game.player.life === game.ai.life ? 'tie' : (game.player.life > game.ai.life ? 'player' : 'ai'))
      : (game.ai.life <= 0 ? 'player' : 'ai');
    game.log.push(game.winner === 'player'
      ? 'The Stormkeeper’s lamp gutters out. The light holds — you win!'
      : 'Your lamp gutters out. The storm prevails — you lose.');
    return trick;
  }

  drawUp(game, game.player);
  drawUp(game, game.ai);
  game.round++;
  game.currentElement = ELEMENT_ORDER[(game.round - 1) % ELEMENT_ORDER.length];
  return trick;
}

// One readable sentence about a resolved trick, for the table log.
export function describeTrick(trick, game) {
  const you = `${trick.playerTotal} (${trick.playerCard.element} ${trick.playerCard.value}${trick.playerCard.kind === 'surge' ? ' +3 surge' : ''})`;
  const foe = `${trick.aiTotal} (${trick.aiCard.element} ${trick.aiCard.value}${trick.aiCard.kind === 'surge' ? ' +3 surge' : ''})`;
  if (trick.winner === 'player') {
    return trick.blocked
      ? `Round ${trick.round}: you ${you} beat ${foe}, but the Stormkeeper’s Anchor holds — no damage.`
      : `Round ${trick.round}: you ${you} beat ${foe} — Stormkeeper takes ${trick.damage} damage.`;
  }
  if (trick.winner === 'ai') {
    return trick.blocked
      ? `Round ${trick.round}: Stormkeeper ${foe} beat you ${you}, but your Anchor holds — no damage.`
      : `Round ${trick.round}: Stormkeeper ${foe} beat you ${you} — you take ${trick.damage} damage.`;
  }
  return `Round ${trick.round}: tied at ${trick.playerTotal} — the tide takes nothing.`;
}

// The element that follows the current one, shown as "Next:" on the table.
export function nextElement(game) {
  return ELEMENT_ORDER[(ELEMENT_ORDER.indexOf(game.currentElement) + 1) % ELEMENT_ORDER.length];
}
