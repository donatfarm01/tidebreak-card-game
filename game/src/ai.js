// ai.js — the Stormkeeper's choice each round. One job: pick one card
// from the opponent's hand. The choice is readable and counterable: the
// Stormkeeper loves playing the current element at full strength, saves
// its big cards when it cannot match, and sometimes just gambles.

import { trickTotal } from './cards.js';

// Return the index into `hand` of the card the opponent plays.
export function chooseCard(hand, currentElement, rng) {
  if (hand.length === 0) return -1;
  if (hand.length === 1) return 0;

  const matching = [];
  for (let i = 0; i < hand.length; i++) {
    if (hand[i].element === currentElement) matching.push(i);
  }

  // Three times in four, play the strongest matching card when it has one:
  // the current element doubles, so a match is worth twice its face.
  if (matching.length > 0 && rng() < 0.75) {
    let best = matching[0];
    for (const i of matching) {
      if (trickTotal(hand[i], currentElement) > trickTotal(hand[best], currentElement)) {
        best = i;
      }
    }
    return best;
  }

  // Otherwise save the big cards: play the weakest card in hand, keeping
  // the strong ones for a tide where they double.
  let weakest = 0;
  for (let i = 1; i < hand.length; i++) {
    if (trickTotal(hand[i], currentElement) < trickTotal(hand[weakest], currentElement)) {
      weakest = i;
    }
  }
  return weakest;
}
