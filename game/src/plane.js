'use strict';
/* Copper Coast Air Rally — plane.js
   The aircraft: a little prop tourer, the "Kestrel", flown in chase
   view. Physics first (throttle, pitch, bank, lift, stall, wind), then
   the drawing — fuselage, wings, tail and a spinning prop, banking
   with the stick and bobbing gently with the air. */

class Plane {
  constructor(mission) {
    this.reset(mission);
  }

  reset(mission) {
    this.x = 0;                 // metres across the corridor (east +)
    this.z = 0;                 // metres along the course
    this.alt = mission.startAlt; // feet above sea level
    this.heading = 0;           // radians, 0 = due north up the coast
    this.bank = 0;              // radians, + = right wing down
    this.pitch = 0;             // radians, + = nose up
    this.speed = 120;           // knots
    this.throttle = 0.62;
    this.fuel = mission.fuel;
    this.verticalSpeed = 0;     // ft/s, for the HUD variometer
    this.propAngle = 0;
    this.stalled = false;
    this.onGround = false;
  }

  get groundAlt() { return 0; } // filled in by the game with terrain.heightAt

  update(dt, input, terrain, wind, time) {
    /* Stick: bank follows roll, pitch follows pitch, both smoothed. */
    const roll = input.rollCommand();
    const pitchIn = input.pitchCommand();
    const targetBank = roll * FLIGHT.maxBank;
    this.bank += (targetBank - this.bank) * Math.min(1, FLIGHT.bankResponse * dt);
    const targetPitch = pitchIn * FLIGHT.maxPitch;
    this.pitch += (targetPitch - this.pitch) * Math.min(1, FLIGHT.pitchResponse * dt);

    /* Throttle: Shift up, Ctrl down, wheel fine-tunes. */
    this.throttle = Math.max(0, Math.min(1, this.throttle + input.throttleCommand(dt) * FLIGHT.throttleResponse * dt));

    /* Speed chases the throttle setting, faster when diving. */
    const targetSpeed = FLIGHT.minSpeed + this.throttle * (FLIGHT.maxSpeed - FLIGHT.minSpeed);
    const diveBonus = Math.max(0, -this.pitch) * 260;
    this.speed += ((targetSpeed + diveBonus) - this.speed) * Math.min(1, 0.55 * dt);

    /* Stall: slow and nose-high means the wing quits and the nose drops. */
    this.stalled = this.speed < FLIGHT.stallSpeed && this.pitch > 0.12;
    if (this.stalled) {
      this.pitch -= 0.9 * dt;
      this.speed -= 14 * dt;
    }

    /* Turn: bank turns the heading; heading moves the plane sideways. */
    const turnRate = Math.sin(this.bank) * FLIGHT.turnRate * (this.speed / FLIGHT.cruiseSpeed);
    this.heading += turnRate * dt;
    const forward = this.speed * 0.514444 * dt;   // knots -> m/s
    this.z += Math.cos(this.heading) * forward;
    this.x += Math.sin(this.heading) * forward;
    /* Crosswind pushes the nose sideways, harder in the mountain pass. */
    this.x += Math.sin(time * 0.35) * wind * 26 * dt;
    this.x = Math.max(-900, Math.min(1100, this.x));

    /* Climb and sink: pitch and power decide the vertical speed. */
    const climb = this.pitch * FLIGHT.climbRate * 60 * (this.speed / FLIGHT.cruiseSpeed);
    const powerSink = (0.62 - this.throttle) * FLIGHT.sinkRate;
    this.verticalSpeed = climb - powerSink - (this.stalled ? 55 : 0);
    this.alt += this.verticalSpeed * dt;
    if (this.alt < 0) this.alt = 0;

    /* Fuel: throttle drinks it, idle sips it. */
    const burn = FLIGHT.fuelIdleBurn + this.throttle * (FLIGHT.fuelBurn - FLIGHT.fuelIdleBurn);
    this.fuel = Math.max(0, this.fuel - burn * dt);

    this.propAngle += (2 + this.throttle * 26) * dt;
  }

