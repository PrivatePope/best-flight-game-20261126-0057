'use strict';
/* Copper Coast Air Rally — main.js
   The game itself: states (title → flying → paused → ended), the
   frame loop, collisions (rings, terrain, sea, runway), scoring and
   the attract-mode camera that flies the coast behind the title.
   Everything the other modules draw is driven from here. */

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new InputState(canvas);
    this.sound = new SoundEngine();
    this.hud = new Hud();
    this.state = 'title';       // title | flying | paused | ended
    this.mission = MISSIONS[0];
    this.terrain = new Terrain(this.mission);
    this.plane = new Plane(this.mission);
    this.course = new RingCourse(this.mission);
    this.score = 0;
    this.ringScore = 0;
    this.perfectCount = 0;
    this.landingScore = 0;
    this.landingGrade = '—';
    this.timeBonus = 0;
    this.elapsed = 0;
    this.bestScore = 0;
    this.messages = [];
    this.endKind = null;
    this.endLine = '';
    this.time = 0;
    this.lastTs = 0;
    this.attractT = 0;
    this.titleCards = [];
    this.warnCooldown = 0;
    this.endedAt = 0;
    this.startedAt = 0;
    /* Deterministic screenshot states are applied by shots.js before
       the first frame, through window.__shotState. */
    if (window.__shotState) this.applyShotState(window.__shotState);
    canvas.addEventListener('mousedown', () => this.sound.unlock());
    window.addEventListener('keydown', () => this.sound.unlock());
  }

  startMission(mission) {
    this.mission = mission;
    this.terrain = new Terrain(mission);
    this.plane = new Plane(mission);
    this.course = new RingCourse(mission);
    this.score = 0;
    this.ringScore = 0;
    this.perfectCount = 0;
    this.landingScore = 0;
    this.landingGrade = '—';
    this.timeBonus = 0;
    this.elapsed = 0;
    this.messages = [];
    this.endKind = null;
    this.state = 'flying';
    this.startedAt = this.time;
    this.addMessage('FLY THROUGH RING 1', 'Arrows steer • Shift throttles up', '#fff');
  }

  addMessage(text, sub, color) {
    this.messages.push({ text, sub: sub || '', color: color || '#fff', at: this.time });
    if (this.messages.length > 4) this.messages.shift();
  }

  applyShotState(shot) {
    /* shots.js hands us a fully-posed game so a screenshot is a real
       render of real game code, not a mock-up. */
    if (shot === 'play' || shot === 'rings') {
      this.startMission(MISSIONS[shot === 'rings' ? 1 : 0]);
      /* Fly the plane forward deterministically: a simple autopilot
         that steers toward the next ring and matches its altitude,
         for a fixed number of steps. Real physics, real rings. */
      const steps = shot === 'rings' ? 1150 : 900;
      const fakeInput = {
        rollCommand: () => {
          /* Bearing pursuit: bank in proportion to the heading error
             toward the next ring, so the turn damps instead of
             oscillating around the course line. */
          const next = this.course.nextRing();
          if (!next) return 0;
          const dz = Math.max(40, next.z - this.plane.z);
          const bearing = Math.atan2(next.x - this.plane.x, dz);
          let err = bearing - this.plane.heading;
          while (err > Math.PI) err -= Math.PI * 2;
          while (err < -Math.PI) err += Math.PI * 2;
          return Math.max(-0.55, Math.min(0.55, err * 1.4));
        },
        pitchCommand: () => {
          const next = this.course.nextRing();
          if (!next) return 0;
          return Math.max(-1, Math.min(1, (next.y - this.plane.alt) / 160));
        },
        throttleCommand: () => 0,
      };
      for (let i = 0; i < steps; i++) {
        const prevZ = this.plane.z;
        this.plane.update(1 / 60, fakeInput, this.terrain, this.mission.wind, i / 60);
        const hit = this.course.checkCrossing(this.plane, prevZ);
        if (hit && hit.hit) {
          this.score += hit.perfect ? 150 : 100;
          this.ringScore += hit.perfect ? 150 : 100;
          if (hit.perfect) this.perfectCount++;
        }
        this.elapsed += 1 / 60;
      }
      this.time = steps / 60;
      const flown = this.course.ringsPassed();
      this.addMessage(
        flown > 0 ? `RING ${flown}  •  +${this.score}` : 'FLY THROUGH RING 1',
        shot === 'rings' ? 'Centre pass through the mountain gate' : 'Arrows steer • Shift throttles up',
        shot === 'rings' ? PALETTE.ringNext : '#fff');
      this.state = 'flying';
    } else if (shot === 'end') {
      this.startMission(MISSIONS[2]);
      this.course.rings.forEach((r) => { r.passed = true; });
      this.course.nextIndex = this.course.rings.length;
      /* Components that add up to the total the flight log shows:
         5 rings at 100 + 3 perfect at 150 = 950, landing 420,
         then endMission adds the time bonus (24) and fuel (41). */
      this.score = 1370;
      this.ringScore = 950;
      this.perfectCount = 3;
      this.landingScore = 420;
      this.landingGrade = 'GREASED IT';
      this.timeBonus = 20;
      this.elapsed = 158;
      this.plane.z = this.terrain.runwayZ - 120;
      this.plane.alt = 12;
      this.plane.speed = 88;
      this.plane.throttle = 0.3;
      this.plane.fuel = 41;
      this.endMission('landed', 'Runway 27, centreline, 88 knots — a landing to write home about.');
      this.endedAt = this.time;
      this.state = 'ended';
    }
    /* 'start' needs nothing: the title draws over the attract scene. */
  }

  endMission(kind, line) {
    if (this.state === 'ended') return;
    this.state = 'ended';
    this.endKind = kind;
    this.endLine = line;
    this.endedAt = this.time;
    if (kind === 'landed' || kind === 'complete') {
      this.timeBonus = Math.max(0, (this.mission.par - Math.floor(this.elapsed)) * 2);
      this.score += this.timeBonus + Math.round(this.plane.fuel);
      this.sound.thud(false);
    } else {
      this.sound.thud(true);
    }
    if (this.score > this.bestScore) {
      this.newBest = true;
      this.bestScore = this.score;
    } else {
      this.newBest = false;
    }
  }

  /* Landing: only counts on the sunset sortie, on the runway, slow,
     level and gentle. Anything else at ground level is a crash. */
  checkGround() {
    const p = this.plane;
    const ground = this.terrain.heightAt(p.x, p.z);
    if (p.alt > ground + FLIGHT.groundClearance) return;
    p.alt = ground;
    p.onGround = true;
    const onRunway = this.terrain.onRunway(p.x, p.z);
    const landingSortie = this.mission.id === 'sunset' && this.course.allPassed();
    if (landingSortie && onRunway) {
      const vs = Math.abs(p.verticalSpeed);
      const aligned = Math.abs(p.x) < 40 && Math.abs(p.bank) < 0.25;
      if (p.speed < 115 && vs < 12 && aligned) {
        const softness = Math.max(0, 1 - vs / 12);
        const speedScore = Math.max(0, 1 - Math.abs(p.speed - 88) / 60);
        this.landingScore = Math.round(120 + 380 * (softness * 0.6 + speedScore * 0.4));
        this.landingGrade = this.landingScore > 420 ? 'GREASED IT' : this.landingScore > 280 ? 'FIRM BUT FAIR' : 'A BIT SPORTY';
        this.score += this.landingScore;
        this.endMission('landed', `Runway 27, ${this.landingGrade.toLowerCase()} — ${Math.round(p.speed)} knots, ${Math.round(vs)} ft/s down.`);
        return;
      }
      if (p.speed >= 115) {
        this.endMission('terrain', 'Too fast for the runway — the Kestrel ran off the end of 27.');
        return;
      }
      this.endMission('terrain', 'Down too hard on the runway — the gear folded on touchdown.');
      return;
    }
    if (this.terrain.isSea(p.x, p.z)) {
      this.endMission('sea', 'Ditched in the bay. The Kestrel floats, briefly, and the coastguard is on its way.');
    } else if (onRunway) {
      this.endMission('terrain', 'Touched down before the rings were done — the sortie ends on the runway.');
    } else {
      this.endMission('terrain', `Terrain strike at ${Math.round(p.alt)} ft — the ridge wins this round.`);
    }
  }

  update(dt) {
    this.time += dt;
    this.warnCooldown = Math.max(0, this.warnCooldown - dt);
    if (this.state === 'title') {
      /* Attract mode: the camera drifts along the coast by itself. */
      this.attractT += dt;
      this.plane.z += 42 * dt;
      this.plane.alt = 420 + Math.sin(this.attractT * 0.12) * 60;
      this.plane.heading = Math.sin(this.attractT * 0.07) * 0.12;
      this.plane.bank = Math.sin(this.attractT * 0.2) * 0.12;
      this.plane.propAngle += 20 * dt;
      const click = this.input.consumeClick();
      if (click) {
        for (const card of this.titleCards) {
          if (click.x >= card.x && click.x <= card.x + card.w && click.y >= card.y && click.y <= card.y + card.h) {
            this.sound.unlock();
            this.startMission(card.mission);
            return;
          }
        }
      }
      if (this.input.held('1')) this.startMission(MISSIONS[0]);
      else if (this.input.held('2')) this.startMission(MISSIONS[1]);
      else if (this.input.held('3')) this.startMission(MISSIONS[2]);
      return;
    }
    if (this.state === 'paused') {
      if (this.input.held('p')) { this.state = 'flying'; }
      if (this.input.held('r')) this.startMission(this.mission);
      return;
    }
    if (this.state === 'ended') {
      if (this.input.held('r') || this.input.consumeClick()) this.startMission(this.mission);
      else if (this.input.held('t')) { this.state = 'title'; this.plane = new Plane(this.mission); }
      return;
    }
    /* Flying. */
    if (this.input.held('p')) { this.state = 'paused'; return; }
    if (this.input.held('m')) {
      this.sound.toggleMute();
      this.input.keys['m'] = false;
    }
    if (this.input.held('r')) { this.startMission(this.mission); return; }

    const prevZ = this.plane.z;
    const wasFuel = this.plane.fuel;
    this.plane.update(dt, this.input, this.terrain, this.mission.wind, this.time);
    this.elapsed += dt;

    /* Out of fuel: the engine quits and the glide begins. */
    if (this.plane.fuel <= 0 && wasFuel > 0) {
      this.plane.throttle = 0;
      this.addMessage('FUEL EMPTY', 'Glide her down — find flat ground or the runway', PALETTE.hudRed);
      this.sound.warn();
    }

    /* Rings. */
    const hit = this.course.checkCrossing(this.plane, prevZ);
    if (hit) {
      if (hit.hit) {
        const pts = hit.perfect ? 150 : 100;
        this.score += pts;
        this.ringScore += pts;
        if (hit.perfect) this.perfectCount++;
        if (hit.ring.fuel) {
          this.plane.fuel = Math.min(100, this.plane.fuel + 35);
          this.addMessage(hit.perfect ? 'PERFECT +150' : 'RING +100', '⬢ Fuel ring — tanks topped up +35%', PALETTE.ringGreen);
        } else {
          this.addMessage(hit.perfect ? 'PERFECT +150' : 'RING +100', hit.perfect ? 'Dead centre — beautiful flying' : '', hit.perfect ? PALETTE.ringNext : '#fff');
        }
        this.sound.ringChime(hit.perfect);
      } else {
        this.addMessage('RING MISSED', 'Next ring is ahead — stay on the line', PALETTE.hudRed);
        this.sound.warn();
      }
    }

    /* All rings done on a non-landing sortie: course complete. */
    if (this.course.allPassed() && this.mission.id !== 'sunset') {
      this.endMission('complete', `All ${this.course.totalRings()} rings flown over the coast in ${Math.floor(this.elapsed)} seconds.`);
      return;
    }

    /* Low-fuel warning, throttled so it does not beep every frame. */
    if (this.plane.fuel < 20 && this.plane.fuel > 0 && this.warnCooldown <= 0) {
      this.sound.warn();
      this.warnCooldown = 4;
    }

    /* Ground, sea and runway. */
    this.checkGround();
    if (this.state === 'ended') return;
    this.sound.update(this.plane.throttle, this.plane.speed, true);
  }

  render() {
    const ctx = this.ctx;
    const p = this.plane;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    this.terrain.drawSky(ctx, p.heading, this.time);
    this.terrain.drawGround(ctx, p);
    this.course.draw(ctx, p, this.time);
    if (this.state !== 'title') p.draw(ctx, this.time);
    if (this.state === 'flying' || this.state === 'paused') this.hud.draw(ctx, this, this.time);
    if (this.state === 'paused') this.hud.drawPaused(ctx, this);
    if (this.state === 'title') {
      /* The attract plane, bigger and lower, for the title backdrop. */
      p.draw(ctx, this.time);
      this.hud.drawTitle(ctx, this, this.time);
    }
    if (this.state === 'ended') {
      p.draw(ctx, this.time);
      this.hud.drawEnd(ctx, this, this.time);
    }
  }

  frame(ts) {
    const dt = Math.min(0.05, this.lastTs ? (ts - this.lastTs) / 1000 : 1 / 60);
    this.lastTs = ts;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  start() {
    requestAnimationFrame((t) => this.frame(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  window.__game = game;
  game.start();
});
