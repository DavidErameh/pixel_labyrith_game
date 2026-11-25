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

  // ── KNIGHT (Player class: knight) ─────────────────────────
  function drawKnight(ctx, x, y, dir, frame, shieldActive, attackProgress = 0, dashX = 0, dashY = 0, isRooted = false) {
    const f = frame % 4;
    const bobY = (f < 2) ? 0 : -1;
    const isAttacking = attackProgress > 0;
    const px0 = x + dashX;
    const py = y + bobY + dashY;

    // Shield aura glow (blue when active)
    if (shieldActive) {
      ctx.fillStyle = 'rgba(79,163,224,0.2)';
      ctx.beginPath();
      ctx.arc(px0 + H, py + H, H + 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Short red cape behind body
    px(ctx, '#8b1515', px0 + 9, py + 10, T - 18, 14);
    px(ctx, '#6b1010', px0 + 10, py + 20, T - 20, 6);

    // Plate body — steel grey
    px(ctx, '#5c6e7e', px0 + 7, py + 13, T - 14, T - 19);
    // Breastplate center stripe
    px(ctx, '#8ca0b0', px0 + H - 2, py + 14, 4, T - 22);
    // Pauldrons (shoulder plates)
    px(ctx, '#7a8fa6', px0 + 3, py + 13, 6, 7);
    px(ctx, '#7a8fa6', px0 + T - 9, py + 13, 6, 7);
    px(ctx, '#94a9bc', px0 + 4, py + 13, 4, 2);
    px(ctx, '#94a9bc', px0 + T - 8, py + 13, 4, 2);
    // Waist/belt
    px(ctx, '#ffd700', px0 + 7, py + 22, T - 14, 3);

    // Helm — full closed visor
    px(ctx, '#5c6e7e', px0 + 7, py + 2, T - 14, 13);
    // Visor slit
    px(ctx, '#94a9bc', px0 + 7, py + 2, T - 14, 3); // top highlight
    px(ctx, '#1a1a2e', px0 + 10, py + 7, T - 20, 3); // visor slit (dark)
    if (dir !== 'up') {
      px(ctx, '#ff6600', px0 + 11, py + 8, 4, 2); // eye glow left
      px(ctx, '#ff6600', px0 + T - 15, py + 8, 4, 2); // eye glow right
    }
    // Plume
    px(ctx, '#ffd700', px0 + H - 1, py + 1, 2, 4);
    px(ctx, '#ffaa00', px0 + H - 2, py - 2, 4, 4);

    // Grieves (leg armour)
    px(ctx, '#5c6e7e', px0 + 8, py + T - 10, 6, 10);
    px(ctx, '#5c6e7e', px0 + T - 14, py + T - 10, 6, 10);
    px(ctx, '#94a9bc', px0 + 9, py + T - 10, 4, 2);
    px(ctx, '#94a9bc', px0 + T - 13, py + T - 10, 4, 2);

    // Sticky web if rooted
    if (isRooted) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px0 + 5, py + T - 6);
      ctx.lineTo(px0 + T - 5, py + T - 2);
      ctx.moveTo(px0 + T - 5, py + T - 6);
      ctx.lineTo(px0 + 5, py + T - 2);
      ctx.stroke();
    }

    // ── Sword (right arm) ─────
    const bladeCol = '#d4e0eb';
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

      const swingAngle = baseAngle + (-0.65 + attackProgress * 1.3) * Math.PI * 0.65;
      ctx.translate(pivotX, pivotY);
      ctx.rotate(swingAngle);
      // Guard
      ctx.fillStyle = guardCol;
      ctx.fillRect(5, -5, 3, 10);
      // Blade
      ctx.fillStyle = bladeCol;
      ctx.fillRect(8, -2, 22, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(10, -1, 17, 1);
      ctx.restore();
    } else {
      if (dir === 'left') {
        px(ctx, bladeCol, px0 + 1, py + 8, 3, 18);
        px(ctx, guardCol, px0 - 1, py + 17, 7, 3);
      } else {
        px(ctx, bladeCol, px0 + T - 4, py + 8, 3, 18);
        px(ctx, guardCol, px0 + T - 6, py + 17, 7, 3);
      }
    }

    // ── Kite Shield (left arm) — always visible when active ──
    if (shieldActive) {
      const sx = dir === 'left' ? px0 + T - 9 : px0 + 1;
      const sy = py + 11;
      // Kite shape
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy);
      ctx.lineTo(sx + 8, sy + 3);
      ctx.lineTo(sx + 8, sy + 10);
      ctx.lineTo(sx + 4, sy + 14);
      ctx.lineTo(sx, sy + 10);
      ctx.lineTo(sx, sy + 3);
      ctx.closePath();
      ctx.fill();
      // Shield face
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(sx + 4, sy + 1);
      ctx.lineTo(sx + 7, sy + 3);
      ctx.lineTo(sx + 7, sy + 9);
      ctx.lineTo(sx + 4, sy + 13);
      ctx.lineTo(sx + 1, sy + 9);
      ctx.lineTo(sx + 1, sy + 3);
      ctx.closePath();
      ctx.fill();
      // Gold crest cross
      px(ctx, '#ffd700', sx + 3, sy + 3, 2, 8);
      px(ctx, '#ffd700', sx + 1, sy + 6, 6, 2);
    }
  }

  // ── WIZARD (Player class: wizard) ─────────────────────────
  function drawWizard(ctx, x, y, dir, frame, barrierActive, attackProgress = 0, dashX = 0, dashY = 0, isRooted = false, mp = 60, maxMp = 60) {
    const f = frame % 4;
    const bobY = (f < 2) ? 0 : -1;
    const px0 = x + dashX;
    const py = y + bobY + dashY;
    const isAttacking = attackProgress > 0;

    // Arcane barrier ring
    if (barrierActive) {
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.005);
      ctx.strokeStyle = `rgba(147,197,253,${0.6 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px0 + H, py + H, H + 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(219,234,254,${0.3 * pulse})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px0 + H, py + H, H + 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Robe — dark navy/purple, full length
    px(ctx, '#2d1b55', px0 + 7, py + 13, T - 14, T - 15);
    // Robe highlight
    px(ctx, '#3d2570', px0 + 8, py + 13, 4, T - 17);
    px(ctx, '#3d2570', px0 + T - 12, py + 13, 4, T - 17);
    // Robe hem decoration
    ctx.fillStyle = '#6d28d9';
    ctx.fillRect(px0 + 7, py + T - 6, T - 14, 2);
    // Belt / waist clasp
    px(ctx, '#ffd700', px0 + H - 4, py + 22, 8, 2);

    // Face / head — small beard
    px(ctx, '#c8a87e', px0 + 10, py + 7, T - 20, 9); // face
    if (dir !== 'up') {
      px(ctx, '#1a1a2e', px0 + 12, py + 9, 2, 2); // eyes
      px(ctx, '#1a1a2e', px0 + T - 14, py + 9, 2, 2);
    }
    px(ctx, '#e0e0e0', px0 + 10, py + 14, T - 20, 3); // white beard

    // Pointed wizard hat — deep purple, gold stars
    // Hat brim
    px(ctx, '#3d1f6e', px0 + 6, py + 6, T - 12, 3);
    // Hat cone
    ctx.fillStyle = '#3d1f6e';
    ctx.beginPath();
    ctx.moveTo(px0 + H, py - 5);
    ctx.lineTo(px0 + T - 8, py + 7);
    ctx.lineTo(px0 + 8, py + 7);
    ctx.closePath();
    ctx.fill();
    // Stars on hat
    px(ctx, '#ffd700', px0 + H - 1, py, 2, 2);
    px(ctx, '#ffd700', px0 + H + 3, py + 3, 1, 1);
    px(ctx, '#c084fc', px0 + H - 3, py + 3, 1, 1);

    // Sticky web if rooted
    if (isRooted) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px0 + 5, py + T - 6);
      ctx.lineTo(px0 + T - 5, py + T - 2);
      ctx.moveTo(px0 + T - 5, py + T - 6);
      ctx.lineTo(px0 + 5, py + T - 2);
      ctx.stroke();
    }

    // Staff (right hand)
    if (isAttacking) {
      // Staff thrust forward
      ctx.save();
      const pivotX = px0 + H;
      const pivotY = py + H;
      let baseAngle = dir === 'right' ? -0.3 : dir === 'left' ? Math.PI + 0.3 : dir === 'up' ? -Math.PI * 0.5 : Math.PI * 0.5;
      const swingAngle = baseAngle + (-0.4 + attackProgress * 0.8) * 0.4;
      ctx.translate(pivotX, pivotY);
      ctx.rotate(swingAngle);
      // Staff shaft
      ctx.fillStyle = '#5c3d1e';
      ctx.fillRect(4, -2, 24, 4);
      // Orb at tip — glowing orange
      const orbPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
      ctx.fillStyle = `rgba(255,100,0,${0.4 * orbPulse})`;
      ctx.beginPath();
      ctx.arc(28, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(28, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(27, -1, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Staff at rest
      const staffX = dir === 'left' ? px0 + 4 : px0 + T - 7;
      px(ctx, '#5c3d1e', staffX, py + 5, 3, T - 7);
      // Orb at top of staff
      const orbPulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.006);
      ctx.fillStyle = `rgba(255,100,0,${0.35 * orbPulse})`;
      ctx.beginPath();
      ctx.arc(staffX + 1, py + 4, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(staffX + 1, py + 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffcc00';
      ctx.beginPath();
      ctx.arc(staffX, py + 3, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Left hand ember glow (magic ready)
    const mpRatio = mp / maxMp;
    if (mpRatio > 0.1) {
      const handX = dir === 'left' ? px0 + T - 8 : px0 + 3;
      ctx.fillStyle = `rgba(255,100,0,${0.5 * mpRatio})`;
      ctx.beginPath();
      ctx.arc(handX, py + 18, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff8c00';
      ctx.beginPath();
      ctx.arc(handX, py + 18, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Keep old drawPlayer for fallback / generic reference
  function drawPlayer(ctx, x, y, dir, frame, shieldActive, attackProgress = 0, dashX = 0, dashY = 0, isRooted = false) {
    drawKnight(ctx, x, y, dir, frame, shieldActive, attackProgress, dashX, dashY, isRooted);
  }

  // ── PREVIEW sprites for class select screen ───────────────
  function drawKnightPreview(ctx, x, y, frame) {
    const f = frame % 4;
    const bob = f < 2 ? 0 : -1;
    // Cape
    px(ctx, '#8b1515', x + 10, y + 14 + bob, 12, 16);
    // Body
    px(ctx, '#5c6e7e', x + 9, y + 15 + bob, 14, 16);
    px(ctx, '#8ca0b0', x + H, y + 15 + bob, 4, 14);
    // Helm
    px(ctx, '#5c6e7e', x + 9, y + 4 + bob, 14, 13);
    px(ctx, '#94a9bc', x + 9, y + 4 + bob, 14, 3);
    px(ctx, '#1a1a2e', x + 12, y + 9 + bob, 8, 3);
    px(ctx, '#ff6600', x + 13, y + 10 + bob, 3, 1);
    px(ctx, '#ff6600', x + 17, y + 10 + bob, 3, 1);
    // Plume
    px(ctx, '#ffd700', x + H - 1, y + 2 + bob, 2, 3);
    // Shield
    px(ctx, '#1e3a8a', x + 3, y + 15 + bob, 7, 11);
    px(ctx, '#3b82f6', x + 4, y + 16 + bob, 5, 9);
    px(ctx, '#ffd700', x + 6, y + 16 + bob, 1, 7);
    px(ctx, '#ffd700', x + 4, y + 19 + bob, 5, 1);
    // Sword
    px(ctx, '#d4e0eb', x + 24, y + 10 + bob, 3, 16);
    px(ctx, '#ffd700', x + 22, y + 19 + bob, 7, 2);
  }

  function drawWizardPreview(ctx, x, y, frame) {
    const f = frame % 4;
    const bob = f < 2 ? 0 : -1;
    // Robe
    px(ctx, '#2d1b55', x + 9, y + 15 + bob, 14, 17);
    px(ctx, '#3d2570', x + 10, y + 15 + bob, 4, 15);
    // Face
    px(ctx, '#c8a87e', x + 11, y + 9 + bob, 10, 8);
    px(ctx, '#e0e0e0', x + 11, y + 15 + bob, 10, 2); // beard
    // Hat
    ctx.fillStyle = '#3d1f6e';
    ctx.beginPath();
    ctx.moveTo(x + H, y - 2 + bob);
    ctx.lineTo(x + 22, y + 9 + bob);
    ctx.lineTo(x + 10, y + 9 + bob);
    ctx.closePath();
    ctx.fill();
    px(ctx, '#3d1f6e', x + 8, y + 7 + bob, 16, 3);
    px(ctx, '#ffd700', x + H - 1, y + 2 + bob, 2, 2);
    // Staff
    px(ctx, '#5c3d1e', x + 24, y + 7 + bob, 3, 20);
    // Orb
    ctx.fillStyle = 'rgba(255,100,0,0.4)';
    ctx.beginPath();
    ctx.arc(x + 25, y + 6 + bob, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(x + 25, y + 6 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.arc(x + 24, y + 5 + bob, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Hand glow
    ctx.fillStyle = 'rgba(255,100,0,0.5)';
    ctx.beginPath();
    ctx.arc(x + 8, y + 20 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSlime(ctx, x, y, frame, hp, maxHp, dashX = 0, dashY = 0) {
    const f = frame % 8;
    const sx = x + dashX;
    const sy = y + dashY;
    const wave = Math.sin((f / 8) * Math.PI * 2);
    const squish = wave * 2.5;

    // Crawling blob shadow / pseudopod base
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(sx + H, sy + T - 6, H - 3 + squish * 0.6, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main light-blue blob body
    ctx.fillStyle = '#5ce1e6';
    ctx.beginPath();
    ctx.ellipse(sx + H, sy + H + 3 + squish * 0.4, H - 4 + squish * 0.5, H - 5 - squish * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crawling side lobes
    px(ctx, '#38bdf8', sx + 5 + Math.round(wave), sy + T - 11, 5, 5);
    px(ctx, '#38bdf8', sx + T - 10 - Math.round(wave), sy + T - 11, 5, 5);

    // Eyes
    px(ctx, '#fff', sx + H - 6, sy + H - 1, 4, 4);
    px(ctx, '#fff', sx + H + 2, sy + H - 1, 4, 4);
    px(ctx, '#0f172a', sx + H - 5, sy + H, 2, 2);
    px(ctx, '#0f172a', sx + H + 3, sy + H, 2, 2);

    // Glossy highlight
    px(ctx, '#cffafe', sx + H - 4, sy + H - 5, 5, 2);
    drawEnemyHpBar(ctx, sx, sy, hp, maxHp);
  }

  function drawSkeleton(ctx, x, y, frame, hp, maxHp, dashX = 0, dashY = 0) {
    const f = frame % 4;
    const walkOff = (f < 2) ? 0 : 1;
    const sx = x + dashX, sy = y + dashY;
    // Skull
    px(ctx, '#e0d8c8', sx + 9, sy + 2, T - 18, 12);
    // Eye sockets
    px(ctx, '#1a1a2e', sx + 11, sy + 5, 4, 4);
    px(ctx, '#1a1a2e', sx + T - 15, sy + 5, 4, 4);
    // Jaw
    px(ctx, '#c8c0b0', sx + 10, sy + 12, T - 20, 4);
    // Ribcage
    px(ctx, '#d8d0c0', sx + 10, sy + 16, T - 20, 10);
    for (let i = 0; i < 3; i++) {
      px(ctx, '#1a1a28', sx + 12, sy + 17 + i * 3, T - 24, 2);
    }
    // Arms
    px(ctx, '#d8d0c0', sx + 4, sy + 16, 6, 12 + walkOff);
    px(ctx, '#d8d0c0', sx + T - 10, sy + 16, 6, 12 - walkOff);
    // Legs
    px(ctx, '#d8d0c0', sx + 9, sy + 26, 5, 6 - walkOff);
    px(ctx, '#d8d0c0', sx + T - 14, sy + 26, 5, 6 + walkOff);
    drawEnemyHpBar(ctx, sx, sy, hp, maxHp);
  }

  function drawArmoredSkeleton(ctx, x, y, frame, hp, maxHp, dashX = 0, dashY = 0) {
    const f = frame % 4;
    const walkOff = (f < 2) ? 0 : 1;
    const sx = x + dashX, sy = y + dashY;

    // Steel helmet + visor
    px(ctx, '#64748b', sx + 7, sy + 1, T - 14, 13);
    px(ctx, '#94a3b8', sx + 8, sy + 1, T - 16, 4);
    // Glowing red eye slits
    px(ctx, '#ef4444', sx + 10, sy + 6, 4, 3);
    px(ctx, '#ef4444', sx + T - 14, sy + 6, 4, 3);
    // Plate chestplate
    px(ctx, '#475569', sx + 7, sy + 14, T - 14, 12);
    px(ctx, '#cbd5e1', sx + 9, sy + 15, T - 18, 2);
    // Pauldrons
    px(ctx, '#94a3b8', sx + 4, sy + 14, 5, 6);
    px(ctx, '#94a3b8', sx + T - 9, sy + 14, 5, 6);
    // Greaves
    px(ctx, '#64748b', sx + 9, sy + 26, 5, 6 - walkOff);
    px(ctx, '#64748b', sx + T - 14, sy + 26, 5, 6 + walkOff);
    // Longsword
    px(ctx, '#e2e8f0', sx + T - 4, sy + 2, 3, 22);
    px(ctx, '#ffd700', sx + T - 7, sy + 18, 9, 3);
    drawEnemyHpBar(ctx, sx, sy - 2, hp, maxHp, true);
  }

  function drawSpider(ctx, x, y, frame, hp, maxHp, isStunned = false, dashX = 0, dashY = 0) {
    const f = frame % 4;
    const legBob = (f < 2) ? 2 : -2;
    const sx = x + dashX, sy = y + dashY;

    // 8 animated legs
    ctx.strokeStyle = '#3b0764';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const ly = sy + 9 + i * 4;
      const offset = (i % 2 === 0 ? legBob : -legBob);
      ctx.beginPath();
      ctx.moveTo(sx + 10, ly);
      ctx.lineTo(sx + 2, ly - 2 + offset);
      ctx.moveTo(sx + T - 10, ly);
      ctx.lineTo(sx + T - 2, ly - 2 - offset);
      ctx.stroke();
    }

    // Abdomen & head
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.ellipse(sx + H, sy + 12, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7e22ce';
    ctx.beginPath();
    ctx.ellipse(sx + H, sy + 21, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (yellow when stunned, glowing green/red otherwise)
    const eyeCol = isStunned ? '#facc15' : '#4ade80';
    px(ctx, eyeCol, sx + H - 5, sy + 20, 3, 3);
    px(ctx, eyeCol, sx + H + 2, sy + 20, 3, 3);
    px(ctx, '#ef4444', sx + H - 2, sy + 18, 2, 2);
    px(ctx, '#ef4444', sx + H + 1, sy + 18, 2, 2);

    // Fangs
    px(ctx, '#f8fafc', sx + H - 4, sy + 26, 2, 3);
    px(ctx, '#f8fafc', sx + H + 2, sy + 26, 2, 3);

    drawEnemyHpBar(ctx, sx, sy - 2, hp, maxHp, true);
  }

  function drawProjectile(ctx, x, y, type, frame) {
    const pulse = Math.sin(frame * 0.5) * 1.5;
    if (type === 'web') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 6); ctx.lineTo(x + 6, y + 6);
      ctx.moveTo(x + 6, y - 6); ctx.lineTo(x - 6, y + 6);
      ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
      ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x, y, 4 + pulse * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'poison') {
      // Green poison bullet
      ctx.fillStyle = 'rgba(34, 197, 94, 0.35)';
      ctx.beginPath();
      ctx.arc(x, y, 8 + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#bbf7d0';
      ctx.fillRect(x - 2, y - 2, 2, 2);
    } else if (type === 'fireball') {
      // Orange/red fireball with glow
      const glow = ctx.createRadialGradient(x, y, 1, x, y, 10 + pulse);
      glow.addColorStop(0, 'rgba(255,180,0,0.8)');
      glow.addColorStop(0.4, 'rgba(255,80,0,0.5)');
      glow.addColorStop(1, 'rgba(255,30,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 10 + pulse, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = '#ff8c00';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7a0';
      ctx.beginPath();
      ctx.arc(x - 1, y - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'fireburst_ring') {
      // Fire burst AOE ring (expanding)
      ctx.strokeStyle = `rgba(255,120,0,${0.8 - pulse * 0.1})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 20 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,220,0,${0.5 - pulse * 0.05})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 12 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
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
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(x + H, cy + 10, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a28';
        ctx.beginPath();
        ctx.arc(x + H, cy + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        px(ctx, '#ffd700', x + H, cy + 16, 3, 10);
        px(ctx, '#ffd700', x + H + 3, cy + 22, 4, 2);
        px(ctx, '#ffd700', x + H + 3, cy + 25, 3, 2);
        break;

      case C.I_POTION: {
        // Small red potion bottle (+2 HP)
        const glowAlpha = 0.18 + 0.12 * Math.sin(f / 8 * Math.PI * 2);
        // Glow
        ctx.save();
        ctx.globalAlpha = glowAlpha;
        ctx.fillStyle = '#ff4466';
        ctx.beginPath();
        ctx.arc(x + H, cy + H, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Bottle body
        ctx.fillStyle = '#cc2244';
        ctx.beginPath();
        ctx.arc(x + H, cy + 20, 7, 0, Math.PI * 2);
        ctx.fill();
        // Bottle neck
        px(ctx, '#cc2244', x + H - 2, cy + 11, 4, 5);
        // Cork
        px(ctx, '#c4a265', x + H - 2, cy + 9, 5, 3);
        // Shine
        ctx.fillStyle = 'rgba(255,180,200,0.55)';
        ctx.beginPath();
        ctx.arc(x + H - 2, cy + 18, 3, 0, Math.PI * 2);
        ctx.fill();
        // Label "+2"
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 6px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+2', x + H, cy + 22);
        break;
      }

      case C.I_POTION_LARGE: {
        // Large purple/gold potion bottle (+5 HP)
        const glowL = 0.20 + 0.14 * Math.sin(f / 8 * Math.PI * 2);
        // Outer glow
        ctx.save();
        ctx.globalAlpha = glowL;
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.arc(x + H, cy + H, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        // Bottle body (wider)
        ctx.fillStyle = '#7c3aed';
        ctx.beginPath();
        ctx.arc(x + H, cy + 20, 9, 0, Math.PI * 2);
        ctx.fill();
        // Neck
        px(ctx, '#7c3aed', x + H - 3, cy + 9, 6, 7);
        // Cork with wax seal
        px(ctx, '#c4a265', x + H - 3, cy + 7, 7, 3);
        px(ctx, '#ff8800', x + H - 1, cy + 6, 3, 2);
        // Shine
        ctx.fillStyle = 'rgba(230,180,255,0.55)';
        ctx.beginPath();
        ctx.arc(x + H - 3, cy + 17, 4, 0, Math.PI * 2);
        ctx.fill();
        // Label "+5"
        ctx.fillStyle = '#ffe4a0';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('+5', x + H, cy + 23);
        break;
      }
    }
  }

  // ── EFFECTS ────────────────────────────────────────────────
  function drawSlash(ctx, x, y, dir, progress, isPower, isFireSlash = false) {
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

    if (isFireSlash) {
      // Fire burst arc — orange/red
      ctx.strokeStyle = `rgba(255,120,0,${alpha})`;
      ctx.lineWidth = Math.max(2, 10 - progress * 5);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = Math.max(1, 4 - progress * 2);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
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
    }
    ctx.restore();
  }

  function drawClash(ctx, x, y, progress, isPower, isFireClash = false) {
    const cx = x + H;
    const cy = y + H;
    const alpha = Math.max(0, 1 - progress);
    const len = 10 + progress * 14;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (isFireClash) {
      // Fire explosion burst
      ctx.strokeStyle = `rgba(255,160,0,${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 8 + progress * 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + progress * 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,100,0,0.6)';
      ctx.fillRect(cx - 4, cy - 4, 8, 8);
    } else {
      // Expanding shockwave ring
      ctx.strokeStyle = isPower ? '#ff5533' : '#ffd700';
      ctx.lineWidth = 2.5 - progress * 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 6 + progress * 16, 0, Math.PI * 2);
      ctx.stroke();

      // Sideways X-clash streaks
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3 - progress * 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - len, cy - len * 0.55);
      ctx.lineTo(cx + len, cy + len * 0.55);
      ctx.moveTo(cx - len, cy + len * 0.55);
      ctx.lineTo(cx + len, cy - len * 0.55);
      ctx.stroke();

      ctx.fillStyle = isPower ? '#ff4422' : '#ffd700';
      ctx.fillRect(cx - 3, cy - 3, 6, 6);
    }
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
    drawPlayer, drawKnight, drawWizard, drawKnightPreview, drawWizardPreview,
    drawSlime, drawSkeleton, drawArmoredSkeleton, drawSpider, drawGhost, drawBoss,
    drawItem, drawProjectile, drawSlash, drawClash, drawParticles, drawHitEffect, drawPickupEffect, drawFogTile,
    drawEnemyHpBar,
  };
})();
