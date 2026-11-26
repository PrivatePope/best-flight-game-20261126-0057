'use strict';
/* Copper Coast Air Rally — hud.js
   Everything the pilot reads: the lit instrument panel (artificial
   horizon, airspeed and altitude tapes, compass, throttle, fuel),
   the top bar (score, rings, timer), centre messages, and the title
   and end screens. Instruments are drawn, not images, so they stay
   sharp and lit at any size. */

function drawPanel(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = 'rgba(13,22,30,0.88)';
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawArtificialHorizon(ctx, x, y, r, bank, pitch, time) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  ctx.rotate(-bank);
  const pitchPx = Math.max(-r, Math.min(r, pitch * r * 1.4));
  /* Sky above the horizon line, ground below it. */
  ctx.fillStyle = '#4a90d9';
  ctx.fillRect(-r, -r + pitchPx, r * 2, r - pitchPx);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-r, pitchPx, r * 2, r - pitchPx + r);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, pitchPx);
  ctx.lineTo(r, pitchPx);
  ctx.stroke();
  /* Pitch ladder ticks. */
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  for (const off of [-24, -12, 12, 24]) {
    ctx.beginPath();
    ctx.moveTo(-14, pitchPx + off);
    ctx.lineTo(14, pitchPx + off);
    ctx.stroke();
  }
  ctx.restore();
  /* Fixed wings marker and bezel. */
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = PALETTE.hudAmber;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.55, 0); ctx.lineTo(-r * 0.18, 0);
  ctx.moveTo(r * 0.18, 0); ctx.lineTo(r * 0.55, 0);
  ctx.stroke();
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#546a7a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  /* Bank pointer at the top. */
  const bx = x + Math.sin(bank) * r;
  const by = y - Math.cos(bank) * r;
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.beginPath();
  ctx.moveTo(bx, by - 4); ctx.lineTo(bx - 5, by + 4); ctx.lineTo(bx + 5, by + 4);
  ctx.closePath(); ctx.fill();
  void time;
}

function drawTape(ctx, x, y, w, h, value, step, format, color) {
  drawPanel(ctx, x, y, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.clip();
  ctx.fillStyle = 'rgba(127,227,255,0.08)';
  ctx.fillRect(x, y, w, h);
  const centre = y + h / 2;
  const pxPerUnit = h / (step * 6);
  const base = Math.floor(value / step) * step;
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = -3; i <= 3; i++) {
    const v = base + i * step;
    if (v < 0) continue;
    const ty = centre - (v - value) * pxPerUnit;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 4, ty);
    ctx.lineTo(x + 12, ty);
    ctx.stroke();
    ctx.fillStyle = '#cfe8f5';
    ctx.fillText(format(v), x + 15, ty);
  }
  /* Centre readout box. */
  ctx.fillStyle = color;
  ctx.fillRect(x, centre - 13, w, 26);
  ctx.fillStyle = '#0a1420';
  ctx.font = 'bold 15px monospace';
  ctx.fillText(format(Math.round(value)), x + 8, centre + 1);
  ctx.restore();
}

function drawCompass(ctx, x, y, w, headingDeg) {
  drawPanel(ctx, x, y, w, 34);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, 34, 10);
  ctx.clip();
  const centre = x + w / 2;
  const pxPerDeg = 3.2;
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let d = -60; d <= 60; d += 5) {
    let deg = Math.round((headingDeg + d) / 5) * 5;
    const norm = ((deg % 360) + 360) % 360;
    const sx = centre + (deg - headingDeg) * pxPerDeg;
    if (sx < x + 8 || sx > x + w - 8) continue;
    const major = norm % 30 === 0;
    ctx.strokeStyle = major ? '#fff' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(sx, y + 22);
    ctx.lineTo(sx, y + (major ? 12 : 17));
    ctx.stroke();
    if (major) {
      const label = norm === 0 ? 'N' : norm === 90 ? 'E' : norm === 180 ? 'S' : norm === 270 ? 'W' : String(norm).padStart(3, '0');
      ctx.fillStyle = PALETTE.hudCyan;
      ctx.fillText(label, sx, y + 8);
    }
  }
  ctx.restore();
  /* Centre lubber line and readout. */
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.beginPath();
  ctx.moveTo(centre, y + 2); ctx.lineTo(centre - 5, y + 10); ctx.lineTo(centre + 5, y + 10);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0a1420';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(((headingDeg % 360) + 360) % 360)).padStart(3, '0') + '°', centre, y + 27);
}

