// cards.js — what a Tidebreak card is: the four elements, the deck, and
// how a played card's trick total is worked out. One job: card data only.

// The four elements. Each has a colour, a shape (SVG symbol id in
// index.html) and a one-line flavour note, so suits are told apart by
// colour AND shape, never by text alone.
export const ELEMENTS = {
  wave: {
    id: 'wave',
    name: 'Wave',
    color: '#2bb3d8',
    dark: '#0e6e8c',
    icon: 'icon-wave',
    note: 'The sea rises.',
  },
  wind: {
    id: 'wind',
    name: 'Wind',
    color: '#a8e063',
    dark: '#5d8a2a',
    icon: 'icon-wind',
    note: 'The gale turns.',
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    color: '#ff7a1a',
    dark: '#b34a00',
    icon: 'icon-ember',
    note: 'The lamp burns.',
  },
  stone: {
    id: 'stone',
    name: 'Stone',
    color: '#d8c49a',
    dark: '#8a7a56',
    icon: 'icon-stone',
    note: 'The cliff holds.',
  },
};

export const ELEMENT_ORDER = ['wave', 'wind', 'ember', 'stone'];

// The two special card kinds. At most two, by design: Storm Surge adds a
// flat bonus to its own trick total, Anchor blocks damage taken that round.
export const SPECIAL_KINDS = {
  base: { label: '', effect: '' },
  surge: { label: 'STORM SURGE', effect: '+3 to your trick total' },
  anchor: { label: 'ANCHOR', effect: 'Block all damage this round' },
};

const DECK_SIZE = 40;

// Build a fresh 40-card deck, unshuffled: values 1-6 of each element (24),
// plus 2 Storm Surge (value 3) and 2 Anchor (value 2) of each element (16).
export function buildDeck() {
  const deck = [];
  let id = 0;
  for (const element of ELEMENT_ORDER) {
    for (let value = 1; value <= 6; value++) {
      deck.push({ id: id++, element, value, kind: 'base' });
    }
    for (let n = 0; n < 2; n++) {
      deck.push({ id: id++, element, value: 3, kind: 'surge' });
      deck.push({ id: id++, element, value: 2, kind: 'anchor' });
    }
  }
  return deck;
}

export function deckSize() {
  return DECK_SIZE;
}

// A played card's trick total: its value, doubled when its element is the
// round's current element, plus +3 for a Storm Surge.
export function trickTotal(card, currentElement) {
  let total = card.value;
  if (card.element === currentElement) total *= 2;
  if (card.kind === 'surge') total += 3;
  return total;
}

// True when playing this card doubles its value this round.
export function isDoubled(card, currentElement) {
  return card.element === currentElement;
}

// One-line description of a card, for the log and the card face.
export function describeCard(card) {
  const element = ELEMENTS[card.element];
  const special = SPECIAL_KINDS[card.kind].label;
  return special ? `${element.name} ${card.value} · ${special}` : `${element.name} ${card.value}`;
}
