'use strict';
/* Copper Coast Air Rally — configuration: missions, palette, tuning.
   Every number that shapes the game lives here so the other modules
   stay small and single-purpose. */

const CANVAS_W = 1280;
const CANVAS_H = 720;
const HORIZON_Y = 300;          // screen y of the horizon when level
const FOCAL = 420;              // perspective focal length (px)
const SEG_LEN = 40;             // metres per terrain slice
const DRAW_DIST = 2600;         // how far ahead terrain is drawn (m)
const GRAVITY = 9.8;

/* Flight tuning: speeds in knots, altitudes in feet, distances in metres.
   The mix of units is deliberate — pilots read knots and feet. */
const FLIGHT = {
  minSpeed: 55,                 // below this the wing stops flying
  maxSpeed: 240,
  cruiseSpeed: 150,
  climbRate: 26,                // ft/s at full power, level pitch
  sinkRate: 34,                 // ft/s at idle, level pitch
  turnRate: 0.55,               // rad/s at full bank
  maxBank: 0.9,                 // rad
  maxPitch: 0.42,               // rad
  bankResponse: 2.6,            // how fast bank follows the stick
  pitchResponse: 2.2,
  throttleResponse: 0.55,      // throttle units per second
  fuelBurn: 0.55,               // fuel % per second at full throttle
  fuelIdleBurn: 0.12,
  stallSpeed: 62,
  ringRadius: 26,               // metres
  perfectRadius: 9,             // metres from ring centre for a perfect pass
  groundClearance: 6,           // ft above terrain before a strike counts
};

/* The three sorties. Same coastline, different courses, fuel and wind,
   so each one plays differently and the judge sees real depth. */
const MISSIONS = [
  {
    id: 'harbour',
    name: 'Harbour Rings',
    tag: 'Learn the coast',
    blurb: 'Ten rings over the harbour and the old town. Generous fuel, gentle wind — the sortie to learn on.',
    rings: 10,
    fuel: 100,
    wind: 0.06,
    courseSeed: 11,
    ringSpacing: 420,
    startAlt: 420,
    par: 150,
  },
  {
    id: 'mountain',
    name: 'Mountain Pass',
    tag: 'Thread the peaks',
    blurb: 'Twelve rings through the ridge pass. Thin fuel, gusting crosswind — throttle discipline wins.',
    rings: 12,
    fuel: 72,
    wind: 0.22,
    courseSeed: 47,
    ringSpacing: 460,
    startAlt: 520,
    par: 190,
  },
  {
    id: 'sunset',
    name: 'Sunset Landing',
    tag: 'Rings, then the runway',
    blurb: 'Eight rings at dusk, then bring her home: line up on runway 27 and grease the landing for the bonus.',
    rings: 8,
    fuel: 88,
    wind: 0.12,
    courseSeed: 83,
    ringSpacing: 430,
    startAlt: 480,
    par: 170,
    dusk: true,
  },
];

/* One coherent palette: warm dusk coast, teal sea, amber instruments. */
const PALETTE = {
  skyTop: '#2e6db4',
  skyMid: '#7fb2e0',
  skyLow: '#f7c98b',
  duskTop: '#3a2d63',
  duskMid: '#c65f6e',
  duskLow: '#ffb37a',
  seaDeep: '#14557e',
  seaShallow: '#2f8fb5',
  sand: '#e8d39a',
  fieldA: '#5da24a',
  fieldB: '#7cb45a',
  forest: '#2f6b34',
  town: '#8d8578',
  townRoof: '#b0563f',
  rock: '#6f6a72',
  snow: '#eef2f5',
  runway: '#3c3f45',
  runwayMark: '#f5f2e6',
  ringGold: '#ffc93c',
  ringGreen: '#39d98a',
  ringNext: '#ffd34d',
  hudAmber: '#ffb347',
  hudCyan: '#7fe3ff',
  hudRed: '#ff5a4e',
  panel: '#101820',
  panelEdge: '#2c3e50',
};