function drawThrottleFuel(ctx, x, y, throttle, fuel, lowFuel, time) {
  drawPanel(ctx, x, y, 64, 108);
  ctx.fillStyle = '#cfe8f5';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THR', x + 32, y + 13);
  /* Throttle slot. */
  ctx.fillStyle = '#0a1420';
  ctx.fillRect(x + 12, y + 20, 12, 70);
  ctx.fillStyle = PALETTE.hudAmber;
  ctx.fillRect(x + 12, y + 20 + (1 - throttle) * 70, 12, 6);
  ctx.fillStyle = '#cfe8f5';
  ctx.font = '11px monospace';
  ctx.fillText(Math.round(throttle * 100) + '%', x + 42, y + 28);
  /* Fuel bar. */
  ctx.fillText('FUEL', x + 32, y + 100 - 2);
  ctx.fillStyle = '#0a1420';
  ctx.fillRect(x + 12, y + 78, 40, 8);
  const fuelColor = fuel < 20 ? (Math.sin(time * 8) > 0 ? PALETTE.hudRed : PALETTE.hudAmber) : PALETTE.ringGreen;
  ctx.fillStyle = fuelColor;
  ctx.fillRect(x + 12, y + 78, 40 * Math.max(0, fuel / 100), 8);
  if (lowFuel) {
    ctx.fillStyle = PALETTE.hudRed;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('LOW', x + 32, y + 96 - 8 + 8);
  }
}

