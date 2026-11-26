'use strict';
/* Copper Coast Air Rally — terrain.js
   The world: a sunlit coastline that runs away to the horizon, drawn
   as perspective ground bands over a heightfield, with a sea on the
   west, fields, forest and a little town on the east, a ridge of
   mountains ahead, and runway 27 waiting at the end of the course.
   Everything is procedural — no image files — from one seeded noise
   field, so the coast looks the same every flight. */

/* Tiny deterministic hash-noise: same input, same coast, every run. */
function hashNoise(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function smoothNoise(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hashNoise(i) * (1 - u) + hashNoise(i + 1) * u;
}
function fbm(x) {
  return smoothNoise(x) * 0.55 + smoothNoise(x * 2.13 + 7.7) * 0.3 + smoothNoise(x * 4.31 + 3.1) * 0.15;
}

class Terrain {
  constructor(mission) {
    this.seed = mission.courseSeed;
    this.dusk = !!mission.dusk;
    /* The runway sits just past the last ring. */
    this.runwayZ = (mission.rings + 1) * mission.ringSpacing + 700;
    this.runwayLen = 900;
    /* Pre-rolled cloud puffs and mountain peaks, fixed per mission. */
    this.clouds = [];
    for (let i = 0; i < 14; i++) {
      this.clouds.push({
        x: hashNoise(i * 3.1 + this.seed) * 2 - 1,
        y: 36 + hashNoise(i * 5.7 + this.seed) * 110,
        w: 70 + hashNoise(i * 9.3 + this.seed) * 130,
        h: 16 + hashNoise(i * 4.4 + this.seed) * 22,
        speed: 0.4 + hashNoise(i * 2.2 + this.seed) * 0.8,
      });
    }
  }

  /* Coastline: the sea/land boundary in world x (metres), wandering with z. */
  coastX(z) {
    return -260 + (fbm(z * 0.00045 + this.seed * 0.13) - 0.5) * 520;
  }

  /* Ground height in feet at world (x, z). Sea is 0; land rolls up east. */
  heightAt(x, z) {
    const coast = this.coastX(z);
    if (x < coast - 30) return 0;                       // open sea
    if (x < coast + 40) return 4 + (x - coast + 30) * 0.08; // beach shelf
    const land = (x - coast) / 900;                      // 0 at shore, 1 inland
    let h = 18 + fbm(z * 0.0011 + this.seed) * 90 * (0.4 + land);
    h += fbm(z * 0.00023 + 40 + this.seed * 0.05) * 260 * land * land; // ridge
    if (x > 700) h += (x - 700) * 0.22;                  // the mountain wall east
    return Math.max(0, h);
  }

  isSea(x, z) { return x < this.coastX(z) - 30; }
  onRunway(x, z) {
    return z > this.runwayZ - this.runwayLen / 2 && z < this.runwayZ + this.runwayLen / 2 && Math.abs(x) < 55;
  }

  /* What kind of ground a band at distance z is: sea, sand, field, forest, town. */
  groundKind(z) {
    if (z > this.runwayZ - this.runwayLen / 2 - 260 && z < this.runwayZ + this.runwayLen / 2 + 260) return 'airfield';
    const n = fbm(z * 0.0016 + this.seed * 0.31);
    if (n < 0.24) return 'forest';
    if (n > 0.78) return 'town';
    return (Math.floor(z / SEG_LEN) % 2 === 0) ? 'fieldA' : 'fieldB';
  }

  drawSky(ctx, heading, time) {
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON_Y + 40);
    if (this.dusk) {
      g.addColorStop(0, PALETTE.duskTop);
      g.addColorStop(0.55, PALETTE.duskMid);
      g.addColorStop(1, PALETTE.duskLow);
    } else {
      g.addColorStop(0, PALETTE.skyTop);
      g.addColorStop(0.55, PALETTE.skyMid);
      g.addColorStop(1, PALETTE.skyLow);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CANVAS_W, HORIZON_Y + 42);

    /* Low sun, drifting with heading so turning the plane moves the sky. */
    const sunX = CANVAS_W * 0.72 - heading * 420;
    const sunY = this.dusk ? 218 : 108;
    const sunR = this.dusk ? 46 : 34;
    const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, sunR * 3.2);
    glow.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
    glow.addColorStop(0.35, 'rgba(255, 196, 110, 0.45)');
    glow.addColorStop(1, 'rgba(255, 196, 110, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - sunR * 3.2, sunY - sunR * 3.2, sunR * 6.4, sunR * 6.4);
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    /* Clouds: parallax by heading, slow drift with time. */
    ctx.fillStyle = this.dusk ? 'rgba(255, 190, 160, 0.55)' : 'rgba(255,255,255,0.85)';
    for (const c of this.clouds) {
      const cx = ((c.x * CANVAS_W * 0.9 + CANVAS_W * 0.5 - heading * 300 + time * c.speed * 6) % (CANVAS_W + 320) + CANVAS_W + 320) % (CANVAS_W + 320) - 160;
      ctx.beginPath();
      ctx.ellipse(cx, c.y, c.w, c.h, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + c.w * 0.5, c.y + 5, c.w * 0.55, c.h * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Far mountain wall: two ridges, the farther one paler and slower. */
    this.drawRidge(ctx, heading, 0.25, 0.5, this.dusk ? '#7a4a6e' : '#8aa8cc', 150);
    this.drawRidge(ctx, heading, 0.5, 1.0, this.dusk ? '#4e3358' : '#5d7ba3', 210);
  }

  drawRidge(ctx, heading, parallax, alpha, color, amp) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, HORIZON_Y + 2);
    for (let sx = 0; sx <= CANVAS_W; sx += 16) {
      const w = sx / CANVAS_W * 6 + this.seed * 0.7 + heading * parallax * 2;
      const peak = fbm(w) * amp + fbm(w * 3.7) * amp * 0.25;
      ctx.lineTo(sx, HORIZON_Y + 2 - peak);
    }
    ctx.lineTo(CANVAS_W, HORIZON_Y + 2);
    ctx.closePath();
    ctx.fill();
    /* Snow caps on the tallest peaks: little triangles, not blocks. */
    ctx.fillStyle = 'rgba(238,242,245,0.85)';
    for (let sx = 0; sx <= CANVAS_W; sx += 16) {
      const w = sx / CANVAS_W * 6 + this.seed * 0.7 + heading * parallax * 2;
      const peak = fbm(w) * amp + fbm(w * 3.7) * amp * 0.25;
      if (peak > amp * 0.78) {
        const py = HORIZON_Y + 2 - peak;
        ctx.beginPath();
        ctx.moveTo(sx - 9, py + 8); ctx.lineTo(sx, py - 2); ctx.lineTo(sx + 9, py + 8);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* Project a world point to the screen. Altitudes are feet, distances
     metres: everything is converted to metres here, and the camera is
     pitched 0.10 rad down so the ground fills the lower half of the
     frame instead of hiding below it. Returns null behind the camera. */
  project(wx, wyFt, wz, plane) {
    const dx = wx - plane.x;
    const dy = (wyFt - plane.alt) * 0.3048;   // metres, + up
    const dz = wz - plane.z;
    const P = 0.10;
    const c = Math.cos(P), s = Math.sin(P);
    const y2 = dy * c - dz * s;
    const z2 = dz * c + dy * s;
    if (z2 < 12) return null;
    return {
      x: CANVAS_W / 2 + dx * FOCAL / z2,
      y: HORIZON_Y - y2 * FOCAL / z2,
      s: FOCAL / z2,
    };
  }

  /* The ground: perspective bands from near to far, sea on the west,
     land on the east, with the runway drawn as a trapezoid when near. */
  drawGround(ctx, plane) {
    /* Distant haze below the horizon, so no gap ever shows sky. */
    const haze = ctx.createLinearGradient(0, HORIZON_Y, 0, CANVAS_H);
    haze.addColorStop(0, this.dusk ? '#7d5568' : '#a8c8de');
    haze.addColorStop(1, this.seaShade(1800, plane.z));
    ctx.fillStyle = haze;
    ctx.fillRect(0, HORIZON_Y, CANVAS_W, CANVAS_H - HORIZON_Y);

    const planeZ = plane.z;
    const px = plane.x;
    /* Log-spaced slices so near ground has detail and far ground is cheap.
       Drawn far to near so near bands overwrite far ones. */
    const slices = 64;
    for (let i = slices - 1; i >= 0; i--) {
      const t0 = i / slices;
      const t1 = (i + 1) / slices;
      const d0 = 26 + Math.pow(t0, 1.9) * DRAW_DIST;
      const d1 = 26 + Math.pow(t1, 1.9) * DRAW_DIST;
      const z0 = planeZ + d0;
      const z1 = planeZ + d1;
      /* The band's vertical span: sea level at the coast and the land
         height inland, at both the near and far edges. */
      const coast0 = this.coastX(z0);
      const coast1 = this.coastX(z1);
      const landX = px + 320;
      const pts = [
        this.project(coast0, 0, z0, plane),
        this.project(coast1, 0, z1, plane),
        this.project(landX, this.heightAt(landX, z0), z0, plane),
        this.project(landX, this.heightAt(landX, z1), z1, plane),
      ].filter(Boolean);
      if (pts.length < 2) continue;
      const ys = pts.map((p) => p.y);
      const top = Math.max(HORIZON_Y, Math.min(...ys));
      const bot = Math.min(CANVAS_H, Math.max(...ys));
      if (bot <= top + 0.5) continue;
      const kind = this.groundKind(z0);
      /* Sea band: from the left edge to the projected coastline. */
      const coastP = this.project(coast0, 0, z0, plane);
      const coastSx = coastP ? coastP.x : CANVAS_W / 2;
      ctx.fillStyle = this.seaShade(d0, z0);
      ctx.fillRect(0, top, Math.max(0, coastSx), bot - top);
      /* Land band from the coast to the right edge. */
      const landColor = kind === 'airfield' ? PALETTE.fieldA : this.landColor(kind, z0);
      ctx.fillStyle = landColor;
      ctx.fillRect(Math.max(0, coastSx), top, CANVAS_W - Math.max(0, coastSx), bot - top);
      /* Beach strip right at the waterline: the smooth shoreline
         ribbon drawn after the bands covers this seam, so bands
         carry no beach of their own. */
      /* Town rooftops and trees as tiny specks inside their band. */
      if (kind === 'town' && d0 < 900) this.drawTownSpecks(ctx, z0, d0, top, bot, px);
      if (kind === 'forest' && d0 < 700) this.drawTreeSpecks(ctx, z0, d0, top, bot, px);
    }
    /* Smooth shoreline ribbon: a sand line (and a foam edge) traced
       along the projected coast, hiding the bands' staircase. */
    ctx.strokeStyle = PALETTE.sand;
    ctx.lineWidth = 12;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let started = false;
    for (let k = 0; k <= 48; k++) {
      /* Log-spaced samples: dense near the plane, where the coast
         moves fastest across the screen. */
      const z = planeZ + 60 + (DRAW_DIST - 60) * Math.pow(k / 48, 2.4);
      const p = this.project(this.coastX(z), 0, z, plane);
      if (!p) continue;
      if (!started) { ctx.moveTo(p.x, p.y); started = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 3;
    ctx.stroke();
    this.drawRunway(ctx, plane);
  }

  seaShade(d, z) {
    /* A gentle swell shimmer, subtle enough not to stripe the sea. */
    const shimmer = 0.5 + 0.5 * Math.sin(z * 0.006 + d * 0.004);
    const near = Math.max(0, 1 - d / DRAW_DIST);
    const r = Math.round(20 + 6 * shimmer + 26 * near);
    const g = Math.round(85 + 10 * shimmer + 34 * near);
    const b = Math.round(126 + 8 * shimmer + 34 * near);
    return `rgb(${r},${g},${b})`;
  }

  landColor(kind, z) {
    /* Fields blend smoothly with distance instead of alternating
       slice by slice, so the ground reads as countryside, not stripes. */
    const blend = fbm(z * 0.004 + this.seed * 0.7);
    const mix = (hexA, hexB, t) => {
      const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
      const r = Math.round((a >> 16) + ((b >> 16) - (a >> 16)) * t);
      const g = Math.round(((a >> 8) & 255) + (((b >> 8) & 255) - ((a >> 8) & 255)) * t);
      const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t);
      return `rgb(${r},${g},${bl})`;
    };
    if (kind === 'forest') return mix(PALETTE.forest, '#3a7d3f', blend * 0.5);
    if (kind === 'town') return mix(PALETTE.town, '#9a8f7c', blend * 0.5);
    return mix(PALETTE.fieldA, PALETTE.fieldB, blend);
  }

  drawTownSpecks(ctx, z, d, top, bot, px) {
    const scale = FOCAL / d;
    const h = Math.max(2, (bot - top) * 0.5);
    for (let k = 0; k < 7; k++) {
      const wx = 120 + hashNoise(Math.floor(z / SEG_LEN) * 7 + k * 13.7) * 700;
      const sx = CANVAS_W / 2 + (wx - px) * scale;
      if (sx < 0 || sx > CANVAS_W) continue;
      ctx.fillStyle = PALETTE.townRoof;
      ctx.fillRect(sx, top + h * 0.2, Math.max(2, 14 * scale), h);
      ctx.fillStyle = 'rgba(255,240,200,0.8)';
      ctx.fillRect(sx + 2 * scale, top + h * 0.45, Math.max(1, 3 * scale), Math.max(1, 2 * scale));
    }
  }

  drawTreeSpecks(ctx, z, d, top, bot, px) {
    const scale = FOCAL / d;
    for (let k = 0; k < 10; k++) {
      const wx = 60 + hashNoise(Math.floor(z / SEG_LEN) * 3 + k * 7.3) * 800;
      const sx = CANVAS_W / 2 + (wx - px) * scale;
      if (sx < 0 || sx > CANVAS_W) continue;
      ctx.fillStyle = '#1d4d22';
      ctx.beginPath();
      ctx.arc(sx, top + (bot - top) * 0.5, Math.max(1.5, 7 * scale), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* Runway 27: a perspective trapezoid with threshold bars, centreline
     dashes and a big 27, drawn once it is inside the view distance. */
  drawRunway(ctx, plane) {
    const zNear = this.runwayZ - this.runwayLen / 2;
    const zFar = this.runwayZ + this.runwayLen / 2;
    const dNear = zNear - plane.z;
    const dFar = zFar - plane.z;
    if (dFar < 20 || dNear > DRAW_DIST) return;
    const project = (z, x) => this.project(x, this.heightAt(x, z), z, plane);
    const nL = project(zNear, -55), nR = project(zNear, 55);
    const fL = project(zFar, -55), fR = project(zFar, 55);
    if (!nL || !nR || !fL || !fR) return;
    ctx.fillStyle = PALETTE.runway;
    ctx.beginPath();
    ctx.moveTo(nL.x, nL.y); ctx.lineTo(nR.x, nR.y);
    ctx.lineTo(fR.x, fR.y); ctx.lineTo(fL.x, fL.y);
    ctx.closePath();
    ctx.fill();
    /* Edge lines and centreline dashes. */
    ctx.strokeStyle = 'rgba(245,242,230,0.9)';
    ctx.lineWidth = Math.max(1, 2.2 * nL.s * 40);
    ctx.beginPath();
    ctx.moveTo(nL.x, nL.y); ctx.lineTo(fL.x, fL.y);
    ctx.moveTo(nR.x, nR.y); ctx.lineTo(fR.x, fR.y);
    ctx.stroke();
    ctx.fillStyle = PALETTE.runwayMark;
    for (let i = 0; i < 9; i++) {
      const z = zNear + 60 + i * 90;
      if (z > zFar - 40) break;
      const a = project(z, -3), b = project(z + 42, 3);
      ctx.fillRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x) + 1, Math.max(1.5, Math.abs(b.y - a.y)));
    }
    /* Threshold bars and the 27. */
    const t = project(zNear + 26, 0);
    ctx.font = `bold ${Math.max(10, 30 * t.s * 40)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.runwayMark;
    ctx.fillText('27', t.x, t.y - 6);
  }
}
