'use strict';
/* Copper Coast Air Rally — shots.js
   Deterministic screenshot states. The game reads ?shot= from the URL
   before its first frame and poses itself: title, mid-flight, the
   mountain pass, or the landing screen. Each state is a real run of
   the game's own code (the flight states advance the real physics
   for a fixed number of steps), so every screenshot is a genuine
   render, reproducible by opening the same URL. */

(function () {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot === 'start' || shot === 'play' || shot === 'rings' || shot === 'end') {
    window.__shotState = shot;
  } else {
    window.__shotState = null;
  }
})();
