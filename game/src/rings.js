'use strict';
/* Copper Coast Air Rally — rings.js
   The course: a chain of glowing rings hung over the coast, each one
   a gate the pilot flies through. Passing through the middle is a
   perfect; clipping the edge still counts. Every fourth ring is a
   green fuel ring that tops the tanks up — the decision that turns a
   sortie into fuel management. The last ring hands the pilot to the
   runway for the sunset sortie. */

class RingCourse {
  constructor(mission) {
    this.mission = mission;
    this.rings = [];
    let x = 0;
    for (let i = 0; i < mission.rings; i++) {
      const z = (i + 1) * mission.ringSpacing;
      /* The course snakes along the coast: a slow sine with a seeded wobble. */
      x = Math.sin(i * 0.85 + mission.courseSeed) * 260 + Math.sin(i * 0.31 + mission.courseSeed * 2.7) * 130;
      const y = 120 + 130 * Math.abs(Math.sin(i * 0.7 + mission.courseSeed * 0.4)) + 40 * Math.sin(i * 1.3);
      this.rings.push({
        index: i,
        x, y, z,
        radius: FLIGHT.ringRadius,
        fuel: (i + 1) % 4 === 0,
        passed: false,
        perfect: false,
        missed: false,
      });
    }
    this.nextIndex = 0;
  }

  nextRing() {
    return this.rings[this.nextIndex] || null;
  }

  ringsPassed() { return this.nextIndex; }
  totalRings() { return this.rings.length; }
  allPassed() { return this.nextIndex >= this.rings.length; }

  /* Project a world point to the screen from the plane's viewpoint.
     Altitudes are feet, distances metres: convert to metres here,
     with the same 0.10 rad camera pitch down as the terrain. */
  project(wx, wy, wz, plane) {
    const d = wz - plane.z;
    const dy = (wy - plane.alt) * 0.3048;   // metres, + up
    const P = 0.10;
    const c = Math.cos(P), s = Math.sin(P);
    const y2 = dy * c - d * s;
    const z2 = d * c + dy * s;
    if (z2 < 12) return null;
    return {
      x: CANVAS_W / 2 + (wx - plane.x) * FOCAL / z2,
      y: HORIZON_Y - y2 * FOCAL / z2,
      r: FLIGHT.ringRadius * FOCAL / z2,
      d,
    };
  }

  /* Called when the plane crosses a ring's z-plane: inside the circle
     counts, inside the inner circle is perfect. Returns the result. */
  checkCrossing(plane, prevZ) {
    const ring = this.nextRing();
    if (!ring) return null;
    if (prevZ < ring.z && plane.z >= ring.z) {
      const dx = plane.x - ring.x;
      const dy = plane.alt - ring.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      ring.passed = dist <= ring.radius;
      ring.perfect = dist <= FLIGHT.perfectRadius;
      ring.missed = !ring.passed;
      this.nextIndex++;
      return { ring, dist, hit: ring.passed, perfect: ring.perfect };
    }
    return null;
  }

  draw(ctx, plane, time) {
    /* Far rings first so near ones overlap correctly. */
    const visible = this.rings.filter((r) => r.z > plane.z - 10 && r.z < plane.z + DRAW_DIST);
    visible.sort((a, b) => b.z - a.z);
    for (const ring of visible) {
      const p = this.project(ring.x, ring.y, ring.z, plane);
      if (!p || p.r < 2) continue;
      const isNext = ring === this.nextRing();
      const pulse = 1 + 0.08 * Math.sin(time * 4 + ring.index);
      const r = p.r * pulse;
      if (ring.passed) {
        /* A passed ring: green tick, fading as it falls behind. */
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(0.9, (ring.z - plane.z + 200) / 300));
        ctx.strokeStyle = PALETTE.ringGreen;
        ctx.lineWidth = Math.max(2, r * 0.14);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      if (ring.missed) continue;
      /* Glow halo, then the ring itself, then its number. */
      const glow = ctx.createRadialGradient(p.x, p.y, r * 0.4, p.x, p.y, r * 1.7);
      const base = ring.fuel ? '57,217,138' : (isNext ? '255,201,60' : '255,150,80');
      glow.addColorStop(0, `rgba(${base},0.35)`);
      glow.addColorStop(1, `rgba(${base},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ring.fuel ? PALETTE.ringGreen : (isNext ? PALETTE.ringNext : '#ff9660');
      ctx.lineWidth = Math.max(2, r * 0.16);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.82, 0, Math.PI * 2);
      ctx.stroke();
      if (r > 14) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(11, r * 0.5)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        /* Number sits inside the top of the ring; the distance ribbon
           floats above it so the two never collide. */
        ctx.fillText(String(ring.index + 1), p.x, p.y - r * 0.62);
        if (ring.fuel) {
          ctx.fillStyle = PALETTE.ringGreen;
          ctx.font = `bold ${Math.max(10, r * 0.34)}px sans-serif`;
          ctx.fillText('FUEL', p.x, p.y);
        }
      }
      /* Next-ring beacon: a small diamond and distance at the top. */
      if (isNext && (p.x < 60 || p.x > CANVAS_W - 60 || p.y < 40 || p.y > CANVAS_H - 200)) {
        const bx = Math.max(40, Math.min(CANVAS_W - 40, p.x));
        const by = 54;
        ctx.fillStyle = PALETTE.ringNext;
        ctx.beginPath();
        ctx.moveTo(bx, by - 10); ctx.lineTo(bx + 10, by); ctx.lineTo(bx, by + 10); ctx.lineTo(bx - 10, by);
        ctx.closePath(); ctx.fill();
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(p.d)}m`, bx, by + 26);
      }
    }
    /* Distance ribbon to the next ring when it is in view. */
    const next = this.nextRing();
    if (next) {
      const p = this.project(next.x, next.y, next.z, plane);
      if (p && p.x > 40 && p.x < CANVAS_W - 40 && p.y > 30 && p.y < CANVAS_H - 180) {
        ctx.fillStyle = 'rgba(10,20,32,0.55)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        const label = `RING ${next.index + 1}  •  ${Math.round(p.d)}m`;
        const w = ctx.measureText(label).width + 22;
        ctx.fillRect(p.x - w / 2, p.y - p.r - 56, w, 22);
        ctx.fillStyle = PALETTE.ringNext;
        ctx.fillText(label, p.x, p.y - p.r - 41);
      }
    }
  }
}