class Hud {
  draw(ctx, game, time) {
    const p = game.plane;
    const mission = game.mission;
    /* Top bar: score, rings, timer, mission. */
    ctx.fillStyle = 'rgba(10,20,32,0.72)';
    ctx.fillRect(0, 0, CANVAS_W, 44);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`SCORE  ${game.score.toLocaleString()}`, 18, 23);
    ctx.fillStyle = PALETTE.ringNext;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`◉ RINGS  ${game.course.ringsPassed()}/${game.course.totalRings()}`, 250, 23);
    ctx.fillStyle = '#cfe8f5';
    ctx.font = '16px monospace';
    const t = Math.floor(game.elapsed);
    ctx.fillText(`⏱ ${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`, 470, 23);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.hudCyan;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`${mission.name.toUpperCase()}  •  ${game.mission.id === 'sunset' ? 'LAND AFTER RING 8' : 'FLY THE RINGS'}`, CANVAS_W - 18, 23);
    ctx.textAlign = 'left';

    /* Compass across the top centre. */
    const headingDeg = ((-p.heading * 180 / Math.PI) % 360 + 360) % 360;
    drawCompass(ctx, CANVAS_W / 2 - 150, 52, 300, headingDeg);

    /* Bottom instrument panel. */
    const panelY = CANVAS_H - 118;
    ctx.fillStyle = 'rgba(10,18,26,0.82)';
    ctx.fillRect(0, panelY, CANVAS_W, 118);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(0, panelY, CANVAS_W, 1);

    drawArtificialHorizon(ctx, 92, panelY + 59, 46, p.bank, p.pitch, time);
    ctx.fillStyle = '#cfe8f5';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ATTITUDE', 92, panelY + 112);

    drawTape(ctx, 170, panelY + 10, 96, 98, p.speed, 20, (v) => String(Math.round(v)), PALETTE.hudCyan);
    ctx.fillStyle = '#cfe8f5';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AIRSPEED KT', 218, panelY + 112);

    drawTape(ctx, 290, panelY + 10, 104, 98, p.alt, 100, (v) => String(Math.round(v)), PALETTE.hudAmber);
    ctx.fillText('ALTITUDE FT', 342, panelY + 112);

    /* Vertical speed + gear/flaps state in the middle. */
    drawPanel(ctx, 418, panelY + 10, 150, 98);
    ctx.fillStyle = '#cfe8f5';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('VERT SPEED', 430, panelY + 30);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = p.verticalSpeed >= 0 ? PALETTE.ringGreen : PALETTE.hudAmber;
    ctx.fillText(`${p.verticalSpeed >= 0 ? '+' : ''}${Math.round(p.verticalSpeed)} ft/s`, 430, panelY + 56);
    ctx.font = '11px monospace';
    ctx.fillStyle = '#cfe8f5';
    ctx.fillText(`HDG ${String(Math.round(headingDeg)).padStart(3, '0')}°`, 430, panelY + 80);
    ctx.fillText(p.stalled ? '⚠ STALL — NOSE DOWN' : (p.speed < 90 ? 'SLOW — ADD POWER' : 'FLAPS UP  •  GEAR UP'), 430, panelY + 97);

    /* Next-ring hint on the right of the panel. */
    const next = game.course.nextRing();
    drawPanel(ctx, 592, panelY + 10, 300, 98);
    ctx.fillStyle = '#cfe8f5';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    if (next) {
      const d = Math.max(0, next.z - p.z);
      ctx.fillText(`NEXT RING ${next.index + 1} — ${Math.round(d)}m AHEAD`, 604, panelY + 30);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = next.fuel ? PALETTE.ringGreen : PALETTE.ringNext;
      ctx.fillText(next.fuel ? '⬢ GREEN FUEL RING — REFUEL +35%' : '⬢ CENTRE PASS PAYS +50 BONUS', 604, panelY + 56);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#cfe8f5';
      ctx.fillText(`RING ALT ${Math.round(next.y)} FT  •  OFFSET ${Math.round(next.x - p.x) >= 0 ? '+' : ''}${Math.round(next.x - p.x)}m`, 604, panelY + 80);
    } else if (game.mission.id === 'sunset') {
      ctx.fillText('ALL RINGS DONE — LAND ON RUNWAY 27', 604, panelY + 30);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = PALETTE.ringNext;
      ctx.fillText('⬢ SLOW BELOW 110 KT • DESCEND GENTLY', 604, panelY + 56);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#cfe8f5';
      ctx.fillText('LINE UP CENTRELINE • FLARE BEFORE TOUCHDOWN', 604, panelY + 80);
    } else {
      ctx.fillText('ALL RINGS DONE — COURSE COMPLETE', 604, panelY + 30);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = PALETTE.ringGreen;
      ctx.fillText('⬢ FLY ON TO THE COAST AND ENJOY THE VIEW', 604, panelY + 56);
    }

    drawThrottleFuel(ctx, 916, panelY + 5, p.throttle, p.fuel, p.fuel < 20, time);

    /* Landing guide: runway alignment chevrons when the runway is near. */
    if (game.mission.id === 'sunset' && game.course.allPassed()) {
      const dz = game.terrain.runwayZ - p.z;
      if (dz > 0 && dz < 2400) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillStyle = Math.abs(p.x) < 55 ? PALETTE.ringGreen : PALETTE.hudAmber;
        ctx.fillText(`RUNWAY 27 — ${Math.round(dz)}m  •  ${Math.abs(p.x) < 55 ? 'ON CENTRELINE' : (p.x < 0 ? '◀ DRIFT LEFT' : 'DRIFT RIGHT ▶')}`, CANVAS_W / 2, 100);
        ctx.restore();
      }
    }

    /* Centre flash messages (ring scored, warnings). */
    for (const msg of game.messages) {
      const age = time - msg.at;
      if (age > 2.2) continue;
      const alpha = age < 0.3 ? age / 0.3 : (age > 1.7 ? (2.2 - age) / 0.5 : 1);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = msg.color;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 12;
      ctx.fillText(msg.text, CANVAS_W / 2, 190 + (age * 8));
      if (msg.sub) {
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(msg.sub, CANVAS_W / 2, 222 + (age * 8));
      }
      ctx.restore();
    }

    /* Stall / pull-up warnings. */
    if (p.stalled || (p.alt < 120 && p.verticalSpeed < -10 && !p.onGround)) {
      const blink = Math.sin(time * 10) > 0;
      if (blink) {
        ctx.save();
        ctx.font = 'bold 30px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = PALETTE.hudRed;
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 10;
        ctx.fillText(p.stalled ? '⚠ STALL — PUSH THE NOSE DOWN' : '⚠ PULL UP — TERRAIN', CANVAS_W / 2, 260);
        ctx.restore();
      }
    }
    if (p.fuel <= 0) {
      ctx.save();
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.hudRed;
      ctx.fillText('⛽ FUEL EMPTY — GLIDING', CANVAS_W / 2, 300);
      ctx.restore();
    }
  }

  drawTitle(ctx, game, time) {
    /* Big title over the live attract scene. */
    ctx.fillStyle = 'rgba(8,16,26,0.45)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 18;
    ctx.fillText('COPPER COAST', CANVAS_W / 2, 128);
    ctx.fillStyle = PALETTE.ringNext;
    ctx.fillText('AIR RALLY', CANVAS_W / 2, 196);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#eaf4fb';
    ctx.font = '19px sans-serif';
    ctx.fillText('Fly the rings, mind your fuel, and bring the Kestrel home.', CANVAS_W / 2, 232);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = PALETTE.hudCyan;
    ctx.fillText('A chase-view flight game over a living coastline — keyboard + mouse, no downloads, no sign-up.', CANVAS_W / 2, 258);

    /* Mission cards. */
    game.titleCards = [];
    const cardW = 360, cardH = 148, gap = 28;
    const totalW = cardW * 3 + gap * 2;
    let x = (CANVAS_W - totalW) / 2;
    const y = 300;
    MISSIONS.forEach((m, i) => {
      const hover = game.input.mouseX * CANVAS_W > x && game.input.mouseX * CANVAS_W < x + cardW &&
        game.input.mouseY * CANVAS_H > y && game.input.mouseY * CANVAS_H < y + cardH;
      ctx.save();
      ctx.fillStyle = hover ? 'rgba(30,52,72,0.95)' : 'rgba(13,24,34,0.88)';
      ctx.strokeStyle = hover ? PALETTE.ringNext : PALETTE.panelEdge;
      ctx.lineWidth = hover ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = PALETTE.ringNext;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`SORTIE ${i + 1}  •  ${m.tag.toUpperCase()}`, x + 18, y + 28);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(m.name, x + 18, y + 60);
      ctx.fillStyle = '#cfe8f5';
      ctx.font = '13px sans-serif';
      const words = m.blurb.split(' ');
      let line = '', ly = y + 84;
      for (const w of words) {
        if ((line + ' ' + w).length > 42) { ctx.fillText(line, x + 18, ly); line = w; ly += 17; }
        else line = line ? line + ' ' + w : w;
      }
      ctx.fillText(line, x + 18, ly);
      ctx.fillStyle = PALETTE.hudCyan;
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${m.rings} RINGS  •  FUEL ${m.fuel}%  •  PAR ${m.par}s`, x + 18, y + cardH - 14);
      ctx.restore();
      game.titleCards.push({ mission: m, x, y, w: cardW, h: cardH });
      x += cardW + gap;
    });

    /* Controls strip. */
    ctx.fillStyle = '#eaf4fb';
    ctx.font = '15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← → / A D  bank & turn      ↑ ↓ / W S  pitch      SHIFT / CTRL  throttle      Mouse  steer      P  pause      M  sound', CANVAS_W / 2, 500);
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.font = 'bold 17px sans-serif';
    const pulse = 0.65 + 0.35 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillText('CLICK A SORTIE — OR PRESS 1, 2 OR 3 TO FLY', CANVAS_W / 2, 534);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(234,244,251,0.75)';
    ctx.font = '13px sans-serif';
    ctx.fillText('Best score this session: ' + game.bestScore.toLocaleString() + '   •   Rings pay 100, a perfect centre pass pays 150, a soft landing pays up to 500.', CANVAS_W / 2, 566);
    ctx.textAlign = 'left';
  }

  drawPaused(ctx, game) {
    ctx.fillStyle = 'rgba(8,16,26,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('PAUSED', CANVAS_W / 2, 300);
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#cfe8f5';
    ctx.fillText('Press P to keep flying — or R to restart the sortie.', CANVAS_W / 2, 340);
    ctx.textAlign = 'left';
  }

  drawEnd(ctx, game, time) {
    const won = game.endKind === 'landed' || game.endKind === 'complete';
    ctx.fillStyle = won ? 'rgba(8,26,18,0.42)' : 'rgba(30,10,8,0.5)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? PALETTE.ringGreen : PALETTE.hudRed;
    ctx.font = 'bold 58px sans-serif';
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 16;
    const title = game.endKind === 'landed' ? 'TOUCHDOWN!' :
      game.endKind === 'complete' ? 'COURSE COMPLETE!' :
      game.endKind === 'fuel' ? 'OUT OF FUEL' :
      game.endKind === 'terrain' ? 'TERRAIN STRIKE' : 'DITCHED IN THE SEA';
    ctx.fillText(title, CANVAS_W / 2, 150);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText(game.endLine, CANVAS_W / 2, 188);

    /* Score breakdown card. */
    const cardW = 560, cardH = 240;
    const cx = (CANVAS_W - cardW) / 2, cy = 220;
    ctx.fillStyle = 'rgba(13,24,34,0.92)';
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(cx, cy, cardW, cardH, 14);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#cfe8f5';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('FLIGHT LOG — ' + game.mission.name.toUpperCase(), cx + 24, cy + 34);
    const rows = [
      /* ringScore already includes the perfect +50s, so the rings
         row shows the base 100s and the perfects get their own row. */
      ['Rings flown', `${game.course.ringsPassed()} / ${game.course.totalRings()}`, game.ringScore - game.perfectCount * 50],
      ['Perfect centre passes', String(game.perfectCount), game.perfectCount * 50],
      ['Landing bonus', game.endKind === 'landed' ? game.landingGrade : '—', game.landingScore],
      ['Time bonus', game.timeBonus > 0 ? `under par by ${Math.max(0, game.mission.par - Math.floor(game.elapsed))}s` : 'over par', game.timeBonus],
      ['Fuel left', `${Math.round(game.plane.fuel)}%`, Math.round(game.plane.fuel)],
    ];
    let ry = cy + 66;
    ctx.font = '15px sans-serif';
    for (const [label, val, pts] of rows) {
      ctx.fillStyle = '#eaf4fb';
      ctx.fillText(label, cx + 24, ry);
      ctx.fillStyle = '#cfe8f5';
      ctx.fillText(val, cx + 250, ry);
      ctx.fillStyle = PALETTE.ringNext;
      ctx.textAlign = 'right';
      ctx.fillText('+' + pts, cx + cardW - 24, ry);
      ctx.textAlign = 'left';
      ry += 28;
    }
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(cx + 24, ry - 8, cardW - 48, 1);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('TOTAL SCORE', cx + 24, ry + 24);
    ctx.fillStyle = PALETTE.ringNext;
    ctx.textAlign = 'right';
    ctx.fillText(game.score.toLocaleString(), cx + cardW - 24, ry + 24);
    ctx.textAlign = 'center';
    if (game.newBest) {
      ctx.fillStyle = PALETTE.ringGreen;
      ctx.font = 'bold 17px sans-serif';
      ctx.fillText('★ NEW BEST SCORE THIS SESSION ★', CANVAS_W / 2, cy + cardH + 34);
    }
    const pulse = 0.65 + 0.35 * Math.sin(time * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px sans-serif';
    ctx.fillText('PRESS R OR CLICK TO FLY AGAIN  •  PRESS T FOR THE TITLE SCREEN', CANVAS_W / 2, 540);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