  /* Chase-view drawing: the Kestrel from behind and slightly above,
     banking with the stick, prop spinning, nav lights lit. */
  draw(ctx, time) {
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H - 200;
    const bob = Math.sin(time * 1.7) * 3;
    ctx.save();
    ctx.translate(cx, cy + bob);
    ctx.rotate(this.bank * 0.85);
    ctx.scale(0.92, 0.92 * (1 - Math.abs(this.pitch) * 0.18));

    /* Spinner cone at the nose tip — the prop itself is a blur the
       chase camera barely sees, so it stays a hint, not a line. */
    ctx.fillStyle = '#8e2a20';
    ctx.beginPath();
    ctx.moveTo(0, -102);
    ctx.lineTo(-7, -88);
    ctx.lineTo(7, -88);
    ctx.closePath(); ctx.fill();

    /* Tailplane and fin. */
    ctx.fillStyle = '#c23b2e';
    ctx.beginPath();
    ctx.moveTo(-128, 58); ctx.lineTo(-36, 38); ctx.lineTo(-32, 64); ctx.lineTo(-122, 82);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(128, 58); ctx.lineTo(36, 38); ctx.lineTo(32, 64); ctx.lineTo(122, 82);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8e2a20';
    ctx.beginPath();
    ctx.moveTo(-16, 96); ctx.lineTo(-12, 34); ctx.lineTo(12, 34); ctx.lineTo(16, 96);
    ctx.closePath(); ctx.fill();

    /* Main wings: cream with red tips and a red leading edge, deep
       chord so the Kestrel reads as an aeroplane from behind. */
    ctx.fillStyle = '#f4ead2';
    ctx.beginPath();
    ctx.moveTo(-262, -28); ctx.lineTo(-26, -34); ctx.lineTo(-20, 62); ctx.lineTo(-244, 78);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(262, -28); ctx.lineTo(26, -34); ctx.lineTo(20, 62); ctx.lineTo(244, 78);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c23b2e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-262, -28); ctx.lineTo(-26, -34);
    ctx.moveTo(262, -28); ctx.lineTo(26, -34);
    ctx.stroke();
    ctx.fillStyle = '#c23b2e';
    ctx.beginPath(); ctx.moveTo(-262, -28); ctx.lineTo(-216, -30); ctx.lineTo(-210, 66); ctx.lineTo(-244, 78); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(262, -28); ctx.lineTo(216, -30); ctx.lineTo(210, 66); ctx.lineTo(244, 78); ctx.closePath(); ctx.fill();
    /* Wing shadows: a darker edge under each wing for depth. */
    ctx.strokeStyle = 'rgba(60,50,30,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-244, 78); ctx.lineTo(-20, 62);
    ctx.moveTo(244, 78); ctx.lineTo(20, 62);
    ctx.stroke();

    /* Fuselage: a short, wide tourer body, cockpit hump, belly stripe. */
    const body = ctx.createLinearGradient(-36, 0, 36, 0);
    body.addColorStop(0, '#b9c8d4');
    body.addColorStop(0.35, '#f4f8fa');
    body.addColorStop(0.65, '#ffffff');
    body.addColorStop(1, '#aebfce');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -100);
    ctx.quadraticCurveTo(38, -72, 36, -24);
    ctx.quadraticCurveTo(34, 40, 24, 92);
    ctx.lineTo(-24, 92);
    ctx.quadraticCurveTo(-34, 40, -36, -24);
    ctx.quadraticCurveTo(-38, -72, 0, -100);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7fc4e8';
    ctx.beginPath();
    ctx.ellipse(0, -44, 14, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.ellipse(-4, -50, 5, 9, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c23b2e';
    ctx.fillRect(-35, -4, 70, 7);
    ctx.fillStyle = '#3a3f45';
    ctx.beginPath();
    ctx.ellipse(0, 96, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    /* Nav lights: red left, green right, steady glow. */
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath(); ctx.arc(-262, 22, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#39d98a';
    ctx.beginPath(); ctx.arc(262, 22, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -100, 3, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    /* Ground shadow when low — the landing cue that reads instantly. */
    if (this.alt < 500) {
      const groundY = HORIZON_Y + this.alt * FOCAL / 160;
      const alpha = Math.max(0, 0.35 * (1 - this.alt / 500));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#0a1420';
      ctx.beginPath();
      ctx.ellipse(cx + this.bank * 60, Math.min(CANVAS_H - 40, groundY + 120), 90 * (1 - this.alt / 700), 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
