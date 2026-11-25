// ============================================================
// sprites.js — Pixel-art sprite drawing functions (canvas 2D)
// All sprites drawn procedurally — no external image assets needed
// ============================================================

const Sprites = (() => {
  const T = C.TILE;
  const H = T / 2;

  // ── Helpers ────────────────────────────────────────────────
  function px(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  // ── TILES ──────────────────────────────────────────────────
  function drawWall(ctx, x, y, frame) {
    const f = frame || 0;
    // Base stone
    px(ctx, '#1c1c2a', x, y, T, T);
    // Stone blocks
    const rows = 2, cols = 2;
    const bw = T / cols, bh = T / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const offset = r % 2 === 0 ? 0 : bw / 2;
        const bx = x + ((c * bw + offset) % T);
        const by = y + r * bh;
        ctx.fillStyle = r + c === 0 ? '#222235' : (r + c) % 2 === 0 ? '#1f1f30' : '#1a1a28';
        ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
        // Cracks
        ctx.fillStyle = '#0e0e1a';
        ctx.fillRect(bx + 1, by + 1, bw - 2, 1);
        ctx.fillRect(bx + 1, by + 1, 1, bh - 2);
      }
    }
    // Top highlight
    ctx.fillStyle = '#2a2a40';
    ctx.fillRect(x, y, T, 2);
  }

  function drawFloor(ctx, x, y) {
    px(ctx, '#231e2f', x, y, T, T);
    // Tile pattern
    px(ctx, '#251f33', x + 2, y + 2, T - 4, T - 4);
    // Subtle grout lines
    ctx.fillStyle = '#1a1626';
    ctx.fillRect(x, y, T, 1);
    ctx.fillRect(x, y, 1, T);
  }

  function drawTorch(ctx, x, y, frame) {
    drawFloor(ctx, x, y);
    const f = frame % 4;
    // Wall mount
    px(ctx, '#5c3d1e', x + H - 3, y + 4, 6, 10);
    // Flame (animated)
    const flameColors = ['#ff8c00','#ffaa33','#ffcc44','#ff6600'];
    const c1 = flameColors[f];
    const c2 = flameColors[(f + 1) % 4];
    px(ctx, c1, x + H - 2, y + 2, 4, 5);
    px(ctx, c2, x + H - 1, y + 1, 2, 3);
    px(ctx, '#fff9c4', x + H, y + 1, 1, 2);
    // Glow circle (soft)
    const grd = ctx.createRadialGradient(x + H, y + H, 2, x + H, y + H, T);
    grd.addColorStop(0, 'rgba(255,140,0,0.22)');
    grd.addColorStop(1, 'rgba(255,140,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - T/2, y - T/2, T * 2, T * 2);
  }

  function drawDoor(ctx, x, y, locked) {
    drawFloor(ctx, x, y);
    // Door frame
    px(ctx, locked ? '#8b4513' : '#228b22', x + 4, y + 2, T - 8, T - 2);
    px(ctx, locked ? '#5c2d0a' : '#155a15', x + 6, y + 4, T - 12, T - 6);
    // Handle
    px(ctx, '#ffd700', x + T - 10, y + H, 4, 4);
    // Lock symbol if locked
    if (locked) {
      px(ctx, '#ffd700', x + H - 3, y + H - 2, 6, 5);
      px(ctx, '#ffd700', x + H - 1, y + H - 5, 2, 4);
    } else {
      // Stairs arrows
      for (let i = 0; i < 3; i++) {
        px(ctx, '#a0ffa0', x + H - 2, y + 8 + i * 6, 4, 4);
      }
    }
  }

  function drawChest(ctx, x, y, opened) {
    drawFloor(ctx, x, y);
    const col = opened ? '#5c3010' : '#8b4513';
    px(ctx, col, x + 4, y + 10, T - 8, T - 14);
    px(ctx, opened ? '#3a1e08' : '#6b3410', x + 4, y + 10, T - 8, 6);
    px(ctx, '#ffd700', x + 4, y + 15, T - 8, 2);
    if (!opened) px(ctx, '#ffd700', x + H - 2, y + 14, 4, 4);
    if (opened) px(ctx, 'rgba(255,215,0,0.5)', x + 6, y + 12, T - 12, 8);
  }

  function drawSavePoint(ctx, x, y, frame) {
    drawFloor(ctx, x, y);
    const pulse = 0.6 + 0.4 * Math.sin(frame * 0.45);
    // Arcane aura
    const grd = ctx.createRadialGradient(x + H, y + H, 2, x + H, y + H, T * 0.8);
    grd.addColorStop(0, `rgba(155, 93, 229, ${0.45 * pulse})`);
    grd.addColorStop(1, 'rgba(155, 93, 229, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 6, y - 6, T + 12, T + 12);

    // Stone pedestal
    px(ctx, '#3a3a52', x + 7, y + 20, T - 14, 8);
    px(ctx, '#4f4f6e', x + 9, y + 16, T - 18, 5);
    // Floating crystal
    const bob = Math.sin(frame * 0.5) * 2;
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.moveTo(x + H, y + 3 + bob);
    ctx.lineTo(x + H + 6, y + 11 + bob);
    ctx.lineTo(x + H, y + 18 + bob);
    ctx.lineTo(x + H - 6, y + 11 + bob);
    ctx.closePath();
    ctx.fill();
    px(ctx, '#f3e8ff', x + H - 1, y + 7 + bob, 2, 6);
  }

  function drawLoreTablet(ctx, x, y, frame) {
    drawFloor(ctx, x, y);
    const pulse = 0.5 + 0.5 * Math.sin(frame * 0.3);
    // Monolith slab
    px(ctx, '#3b384a', x + 8, y + 5, T - 16, T - 8);
    px(ctx, '#524e66', x + 9, y + 6, T - 18, 3);
    // Glowing runes
    ctx.fillStyle = `rgba(255, 215, 0, ${0.4 + 0.5 * pulse})`;
    ctx.fillRect(x + 11, y + 11, 10, 2);
    ctx.fillRect(x + 11, y + 15, 7, 2);
    ctx.fillRect(x + 11, y + 19, 9, 2);
  }

  // ── ENTITIES ───────────────────────────────────────────────
  function drawPlayer(ctx, x, y, dir, frame, hasPowerup, attackProgress = 0) {
    const f = frame % 4;
    const bobY = (f < 2) ? 0 : -1; // walk bob
    const isAttacking = attackProgress > 0;
    // Subtle lunge toward facing direction during swing
    const lunge = isAttacking ? Math.sin(attackProgress * Math.PI) * 5 : 0;
    const lx = dir === 'left' ? -lunge : dir === 'right' ? lunge : 0;
    const ly = dir === 'up' ? -lunge : dir === 'down' ? lunge : 0;
    const px0 = x + lx;
    const py = y + bobY + ly;

    if (hasPowerup === 'shield') {
      // Shield aura
      ctx.fillStyle = 'rgba(79,163,224,0.2)';
      ctx.beginPath();
      ctx.arc(px0 + H, py + H, H + 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body (tunic)
    px(ctx, '#3366aa', px0 + 8, py + 12, T - 16, T - 18);
    // Head
    px(ctx, '#f0c88a', px0 + 9, py + 4, T - 18, 10);
    // Eyes (shift slightly with facing dir)
    const eyeOffX = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    if (dir !== 'up') {
      px(ctx, '#1a1a2e', px0 + 11 + eyeOffX, py + 7, 2, 2);
      px(ctx, '#1a1a2e', px0 + T - 13 + eyeOffX, py + 7, 2, 2);
    }
    // Helmet
    px(ctx, '#c0c0c0', px0 + 8, py + 2, T - 16, 6);
    px(ctx, '#a0a0a0', px0 + 8, py + 2, T - 16, 2);
    // Arms
    px(ctx, '#f0c88a', px0 + 4, py + 13, 5, 10);
    px(ctx, '#f0c88a', px0 + T - 9, py + 13, 5, 10);
    // Legs (animated)
    px(ctx, '#8b4513', px0 + 8, py + T - 10, 6, 10);
    px(ctx, '#8b4513', px0 + T - 14, py + T - 10, 6, 10);

    // Sword (sweeping sideways arc when attacking)
    const bladeCol = hasPowerup === 'sword' ? '#ff4444' : '#e8eef5';
    const guardCol = '#ffd700';
    if (isAttacking) {
      ctx.save();
      const pivotX = px0 + H;
      const pivotY = py + H;
      let baseAngle = 0;
      if (dir === 'right') baseAngle = 0;
      else if (dir === 'down') baseAngle = Math.PI * 0.5;
      else if (dir === 'left') baseAngle = Math.PI;
      else baseAngle = -Math.PI * 0.5;

      // Sweep sideways from -75 deg to +75 deg
      const swingAngle = baseAngle + (-0.65 + attackProgress * 1.3) * Math.PI * 0.6;
      ctx.translate(pivotX, pivotY);
      ctx.rotate(swingAngle);
      // Guard & blade extending outward
      ctx.fillStyle = guardCol;
      ctx.fillRect(6, -4, 3, 8);
      ctx.fillStyle = bladeCol;
      ctx.fillRect(9, -2, 18, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(11, -1, 14, 1);
      ctx.restore();
    } else {
      if (dir === 'left') {
        px(ctx, bladeCol, px0 + 1, py + 9, 3, 16);
        px(ctx, guardCol, px0 - 1, py + 17, 7, 3);
      } else {
        px(ctx, bladeCol, px0 + T - 4, py + 9, 3, 16);
        px(ctx, guardCol, px0 + T - 6, py + 17, 7, 3);
      }
    }

    if (hasPowerup === 'speed') {
      // Speed trail
      ctx.fillStyle = 'rgba(255,159,28,0.3)';
      ctx.fillRect(px0 - 4, py + 10, 6, 14);
    }
  }

  function drawSlime(ctx, x, y, frame, hp, maxHp) {
    const f = frame % 4;
    const squish = (f < 2) ? 2 : -2;
    // Body
    ctx.fillStyle = '#2dc653';
    ctx.beginPath();
    ctx.ellipse(x + H, y + H + 4 + squish / 2, H - 4, H - 4 - squish, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    px(ctx, '#fff', x + H - 6, y + H - 1, 4, 4);
    px(ctx, '#fff', x + H + 2, y + H - 1, 4, 4);
    px(ctx, '#1a1a2e', x + H - 5, y + H, 2, 2);
    px(ctx, '#1a1a2e', x + H + 3, y + H, 2, 2);
    // Shine
    px(ctx, 'rgba(255,255,255,0.4)', x + H - 3, y + H - 4, 4, 2);
    drawEnemyHpBar(ctx, x, y, hp, maxHp);
  }

  function drawSkeleton(ctx, x, y, frame, hp, maxHp) {
    const f = frame % 4;
    const walkOff = (f < 2) ? 0 : 1;
    // Bones
    // Skull
    px(ctx, '#e0d8c8', x + 9, y + 2, T - 18, 12);
    // Eye sockets
    px(ctx, '#1a1a2e', x + 11, y + 5, 4, 4);
    px(ctx, '#1a1a2e', x + T - 15, y + 5, 4, 4);
    // Jaw
    px(ctx, '#c8c0b0', x + 10, y + 12, T - 20, 4);
    // Ribcage
    px(ctx, '#d8d0c0', x + 10, y + 16, T - 20, 10);
    for (let i = 0; i < 3; i++) {
      px(ctx, '#1a1a28', x + 12, y + 17 + i * 3, T - 24, 2);
    }
    // Arms
    px(ctx, '#d8d0c0', x + 4, y + 16, 6, 12 + walkOff);
    px(ctx, '#d8d0c0', x + T - 10, y + 16, 6, 12 - walkOff);
    // Legs
    px(ctx, '#d8d0c0', x + 9, y + 26, 5, 8 - walkOff);
    px(ctx, '#d8d0c0', x + T - 14, y + 26, 5, 8 + walkOff);
    drawEnemyHpBar(ctx, x, y, hp, maxHp);
  }

  function drawGhost(ctx, x, y, frame, hp, maxHp) {
    const f = frame % 8;
    const floatY = Math.sin(f / 8 * Math.PI * 2) * 3;
    // Body (semi-transparent)
    ctx.fillStyle = 'rgba(155,155,207,0.75)';
    ctx.beginPath();
    ctx.arc(x + H, y + H - 4 + floatY, H - 4, Math.PI, 0);
    ctx.lineTo(x + T - 4, y + H + 10 + floatY);
    // Wavy bottom
    for (let i = 0; i < 4; i++) {
      ctx.quadraticCurveTo(
        x + T - 4 - i * (T - 8) / 4 - (T - 8) / 8,
        y + H + 14 + (i % 2 === 0 ? 4 : -4) + floatY,
        x + T - 4 - (i + 1) * (T - 8) / 4,
        y + H + 10 + floatY
      );
    }
    ctx.closePath();
    ctx.fill();
    // Eyes (glowing)
    px(ctx, '#ff4444', x + H - 5, y + H - 5 + floatY, 4, 4);
    px(ctx, '#ff4444', x + H + 1, y + H - 5 + floatY, 4, 4);
    px(ctx, '#ff9999', x + H - 4, y + H - 4 + floatY, 2, 2);
    px(ctx, '#ff9999', x + H + 2, y + H - 4 + floatY, 2, 2);
    drawEnemyHpBar(ctx, x, y, hp, maxHp);
  }

  function drawBoss(ctx, x, y, frame, hp, maxHp) {
    const f = frame % 8;
    const rage = hp / maxHp < 0.4;
    const col = rage ? '#ff0000' : '#e63946';
    const pulseSz = Math.sin(f / 8 * Math.PI * 2) * 2;

    // Shadow
    ctx.fillStyle = 'rgba(230,57,70,0.15)';
    ctx.beginPath();
    ctx.ellipse(x + H, y + T - 4, H + pulseSz, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (large demon)
    px(ctx, col, x + 4, y + 8, T - 8, T - 12);
    // Head
    px(ctx, '#c0202a', x + 6, y + 2, T - 12, 12);
    // Horns
    px(ctx, '#8b1515', x + 6, y - 4, 5, 8);
    px(ctx, '#8b1515', x + T - 11, y - 4, 5, 8);
    // Eyes (glowing)
    const eyeCol = rage ? '#ffff00' : '#ff8800';
    px(ctx, eyeCol, x + 9, y + 5, 5, 5);
    px(ctx, eyeCol, x + T - 14, y + 5, 5, 5);
    px(ctx, '#fff', x + 10, y + 6, 2, 2);
    px(ctx, '#fff', x + T - 13, y + 6, 2, 2);
    // Arms
    px(ctx, '#b01020', x, y + 10, 8, T - 18);
    px(ctx, '#b01020', x + T - 8, y + 10, 8, T - 18);
    // Claws
    for (let i = 0; i < 3; i++) {
      px(ctx, '#800010', x + i * 3 - 1, y + T - 10 + pulseSz, 2, 6);
      px(ctx, '#800010', x + T - 8 + i * 3, y + T - 10 + pulseSz, 2, 6);
    }
    // Rage aura
    if (rage) {
      ctx.fillStyle = `rgba(255,0,0,${0.1 + Math.abs(Math.sin(f / 4)) * 0.15})`;
      ctx.fillRect(x - 4, y - 4, T + 8, T + 8);
    }
    drawEnemyHpBar(ctx, x, y - 6, hp, maxHp, true);
  }

  function drawEnemyHpBar(ctx, x, y, hp, maxHp, large) {
    const bw = large ? T : T - 4;
    const bx = x + (T - bw) / 2;
    const by = y - (large ? 10 : 8);
    px(ctx, '#1a1a28', bx, by, bw, large ? 5 : 4);
    const pct = Math.max(0, hp / maxHp);
    const col = pct > 0.5 ? '#2dc653' : pct > 0.25 ? '#ffd700' : '#e63946';
    px(ctx, col, bx, by, Math.round(bw * pct), large ? 5 : 4);
  }

  // ── ITEMS ──────────────────────────────────────────────────
  function drawItem(ctx, x, y, type, frame) {
    const f = frame % 8;
    const bob = Math.sin(f / 8 * Math.PI * 2) * 2;
    const cy = y + bob;

    switch (type) {
      case C.I_COIN:
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(x + H, cy + H, 7, 0, Math.PI * 2);
        ctx.fill();
        px(ctx, '#ffea70', x + H - 2, cy + H - 4, 2, 6);
        ctx.strokeStyle = '#a07000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + H, cy + H, 7, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case C.I_GEM:
        ctx.fillStyle = '#4fa3e0';
        ctx.beginPath();
        ctx.moveTo(x + H, cy + 6);
        ctx.lineTo(x + T - 7, cy + H);
        ctx.lineTo(x + H, cy + T - 6);
        ctx.lineTo(x + 7, cy + H);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(x + H, cy + 6);
        ctx.lineTo(x + T - 7, cy + H);
        ctx.lineTo(x + H, cy + 14);
        ctx.closePath();
        ctx.fill();
        break;
      case C.I_HEART:
        ctx.fillStyle = '#e63946';
        ctx.beginPath();
        ctx.arc(x + H - 4, cy + 10, 5, 0, Math.PI * 2);
        ctx.arc(x + H + 4, cy + 10, 5, 0, Math.PI * 2);
        ctx.moveTo(x + 7, cy + 12);
        ctx.lineTo(x + H, cy + T - 7);
        ctx.lineTo(x + T - 7, cy + 12);
        ctx.fill();
        px(ctx, '#ff8080', x + H - 5, cy + 8, 3, 4);
        break;
      case C.I_KEY:
        // Handle
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(x + H, cy + 10, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a28';
        ctx.beginPath();
        ctx.arc(x + H, cy + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        // Shaft
        px(ctx, '#ffd700', x + H, cy + 16, 3, 10);
        px(ctx, '#ffd700', x + H + 3, cy + 22, 4, 2);
        px(ctx, '#ffd700', x + H + 3, cy + 25, 3, 2);
        break;
      case C.I_SPEED:
        // Lightning bolt
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath();
        ctx.moveTo(x + H + 2, cy + 4);
        ctx.lineTo(x + H - 4, cy + H + 2);
        ctx.lineTo(x + H + 1, cy + H + 2);
        ctx.lineTo(x + H - 2, cy + T - 4);
        ctx.lineTo(x + H + 6, cy + H - 2);
        ctx.lineTo(x + H + 1, cy + H - 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,200,80,0.6)';
        ctx.fill();
        break;
      case C.I_SHIELD:
        ctx.fillStyle = '#4fa3e0';
        ctx.beginPath();
        ctx.moveTo(x + H, cy + 4);
        ctx.lineTo(x + T - 7, cy + 10);
        ctx.lineTo(x + T - 7, cy + H + 4);
        ctx.lineTo(x + H, cy + T - 5);
        ctx.lineTo(x + 7, cy + H + 4);
        ctx.lineTo(x + 7, cy + 10);
        ctx.closePath();
        ctx.fill();
        px(ctx, 'rgba(255,255,255,0.3)', x + H - 2, cy + 7, 4, 10);
        break;
      case C.I_SWORD:
        ctx.fillStyle = '#e63946';
        px(ctx, '#c0c0c0', x + H - 1, cy + 4, 2, 20);
        px(ctx, '#a0a0a0', x + H - 1, cy + 4, 2, 10);
        px(ctx, '#ffd700', x + H - 5, cy + 18, 10, 3);
        px(ctx, '#8b4513', x + H - 1, cy + 21, 2, 7);
        break;
    }
  }

  // ── EFFECTS ────────────────────────────────────────────────
  function drawSlash(ctx, x, y, dir, progress, isPower) {
    const cx = x + H;
    const cy = y + H;
    const alpha = Math.max(0.15, 1 - progress * 0.9);

    let startAngle = 0;
    if (dir === 'right') startAngle = -Math.PI * 0.55;
    else if (dir === 'left') startAngle = Math.PI * 0.45;
    else if (dir === 'up') startAngle = -Math.PI * 1.05;
    else startAngle = -Math.PI * 0.05;

    const sweep = Math.PI * 1.1;
    const curEnd = startAngle + sweep * Math.min(1, 0.45 + progress * 0.75);
    const radius = H + 3 + progress * 5;

    ctx.save();
    ctx.globalAlpha = alpha;
    // Wide sideways outer glow arc
    ctx.strokeStyle = isPower ? '#ff4422' : '#ffd700';
    ctx.lineWidth = Math.max(2, 8 - progress * 4);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, curEnd);
    ctx.stroke();

    // Bright white inner crescent
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 3.5 - progress * 2);
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, startAngle + 0.08, curEnd);
    ctx.stroke();

    // Secondary sideways speed trail
    ctx.strokeStyle = isPower ? '#ffaa44' : '#7dd3fc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 6, startAngle + 0.15, curEnd - 0.1);
    ctx.stroke();
    ctx.restore();
  }

  function drawClash(ctx, x, y, progress, isPower) {
    const cx = x + H;
    const cy = y + H;
    const alpha = Math.max(0, 1 - progress);
    const len = 10 + progress * 14;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Expanding shockwave ring
    ctx.strokeStyle = isPower ? '#ff5533' : '#ffd700';
    ctx.lineWidth = 2.5 - progress * 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 6 + progress * 16, 0, Math.PI * 2);
    ctx.stroke();

    // Sideways X-clash streaks (cross-slash impact)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3 - progress * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - len, cy - len * 0.55);
    ctx.lineTo(cx + len, cy + len * 0.55);
    ctx.moveTo(cx - len, cy + len * 0.55);
    ctx.lineTo(cx + len, cy - len * 0.55);
    ctx.stroke();

    // Gold core flare
    ctx.fillStyle = isPower ? '#ff4422' : '#ffd700';
    ctx.fillRect(cx - 3, cy - 3, 6, 6);
    ctx.restore();
  }

  function drawParticles(ctx, particles) {
    particles.forEach(pt => {
      const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x), Math.round(pt.y), pt.size, pt.size);
    });
    ctx.globalAlpha = 1;
  }

  function drawHitEffect(ctx, x, y, frame) {
    const alpha = 1 - frame / 6;
    ctx.fillStyle = `rgba(255,100,100,${alpha})`;
    ctx.font = `bold ${10 + frame}px 'Press Start 2P', monospace`;
    ctx.fillText('💥', x + H - 8, y + H - frame * 2);
  }

  function drawPickupEffect(ctx, x, y, text, frame, color = '#ffd700') {
    const alpha = Math.max(0, 1 - frame / 14);
    const fy = y - frame * 1.8;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `8px 'Press Start 2P', monospace`;
    ctx.fillStyle = '#000000';
    ctx.fillText(text, x + 1, fy + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, fy);
    ctx.restore();
  }

  // ── FOG OF WAR ─────────────────────────────────────────────
  function drawFogTile(ctx, x, y, explored, visible) {
    if (!explored) {
      ctx.fillStyle = 'rgba(0,0,0,0.98)';
      ctx.fillRect(x, y, T, T);
    } else if (!visible) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(x, y, T, T);
    }
  }

  return {
    drawWall, drawFloor, drawTorch, drawDoor, drawChest, drawSavePoint, drawLoreTablet,
    drawPlayer, drawSlime, drawSkeleton, drawGhost, drawBoss,
    drawItem, drawSlash, drawClash, drawParticles, drawHitEffect, drawPickupEffect, drawFogTile,
    drawEnemyHpBar,
  };
})();
