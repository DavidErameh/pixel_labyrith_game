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
    // Fast layered glow circles (no per-frame gradient allocation)
    ctx.fillStyle = 'rgba(255,140,0,0.10)';
    ctx.beginPath(); ctx.arc(x + H, y + H, T * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,160,40,0.16)';
    ctx.beginPath(); ctx.arc(x + H, y + H, T * 0.45, 0, Math.PI * 2); ctx.fill();
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
    // Fast arcane aura
    ctx.fillStyle = `rgba(155, 93, 229, ${0.22 * pulse})`;
    ctx.beginPath(); ctx.arc(x + H, y + H, T * 0.65, 0, Math.PI * 2); ctx.fill();

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

  // ── ENTITIES ───────────────────────────────────────────────

  // ── KNIGHT (Player class: knight) ─────────────────────────
  function drawKnight(ctx, x, y, dir, frame, shieldActive, attackProgress = 0, dashX = 0, dashY = 0, isRooted = false, flameSwordActive = false, walkPhase = 0) {
    const f = frame % 4;
    const isWalking = walkPhase !== 0;
    const stride = isWalking ? Math.sin(walkPhase) : 0;
    const bobY = isWalking ? -Math.abs(stride) * 1.5 : (f < 2 ? 0 : -0.5);
    const isAttacking = attackProgress > 0;
    const px0 = x + dashX;
    const py = y + bobY + dashY;

    // Shield aura glow (blue when active)
    if (shieldActive) {
      ctx.fillStyle = 'rgba(79,163,224,0.22)';
      ctx.beginPath();
      ctx.arc(px0 + H, py + H, H + 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Animated crimson cape behind body
    const capeWave = (f % 2 === 0) ? 0 : 1;
    px(ctx, '#6b1010', px0 + 8 - capeWave, py + 10, T - 16 + capeWave * 2, 15);
    px(ctx, '#4e0a0a', px0 + 9, py + 22, 4, 5 + capeWave);
    px(ctx, '#4e0a0a', px0 + T - 13, py + 22, 4, 5 - capeWave);

    // Plate body — bright silver-grey
    px(ctx, '#c4cdd8', px0 + 7, py + 13, T - 14, T - 19);
    // Breastplate highlight & central ridge
    px(ctx, '#e2e8f0', px0 + 9, py + 14, T - 18, 6);
    px(ctx, '#f8fafc', px0 + H - 1, py + 14, 2, 8);
    // Gorget (neck plate)
    px(ctx, '#8b95a5', px0 + 9, py + 12, T - 18, 2);
    // Layered pauldrons with rivets
    px(ctx, '#c4cdd8', px0 + 3, py + 13, 6, 7);
    px(ctx, '#c4cdd8', px0 + T - 9, py + 13, 6, 7);
    px(ctx, '#e2e8f0', px0 + 4, py + 13, 4, 2);
    px(ctx, '#e2e8f0', px0 + T - 8, py + 13, 4, 2);
    px(ctx, '#f8fafc', px0 + 5, py + 17, 1, 1);
    px(ctx, '#f8fafc', px0 + T - 6, py + 17, 1, 1);
    // Articulated gauntlets
    px(ctx, '#8b95a5', px0 + 4, py + 20, 4, 3);
    px(ctx, '#8b95a5', px0 + T - 8, py + 20, 4, 3);
    // Segmented fauld & waist belt
    px(ctx, '#8b95a5', px0 + 7, py + 21, T - 14, 2);
    px(ctx, '#ffd700', px0 + H - 2, py + 21, 4, 2); // belt buckle
    px(ctx, '#c4cdd8', px0 + 8, py + 23, T - 16, 2);

    // Helm — rounded light silver-grey closed visor (NO EYES VISIBLE)
    px(ctx, '#c4cdd8', px0 + 8, py + 2, T - 16, 12);
    px(ctx, '#e2e8f0', px0 + 9, py + 1, T - 18, 4); // rounded crown highlight
    px(ctx, '#8b95a5', px0 + 7, py + 5, T - 14, 8);  // lower visor shadow
    px(ctx, '#c4cdd8', px0 + 8, py + 5, T - 16, 6);
    // Pure dark visor slit (no red eyes)
    px(ctx, '#1a1a2e', px0 + 10, py + 7, T - 20, 3);
    // Nasal guard
    px(ctx, '#e2e8f0', px0 + H - 1, py + 5, 2, 6);
    // Helm rivets
    px(ctx, '#f8fafc', px0 + 9, py + 6, 1, 1);
    px(ctx, '#f8fafc', px0 + T - 10, py + 6, 1, 1);
    // Plume
    px(ctx, '#b91c1c', px0 + H - 1, py - 2, 3, 4);
    px(ctx, '#ffd700', px0 + H - 1, py + 0, 2, 2);

    // Greaves (leg armour) — smooth alternating stride
    const sideWalk = (dir === 'left' || dir === 'right') ? Math.round(stride * 2.5) : 0;
    const liftL = Math.max(0, stride) * 3;
    const liftR = Math.max(0, -stride) * 3;
    const lx = px0 + 8 + sideWalk;
    const rx = px0 + T - 14 - sideWalk;
    px(ctx, '#8b95a5', lx, py + T - 9 - liftL, 6, 7);
    px(ctx, '#e2e8f0', lx + 1, py + T - 9 - liftL, 4, 3);
    px(ctx, '#475569', lx, py + T - 3 - liftL, 6, 3); // left boot
    px(ctx, '#8b95a5', rx, py + T - 9 - liftR, 6, 7);
    px(ctx, '#e2e8f0', rx + 1, py + T - 9 - liftR, 4, 3);
    px(ctx, '#475569', rx, py + T - 3 - liftR, 6, 3); // right boot

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

    // ── Redesigned Broadsword (right arm) ─────
    const bladeCol = flameSwordActive ? '#ff8c00' : '#cbd5e1';
    const edgeCol  = flameSwordActive ? '#fef08a' : '#ffffff';
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
      // Pommel & grip
      ctx.fillStyle = guardCol;
      ctx.fillRect(1, -2, 3, 4);
      ctx.fillStyle = '#5c3d1e';
      ctx.fillRect(3, -1, 3, 2);
      // Crossguard with gem
      ctx.fillStyle = guardCol;
      ctx.fillRect(6, -6, 3, 12);
      ctx.fillStyle = flameSwordActive ? '#ff4400' : '#ef4444';
      ctx.fillRect(6, -1, 3, 2);
      // Wider blade (5px) with fuller ridge
      ctx.fillStyle = bladeCol;
      ctx.fillRect(9, -2.5, 22, 5);
      ctx.fillStyle = edgeCol;
      ctx.fillRect(10, -0.5, 19, 1); // central ridge
      // Flame overlay
      if (flameSwordActive) {
        ctx.fillStyle = 'rgba(255, 100, 0, 0.55)';
        ctx.fillRect(9, -5, 24, 10);
      }
      ctx.restore();
    } else {
      const sx = dir === 'left' ? px0 - 1 : px0 + T - 4;
      // Blade (5px wide)
      px(ctx, bladeCol, sx, py + 6, 5, 19);
      px(ctx, edgeCol, sx + 2, py + 7, 1, 16); // fuller
      // Crossguard & gem
      px(ctx, guardCol, sx - 2, py + 19, 9, 3);
      px(ctx, flameSwordActive ? '#ff4400' : '#ef4444', sx + 2, py + 19, 1, 3);
      // Pommel
      px(ctx, guardCol, sx + 1, py + 24, 3, 2);
      if (flameSwordActive) {
        const fl = (f % 2 === 0) ? 1 : -1;
        ctx.fillStyle = 'rgba(255, 120, 0, 0.65)';
        ctx.fillRect(sx - 1, py + 4 + fl, 7, 16);
        px(ctx, '#fde047', sx + 1, py + 3 - fl, 3, 4);
      }
    }

    // ── Kite Shield (left arm) — always visible when active ──
    if (shieldActive) {
      const sx = dir === 'left' ? px0 + T - 9 : px0 + 1;
      const sy = py + 11;
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
      px(ctx, '#ffd700', sx + 3, sy + 3, 2, 8);
      px(ctx, '#ffd700', sx + 1, sy + 6, 6, 2);
    }
  }

  // ── WIZARD (Player class: wizard) ─────────────────────────
  function drawWizard(ctx, x, y, dir, frame, barrierActive, attackProgress = 0, dashX = 0, dashY = 0, isRooted = false, mp = 60, maxMp = 60, walkPhase = 0) {
    const f = frame % 4;
    const isWalking = walkPhase !== 0;
    const stride = isWalking ? Math.sin(walkPhase) : 0;
    const bobY = isWalking ? -Math.abs(stride) * 1.4 : (f < 2 ? 0 : -0.5);
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

    // Boots peeking & stepping smoothly under dark grey robe hem
    const wizSide = (dir === 'left' || dir === 'right') ? Math.round(stride * 2.2) : 0;
    const wizLiftL = Math.max(0, stride) * 2.5;
    const wizLiftR = Math.max(0, -stride) * 2.5;
    px(ctx, '#111827', px0 + 9 + wizSide, py + T - 4 - wizLiftL, 5, 4);
    px(ctx, '#374151', px0 + 9 + wizSide, py + T - 4 - wizLiftL, 5, 2);
    px(ctx, '#111827', px0 + T - 14 - wizSide, py + T - 4 - wizLiftR, 5, 4);
    px(ctx, '#374151', px0 + T - 14 - wizSide, py + T - 4 - wizLiftR, 5, 2);

    // Dark Grey Cloak & Layered Flowing Robe (realistic silhouette & shading)
    px(ctx, '#1f2937', px0 + 6, py + 12, T - 12, T - 14);      // outer dark grey robe
    px(ctx, '#111827', px0 + 11, py + 14, T - 22, T - 16);     // deep inner shadow
    px(ctx, '#374151', px0 + 7, py + 13, 5, T - 16);           // left robe fold highlight
    px(ctx, '#374151', px0 + T - 12, py + 13, 5, T - 16);      // right robe fold highlight
    // Shoulder mantle / draped sleeves
    px(ctx, '#4b5563', px0 + 5, py + 12, T - 10, 4);
    px(ctx, '#374151', px0 + 4, py + 15, 4, 7);
    px(ctx, '#374151', px0 + T - 8, py + 15, 4, 7);
    // Slate-silver hem & arcane trim
    px(ctx, '#64748b', px0 + 6, py + T - 5, T - 12, 2);
    px(ctx, '#94a3b8', px0 + H - 4, py + 21, 8, 2);            // belt
    px(ctx, '#e2e8f0', px0 + H - 1, py + 21, 2, 2);            // silver clasp

    // Deep Dark Grey Hood & Shadowed Face
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.moveTo(px0 + H, py - 3);       // draped hood apex
    ctx.lineTo(px0 + T - 6, py + 12);  // right hood shoulder
    ctx.lineTo(px0 + 6, py + 12);      // left hood shoulder
    ctx.closePath();
    ctx.fill();
    px(ctx, '#374151', px0 + 9, py + 2, T - 18, 4);            // hood crown fold
    px(ctx, '#4b5563', px0 + 7, py + 10, T - 14, 3);           // hood rim
    // Shadowed face cavity + glowing arcane eyes
    px(ctx, '#090d16', px0 + 10, py + 5, T - 20, 7);
    if (dir !== 'up') {
      px(ctx, '#f59e0b', px0 + 12, py + 8, 2, 2);
      px(ctx, '#f59e0b', px0 + T - 14, py + 8, 2, 2);
    }

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

    // Staff (right hand) — twisted wood grain & larger orb with inner flame
    if (isAttacking) {
      ctx.save();
      const pivotX = px0 + H;
      const pivotY = py + H;
      let baseAngle = dir === 'right' ? -0.3 : dir === 'left' ? Math.PI + 0.3 : dir === 'up' ? -Math.PI * 0.5 : Math.PI * 0.5;
      const swingAngle = baseAngle + (-0.4 + attackProgress * 0.8) * 0.4;
      ctx.translate(pivotX, pivotY);
      ctx.rotate(swingAngle);
      ctx.fillStyle = '#5c3d1e';
      ctx.fillRect(4, -2, 24, 4);
      ctx.fillStyle = '#7c532a';
      ctx.fillRect(8, -1, 4, 2);
      ctx.fillRect(16, -2, 4, 2);
      const orbPulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
      ctx.fillStyle = `rgba(255,100,0,${0.45 * orbPulse})`;
      ctx.beginPath();
      ctx.arc(28, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(28, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(28, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      const staffX = dir === 'left' ? px0 + 4 : px0 + T - 7;
      px(ctx, '#5c3d1e', staffX, py + 5, 3, T - 7);
      px(ctx, '#7c532a', staffX, py + 10, 2, 3);
      px(ctx, '#7c532a', staffX + 1, py + 17, 2, 3);
      const orbPulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.006);
      ctx.fillStyle = `rgba(255,100,0,${0.4 * orbPulse})`;
      ctx.beginPath();
      ctx.arc(staffX + 1, py + 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(staffX + 1, py + 4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(staffX + 1, py + 4, 2, 0, Math.PI * 2);
      ctx.fill();
    }

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

  function drawPlayer(ctx, x, y, dir, frame, shieldActive, attackProgress = 0, dashX = 0, dashY = 0, isRooted = false, flameSwordActive = false) {
    drawKnight(ctx, x, y, dir, frame, shieldActive, attackProgress, dashX, dashY, isRooted, flameSwordActive);
  }

  // ── PREVIEW sprites for class select screen ───────────────
  function drawKnightPreview(ctx, x, y, frame) {
    const f = frame % 4;
    const bob = f < 2 ? 0 : -1;
    // Cape
    px(ctx, '#6b1010', x + 9, y + 14 + bob, 14, 16);
    // Silver Body
    px(ctx, '#c4cdd8', x + 9, y + 15 + bob, 14, 15);
    px(ctx, '#e2e8f0', x + H - 1, y + 15 + bob, 3, 12);
    // Helm (no eyes)
    px(ctx, '#c4cdd8', x + 9, y + 4 + bob, 14, 12);
    px(ctx, '#e2e8f0', x + 10, y + 3 + bob, 12, 3);
    px(ctx, '#1a1a2e', x + 11, y + 9 + bob, 10, 3);
    px(ctx, '#e2e8f0', x + H - 1, y + 7 + bob, 2, 5);
    // Plume
    px(ctx, '#b91c1c', x + H - 1, y + 0 + bob, 3, 4);
    // Shield
    px(ctx, '#1e3a8a', x + 3, y + 15 + bob, 7, 11);
    px(ctx, '#3b82f6', x + 4, y + 16 + bob, 5, 9);
    px(ctx, '#ffd700', x + 6, y + 16 + bob, 1, 7);
    px(ctx, '#ffd700', x + 4, y + 19 + bob, 5, 1);
    // Broadsword
    px(ctx, '#cbd5e1', x + 23, y + 8 + bob, 5, 18);
    px(ctx, '#ffffff', x + 25, y + 9 + bob, 1, 15);
    px(ctx, '#ffd700', x + 21, y + 20 + bob, 9, 2);
  }

  function drawWizardPreview(ctx, x, y, frame) {
    const f = frame % 4;
    const bob = f < 2 ? 0 : -1;
    // Dark grey layered hooded robe
    px(ctx, '#1f2937', x + 7, y + 13 + bob, 18, 18);
    px(ctx, '#111827', x + 12, y + 15 + bob, 8, 15);
    px(ctx, '#374151', x + 8, y + 14 + bob, 4, 15);
    px(ctx, '#374151', x + 20, y + 14 + bob, 4, 15);
    px(ctx, '#4b5563', x + 6, y + 13 + bob, 20, 4);
    px(ctx, '#94a3b8', x + 12, y + 22 + bob, 8, 2);
    // Deep dark grey hood + shadowed face + glowing amber eyes
    ctx.fillStyle = '#1f2937';
    ctx.beginPath();
    ctx.moveTo(x + H, y - 1 + bob);
    ctx.lineTo(x + 25, y + 13 + bob);
    ctx.lineTo(x + 7, y + 13 + bob);
    ctx.closePath();
    ctx.fill();
    px(ctx, '#374151', x + 10, y + 3 + bob, 12, 4);
    px(ctx, '#090d16', x + 11, y + 7 + bob, 10, 6);
    px(ctx, '#f59e0b', x + 12, y + 9 + bob, 2, 2);
    px(ctx, '#f59e0b', x + 18, y + 9 + bob, 2, 2);
    // Staff + flame orb
    px(ctx, '#5c3d1e', x + 25, y + 6 + bob, 3, 21);
    ctx.fillStyle = 'rgba(255,100,0,0.4)';
    ctx.beginPath();
    ctx.arc(x + 26, y + 5 + bob, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(x + 26, y + 5 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x + 26, y + 5 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
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

    // Puddle shadow
    ctx.fillStyle = 'rgba(2, 132, 199, 0.55)';
    ctx.beginPath();
    ctx.ellipse(sx + H, sy + T - 5, H - 2 + squish * 0.7, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Translucent gel body with radial gradient
    ctx.save();
    ctx.globalAlpha = 0.85;
    const grd = ctx.createRadialGradient(sx + H - 2, sy + H, 2, sx + H, sy + H + 3, H - 1);
    grd.addColorStop(0, '#7ceff2');
    grd.addColorStop(0.65, '#5ce1e6');
    grd.addColorStop(1, '#2fb8bd');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(sx + H, sy + H + 3 + squish * 0.4, H - 3 + squish * 0.5, H - 5 - squish * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dripping underside teardrops
    ctx.fillStyle = '#2fb8bd';
    ctx.fillRect(sx + 8, sy + T - 6 + Math.round(wave), 2, 3);
    ctx.fillRect(sx + T - 10, sy + T - 6 - Math.round(wave), 2, 3);
    ctx.fillRect(sx + H, sy + T - 5, 2, 3);

    // Internal bubbles
    ctx.fillStyle = '#cffafe';
    ctx.beginPath();
    ctx.arc(sx + H - 5, sy + H + 5 - wave, 2, 0, Math.PI * 2);
    ctx.arc(sx + H + 5, sy + H + 2 + wave, 1.5, 0, Math.PI * 2);
    ctx.arc(sx + H + 1, sy + H + 7, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eyes
    px(ctx, '#fff', sx + H - 6, sy + H - 2, 4, 4);
    px(ctx, '#fff', sx + H + 2, sy + H - 2, 4, 4);
    px(ctx, '#0f172a', sx + H - 5, sy + H - 1, 2, 2);
    px(ctx, '#0f172a', sx + H + 3, sy + H - 1, 2, 2);

    // Angry jagged mouth slit
    px(ctx, '#0f172a', sx + H - 4, sy + H + 4, 8, 2);
    px(ctx, '#0f172a', sx + H - 2, sy + H + 3, 2, 1);
    px(ctx, '#0f172a', sx + H + 1, sy + H + 3, 2, 1);

    // Glossy highlight
    px(ctx, '#ecfeff', sx + H - 5, sy + H - 6, 5, 2);
    drawEnemyHpBar(ctx, sx, sy, hp, maxHp);
  }

  // Helper: gold bird/raven sigil on purple robe
  function _drawBirdSigil(ctx, cx, cy, scale = 1) {
    ctx.fillStyle = '#ffd700';
    // Body + head
    ctx.fillRect(cx - 1 * scale, cy - 2 * scale, 2 * scale, 5 * scale);
    // Outstretched wings
    ctx.fillRect(cx - 4 * scale, cy - 1 * scale, 3 * scale, 2 * scale);
    ctx.fillRect(cx + 1 * scale, cy - 1 * scale, 3 * scale, 2 * scale);
    ctx.fillRect(cx - 5 * scale, cy - 2 * scale, 2 * scale, 1 * scale);
    ctx.fillRect(cx + 3 * scale, cy - 2 * scale, 2 * scale, 1 * scale);
    // Tail feathers
    ctx.fillRect(cx - 2 * scale, cy + 3 * scale, 4 * scale, 1 * scale);
  }

  function drawBlackKnight(ctx, x, y, frame, hp, maxHp, dashX = 0, dashY = 0, walkPhase = 0) {
    const stride = walkPhase !== 0 ? Math.sin(walkPhase) : 0;
    const bobY = walkPhase !== 0 ? -Math.abs(stride) * 1.2 : 0;
    const liftL = Math.max(0, stride) * 3;
    const liftR = Math.max(0, -stride) * 3;
    const sx = x + dashX, sy = y + bobY + dashY;

    // Purple cape behind shoulders
    px(ctx, '#3b0764', sx + 7, sy + 11, T - 14, 14);

    // Silver Knight Helm (same style as player Knight, dark visor)
    px(ctx, '#c4cdd8', sx + 8, sy + 2, T - 16, 12);
    px(ctx, '#e2e8f0', sx + 9, sy + 1, T - 18, 4);
    px(ctx, '#8b95a5', sx + 7, sy + 5, T - 14, 8);
    px(ctx, '#c4cdd8', sx + 8, sy + 5, T - 16, 6);
    px(ctx, '#1a1a2e', sx + 10, sy + 7, T - 20, 3);
    px(ctx, '#e2e8f0', sx + H - 1, sy + 5, 2, 6);

    // Purple Robe instead of chestplate, with Gold Bird Sigil
    px(ctx, '#5b21b6', sx + 7, sy + 13, T - 14, 12);
    px(ctx, '#7c3aed', sx + 9, sy + 14, T - 18, 9);
    _drawBirdSigil(ctx, sx + H, sy + 18, 1);
    // Belt
    px(ctx, '#4c1d95', sx + 7, sy + 22, T - 14, 2);
    px(ctx, '#ffd700', sx + H - 2, sy + 22, 4, 2);

    // Silver pauldrons & gauntlets
    px(ctx, '#c4cdd8', sx + 3, sy + 13, 6, 7);
    px(ctx, '#c4cdd8', sx + T - 9, sy + 13, 6, 7);
    px(ctx, '#e2e8f0', sx + 4, sy + 13, 4, 2);
    px(ctx, '#e2e8f0', sx + T - 8, sy + 13, 4, 2);
    px(ctx, '#8b95a5', sx + 4, sy + 20, 4, 3);
    px(ctx, '#8b95a5', sx + T - 8, sy + 20, 4, 3);

    // Silver Greaves & boots — smooth alternating stride
    px(ctx, '#8b95a5', sx + 9, sy + 25 - liftL, 5, 5);
    px(ctx, '#475569', sx + 9, sy + 29 - liftL, 5, 3);
    px(ctx, '#8b95a5', sx + T - 14, sy + 25 - liftR, 5, 5);
    px(ctx, '#475569', sx + T - 14, sy + 29 - liftR, 5, 3);

    // Steel sword
    px(ctx, '#cbd5e1', sx + T - 4, sy + 6, 3, 18);
    px(ctx, '#ffffff', sx + T - 3, sy + 6, 1, 16);
    px(ctx, '#ffd700', sx + T - 6, sy + 18, 7, 2);
    drawEnemyHpBar(ctx, sx, sy, hp, maxHp);
  }

  function drawDarkChampion(ctx, x, y, frame, hp, maxHp, dashX = 0, dashY = 0, walkPhase = 0, hasKey = false) {
    const stride = walkPhase !== 0 ? Math.sin(walkPhase) : 0;
    const bobY = walkPhase !== 0 ? -Math.abs(stride) * 1.2 : 0;
    const liftL = Math.max(0, stride) * 3;
    const liftR = Math.max(0, -stride) * 3;
    const sx = x + dashX, sy = y + bobY + dashY;

    // Golden key aura for Floor 5 Key-Bearing Red Knight
    if (hasKey) {
      const pulse = 0.45 + 0.35 * Math.sin(Date.now() * 0.007);
      ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sx + H, sy + H, H + 4, 0, Math.PI * 2);
      ctx.stroke();
      // Floating key icon above helm
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(sx + H, sy - 9, 3.5, 0, Math.PI * 2);
      ctx.fill();
      px(ctx, '#ffd700', sx + H - 1, sy - 6, 2, 5);
      px(ctx, '#ffd700', sx + H + 1, sy - 3, 2, 1);
    }

    // Crimson cape behind shoulders
    px(ctx, '#7f1d1d', sx + 5, sy + 11, T - 10, 17);

    // Slightly larger Red Knight helm
    px(ctx, '#dc2626', sx + 7, sy + 1, T - 14, 12);
    px(ctx, '#f87171', sx + 8, sy + 1, T - 16, 3);
    px(ctx, '#991b1b', sx + 6, sy + 5, T - 12, 8);
    px(ctx, '#1a1a2e', sx + 9, sy + 6, T - 18, 3);
    px(ctx, '#ffd700', sx + H - 1, sy + 4, 2, 7); // gold nasal guard
    // Crimson/gold plume
    px(ctx, '#ffd700', sx + H - 2, sy - 3, 4, 4);

    // Purple Robe instead of chestplate, with Gold Bird Sigil
    px(ctx, '#5b21b6', sx + 6, sy + 13, T - 12, 13);
    px(ctx, '#7c3aed', sx + 8, sy + 14, T - 16, 10);
    _drawBirdSigil(ctx, sx + H, sy + 18, 1);
    px(ctx, '#ffd700', sx + 6, sy + 23, T - 12, 2);

    // Larger Red Knight pauldrons with gold trim
    px(ctx, '#b91c1c', sx + 2, sy + 12, 6, 8);
    px(ctx, '#b91c1c', sx + T - 8, sy + 12, 6, 8);
    px(ctx, '#ffd700', sx + 3, sy + 12, 4, 2);
    px(ctx, '#ffd700', sx + T - 7, sy + 12, 4, 2);

    // Heavy Greaves & gold-trimmed sabatons — smooth alternating stride
    px(ctx, '#991b1b', sx + 8, sy + 25 - liftL, 6, 4);
    px(ctx, '#ffd700', sx + 8, sy + 29 - liftL, 6, 3);
    px(ctx, '#991b1b', sx + T - 14, sy + 25 - liftR, 6, 4);
    px(ctx, '#ffd700', sx + T - 14, sy + 29 - liftR, 6, 3);

    // Broadsword (wider blade)
    px(ctx, '#e2e8f0', sx + T - 4, sy - 2, 5, 25);
    px(ctx, '#ffffff', sx + T - 3, sy - 2, 2, 23);
    px(ctx, '#ffd700', sx + T - 7, sy + 18, 11, 3);
    drawEnemyHpBar(ctx, sx, sy - 2, hp, maxHp, true);
  }

  function drawEnemyWizard(ctx, x, y, frame, hp, maxHp, dashX = 0, dashY = 0, walkPhase = 0) {
    const stride = walkPhase !== 0 ? Math.sin(walkPhase) : 0;
    const bobY = walkPhase !== 0 ? -Math.abs(stride) * 1.2 : 0;
    const liftL = Math.max(0, stride) * 2.5;
    const liftR = Math.max(0, -stride) * 2.5;
    const sx = x + dashX, sy = y + bobY + dashY;

    // Boots stepping under full purple robe
    px(ctx, '#1e0536', sx + 9, sy + T - 4 - liftL, 5, 4);
    px(ctx, '#1e0536', sx + T - 14, sy + T - 4 - liftR, 5, 4);

    // Full Purple Robe & Layered Flowing Cloak
    px(ctx, '#3b0764', sx + 6, sy + 12, T - 12, T - 14);
    px(ctx, '#1e0536', sx + 11, sy + 14, T - 22, T - 16);
    px(ctx, '#581c87', sx + 7, sy + 13, 5, T - 16);
    px(ctx, '#581c87', sx + T - 12, sy + 13, 5, T - 16);
    px(ctx, '#7e22ce', sx + 5, sy + 12, T - 10, 4);         // purple mantle
    px(ctx, '#a855f7', sx + 6, sy + T - 5, T - 12, 2);      // arcane hem
    px(ctx, '#38bdf8', sx + H - 2, sy + 21, 4, 2);          // lightning sash clasp

    // Full Purple Hood & Shadowed Face with Electric Eyes
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(sx + H, sy - 3);
    ctx.lineTo(sx + T - 6, sy + 12);
    ctx.lineTo(sx + 6, sy + 12);
    ctx.closePath();
    ctx.fill();
    px(ctx, '#581c87', sx + 9, sy + 2, T - 18, 4);
    px(ctx, '#7e22ce', sx + 7, sy + 10, T - 14, 3);
    px(ctx, '#0f051d', sx + 10, sy + 5, T - 20, 7);
    px(ctx, '#38bdf8', sx + 12, sy + 8, 2, 2);
    px(ctx, '#38bdf8', sx + T - 14, sy + 8, 2, 2);

    // Ornate Staff + Crackling Lightning Crystal
    px(ctx, '#334155', sx + T - 6, sy + 5, 3, 22);
    px(ctx, '#94a3b8', sx + T - 7, sy + 8, 5, 2);
    const orbR = 4 + 0.8 * Math.sin((frame || 0) * 0.9);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.beginPath();
    ctx.arc(sx + T - 5, sy + 4, orbR + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(sx + T - 5, sy + 4, orbR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sx + T - 5, sy + 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    // Crackling mini lightning arc around staff orb
    if ((frame || 0) % 2 === 0) {
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx + T - 9, sy + 2);
      ctx.lineTo(sx + T - 5, sy + 0);
      ctx.lineTo(sx + T - 1, sy + 4);
      ctx.stroke();
    }

    drawEnemyHpBar(ctx, sx, sy, hp, maxHp);
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
    } else if (type === 'lightning') {
      // Real jagged multi-segment lightning bolt with electric halo & fork
      const jit1 = ((frame % 2 === 0) ? 1 : -1) * 4;
      const jit2 = ((frame % 3 === 0) ? -1 : 1) * 3;
      ctx.save();
      // Outer electric glow
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 9, y + jit1 * 0.5);
      ctx.lineTo(x - 3, y - jit1);
      ctx.lineTo(x + 3, y + jit2);
      ctx.lineTo(x + 9, y - jit2 * 0.5);
      ctx.stroke();

      // Bright white electric core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Branching mini-arc
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 2, y - jit1);
      ctx.lineTo(x + 2, y - jit1 - 5);
      ctx.moveTo(x + 2, y + jit2);
      ctx.lineTo(x + 6, y + jit2 + 5);
      ctx.stroke();

      // Glowing core spark
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
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

    // Faint white aura glow
    const grd = ctx.createRadialGradient(x + H, y + H + floatY, 2, x + H, y + H + floatY, T * 0.7);
    grd.addColorStop(0, 'rgba(255,255,255,0.28)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - 6, y - 6 + floatY, T + 12, T + 12);

    // Body (semi-transparent white)
    ctx.fillStyle = 'rgba(240,240,255,0.72)';
    ctx.beginPath();
    ctx.arc(x + H, y + H - 4 + floatY, H - 4, Math.PI, 0);
    ctx.lineTo(x + T - 4, y + H + 10 + floatY);
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

    // Hollow black eyes
    px(ctx, '#0a0a0a', x + H - 6, y + H - 5 + floatY, 5, 5);
    px(ctx, '#0a0a0a', x + H + 1, y + H - 5 + floatY, 5, 5);
    drawEnemyHpBar(ctx, x, y, hp, maxHp);
  }

  // ── CRIMSON RIDER BOSS (5x size = ~160x160px) ──────────────
  function drawCrimsonRider(ctx, x, y, frame, hp, maxHp, isCharging = false, isKicking = false, chargeDir = 'right', windupType = null, attackProgress = 0, walkPhase = 0) {
    const f = frame % 8;
    const rage = hp / maxHp < 0.4;
    const cx = x + H;
    const cy = y + H;

    ctx.save();
    // Flip horizontally if facing left
    const facingLeft = chargeDir === 'left';
    ctx.translate(cx, cy);
    if (facingLeft) ctx.scale(-1, 1);

    // Telegraph aura for charge or kick buildup
    if (windupType === 'charge') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 75, 0, Math.PI * 2);
      ctx.fill();
    } else if (windupType === 'kick') {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.28)';
      ctx.beginPath();
      ctx.arc(0, 0, 78, 0, Math.PI * 2);
      ctx.fill();
    }

    if (rage) {
      ctx.fillStyle = `rgba(255, 0, 0, ${0.12 + 0.08 * Math.sin(f)})`;
      ctx.beginPath();
      ctx.arc(0, 0, 82, 0, Math.PI * 2);
      ctx.fill();
    }

    // Charge speed streaks behind horse
    if (isCharging) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 4; i++) {
        const sy = -36 + i * 24;
        ctx.beginPath();
        ctx.moveTo(-64 - (f % 3) * 10, sy);
        ctx.lineTo(-96 - (f % 3) * 14, sy);
        ctx.stroke();
      }
    }

    // Kick shockwave burst
    if (isKicking) {
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-44, 28, 22 + (f % 3) * 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 52, 58, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rear up / buck angle
    const rearAngle = (windupType === 'charge' || windupType === 'kick') ? -0.18 : (isKicking ? 0.14 : 0);
    ctx.rotate(rearAngle);

    const trot = walkPhase !== 0 ? Math.sin(walkPhase) * (isCharging ? 11 : 6) : 0;
    const liftA = walkPhase !== 0 ? Math.max(0, Math.sin(walkPhase)) * 5 : 0;
    const liftB = walkPhase !== 0 ? Math.max(0, -Math.sin(walkPhase)) * 5 : 0;

    // ── GRAY STEED (partially armored) ──
    // Tail
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-56, -4, 16, 26);
    // Back legs (buck backward during kick, 2-beat diagonal trot when moving)
    ctx.fillStyle = '#94a3b8';
    const kickBackX = isKicking ? -20 : 0;
    const kickBackY = isKicking ? -14 : 0;
    ctx.fillRect(-40 + trot + kickBackX, 18 + kickBackY - liftA, 12, 34);
    ctx.fillRect(-24 - trot + kickBackX, 18 + kickBackY - liftB, 12, 34);
    // Front legs
    const frontLift = (windupType === 'charge') ? -14 : 0;
    ctx.fillRect(16 - trot, 18 + frontLift - liftB, 12, 34);
    ctx.fillRect(30 + trot, 18 + frontLift - liftA, 12, 34);
    // Hooves
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-40 + trot + kickBackX, 46 + kickBackY - liftA, 12, 6);
    ctx.fillRect(-24 - trot + kickBackX, 46 + kickBackY - liftB, 12, 6);
    ctx.fillRect(16 - trot, 46 + frontLift - liftB, 12, 6);
    ctx.fillRect(30 + trot, 46 + frontLift - liftA, 12, 6);

    // Horse body (gray steed)
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-44, -10, 86, 34);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-44, 14, 86, 10);
    // Dark steel barding (chest & flank armor)
    ctx.fillStyle = '#334155';
    ctx.fillRect(18, -10, 26, 32);
    ctx.fillStyle = '#475569';
    ctx.fillRect(20, -8, 22, 6);
    // Dark purple/obsidian saddle cloth
    ctx.fillStyle = '#3b0764';
    ctx.fillRect(-24, -12, 34, 24);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-24, 9, 34, 3);

    // Horse neck & head
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(28, -34, 20, 30);
    ctx.fillRect(34, -44, 30, 18);
    // Flowing silver-gray mane
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(22, -34, 8, 26);
    // Dark horse head plate armor (chamfron)
    ctx.fillStyle = '#334155';
    ctx.fillRect(42, -45, 22, 10);
    // Horse eye
    ctx.fillStyle = rage ? '#ff0000' : '#ef4444';
    ctx.fillRect(50, -40, 4, 4);

    // ── THE DARK KNIGHT (obsidian/black plate, glowing red visor) ──
    // Rider legs
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-10, -4, 16, 22);
    // Heavy obsidian/black torso
    ctx.fillStyle = '#111118';
    ctx.fillRect(-18, -42, 32, 38);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-14, -38, 24, 12);
    // Silver-steel trim
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-18, -8, 32, 4);
    // Massive dark pauldrons
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-26, -42, 12, 16);
    ctx.fillRect(10, -42, 12, 16);
    // Great helm with glowing red visor
    ctx.fillStyle = '#111118';
    ctx.fillRect(-14, -66, 24, 24);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-12, -66, 20, 6);
    ctx.fillStyle = '#09090b';
    ctx.fillRect(-6, -56, 14, 5);
    ctx.fillStyle = '#ff2222';
    ctx.fillRect(-4, -55, 10, 3); // glowing red visor
    // Dark plume (ignites in rage mode)
    ctx.fillStyle = rage ? '#ff4422' : '#4c1d95';
    ctx.fillRect(-12, -78, 16, 12);
    if (rage && f % 2 === 0) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-10, -84, 10, 8);
    }

    // Massive Lance / Greatsword (thrusts forward on attack & couched on charge)
    const lanceThrust = attackProgress > 0 ? Math.sin(attackProgress * Math.PI) * 28 : (isCharging ? 14 : 0);
    const lanceTilt = attackProgress > 0 ? Math.sin(attackProgress * Math.PI) * 0.18 : 0;
    ctx.save();
    ctx.translate(lanceThrust, 0);
    ctx.rotate(lanceTilt);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(10, -32, 68, 8);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(12, -30, 64, 2);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(4, -38, 8, 20);
    // Sweeping lance slash arc on attack
    if (attackProgress > 0) {
      ctx.strokeStyle = `rgba(239, 68, 68, ${1 - attackProgress * 0.7})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(54, -26, 36 + attackProgress * 14, -Math.PI * 0.45, Math.PI * 0.45);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - attackProgress * 0.8})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(54, -26, 32 + attackProgress * 12, -Math.PI * 0.35, Math.PI * 0.35);
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();

    // Boss HP Bar (large, above boss)
    const bw = 96;
    const bx = cx - bw / 2;
    const by = cy - 92;
    px(ctx, '#1a1a28', bx - 1, by - 1, bw + 2, 8);
    const pct = Math.max(0, hp / maxHp);
    px(ctx, pct > 0.4 ? '#e63946' : '#ff0000', bx, by, Math.round(bw * pct), 6);
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
      case C.I_EMBLEM: {
        // Castle Emblem (glowing gold/purple crest)
        const glow = 0.25 + 0.15 * Math.sin(f / 8 * Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${glow})`;
        ctx.beginPath();
        ctx.arc(x + H, cy + H, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#5b21b6';
        ctx.beginPath();
        ctx.moveTo(x + H, cy + 5);
        ctx.lineTo(x + T - 6, cy + 12);
        ctx.lineTo(x + H, cy + T - 5);
        ctx.lineTo(x + 6, cy + 12);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.stroke();
        _drawBirdSigil(ctx, x + H, cy + 15, 1);
        break;
      }

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

  function drawTrap(ctx, x, y, trap, frame) {
    if (trap.kind === 'bomb') {
      const pulse = trap.armed ? (0.5 + 0.5 * Math.sin(Date.now() * 0.025)) : 0;
      if (trap.armed) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.28 * pulse})`;
        ctx.beginPath();
        ctx.arc(x + H, y + H, H, 0, Math.PI * 2);
        ctx.fill();
      }
      // Small black bomb
      ctx.fillStyle = '#0f0f16';
      ctx.beginPath();
      ctx.arc(x + H, y + H + 2, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(x + H - 2, y + H, 2, 0, Math.PI * 2);
      ctx.fill();
      // Fuse + spark
      px(ctx, '#a16207', x + H - 1, y + 6, 2, 4);
      if (trap.armed || (frame % 4 < 2)) {
        px(ctx, trap.armed ? '#ef4444' : '#fbbf24', x + H - 1, y + 4, 3, 3);
      }
    } else {
      // Arrow floor/wall trap
      px(ctx, '#334155', x + 6, y + 6, T - 12, T - 12);
      px(ctx, '#1e293b', x + 9, y + 9, T - 18, T - 18);
      // Arrow slits
      px(ctx, trap.armed ? '#ef4444' : '#94a3b8', x + 11, y + H - 1, 10, 2);
      px(ctx, '#cbd5e1', x + 19, y + H - 3, 3, 6);
    }
  }

  function drawBigGate(ctx, x, y, locked) {
    // Tall reinforced iron & gold Castle Gate (Floor 5)
    px(ctx, '#1e1b2e', x, y, T, T);
    px(ctx, locked ? '#475569' : '#2dc653', x + 2, y + 1, T - 4, T - 2);
    px(ctx, '#0f172a', x + 5, y + 3, T - 10, T - 4);
    // Iron bars
    for (let bx = 8; bx <= T - 8; bx += 5) {
      px(ctx, locked ? '#94a3b8' : '#86efac', x + bx, y + 3, 2, T - 4);
    }
    // Gold arch & lock emblem
    px(ctx, '#ffd700', x + 3, y + 1, T - 6, 3);
    if (locked) {
      px(ctx, '#ffd700', x + H - 3, y + H - 3, 6, 6);
      px(ctx, '#0f172a', x + H - 1, y + H - 1, 2, 3);
    }
  }

  return {
    drawWall, drawFloor, drawTorch, drawDoor, drawBigGate, drawChest, drawSavePoint, drawTrap,
    drawPlayer, drawKnight, drawWizard, drawKnightPreview, drawWizardPreview,
    drawSlime, drawBlackKnight, drawDarkChampion, drawEnemyWizard, drawSpider, drawGhost, drawCrimsonRider,
    drawItem, drawProjectile, drawSlash, drawClash, drawParticles, drawHitEffect, drawPickupEffect,
    drawEnemyHpBar,
  };
})();
