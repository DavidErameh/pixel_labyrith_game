// ============================================================
// maze.js — Procedural maze generation (Recursive Backtracker)
// ============================================================

const MazeGen = (() => {

  /**
   * Generate a maze grid.
   * Returns a 2D array of tile types (C.T_WALL / C.T_FLOOR / etc.)
   * Rows and cols MUST be odd numbers.
   */
  function generate(rows, cols, floor) {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      grid[r] = [];
      for (let c = 0; c < cols; c++) {
        grid[r][c] = C.T_WALL;
      }
    }

    // Recursive backtracker starting at (1,1)
    function carve(r, c) {
      const dirs = shuffle([[0,2],[0,-2],[2,0],[-2,0]]);
      for (const [dr, dc] of dirs) {
        const nr = r + dr, nc = c + dc;
        if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && grid[nr][nc] === C.T_WALL) {
          grid[r + dr/2][c + dc/2] = C.T_FLOOR;
          grid[nr][nc] = C.T_FLOOR;
          carve(nr, nc);
        }
      }
    }

    grid[1][1] = C.T_FLOOR;
    carve(1, 1);

    // Extra loops to make maze less perfect (more open)
    const extraLoops = Math.floor(rows * cols * 0.04);
    for (let i = 0; i < extraLoops; i++) {
      const r = 1 + Math.floor(Math.random() * (rows - 2));
      const c = 1 + Math.floor(Math.random() * (cols - 2));
      grid[r][c] = C.T_FLOOR;
    }

    // Place torches on walls
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (grid[r][c] === C.T_FLOOR && Math.random() < 0.04) {
          grid[r][c] = C.T_TORCH;
        }
      }
    }

    // Place chests
    const chestCount = 1 + Math.floor(floor / 2);
    let chestsPlaced = 0;
    let attempts = 0;
    while (chestsPlaced < chestCount && attempts < 500) {
      const r = 1 + Math.floor(Math.random() * (rows - 2));
      const c = 1 + Math.floor(Math.random() * (cols - 2));
      if (grid[r][c] === C.T_FLOOR && !(r === 1 && c === 1)) {
        grid[r][c] = C.T_CHEST;
        chestsPlaced++;
      }
      attempts++;
    }

    // Place exit door (bottom-right quadrant, away from start)
    let exitPlaced = false;
    attempts = 0;
    while (!exitPlaced && attempts < 1000) {
      const r = Math.floor(rows * 0.6) + Math.floor(Math.random() * Math.floor(rows * 0.35));
      const c = Math.floor(cols * 0.6) + Math.floor(Math.random() * Math.floor(cols * 0.35));
      if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1 && grid[r][c] === C.T_FLOOR) {
        grid[r][c] = C.T_DOOR;
        exitPlaced = true;
      }
      attempts++;
    }
    if (!exitPlaced) {
      // fallback
      grid[rows - 2][cols - 2] = C.T_DOOR;
    }

    // Place 1 Save Point Shrine (mid-dungeon)
    let savePlaced = false;
    attempts = 0;
    while (!savePlaced && attempts < 500) {
      const r = Math.floor(rows * 0.25) + Math.floor(Math.random() * Math.floor(rows * 0.5));
      const c = Math.floor(cols * 0.25) + Math.floor(Math.random() * Math.floor(cols * 0.5));
      if (r > 0 && r < rows - 1 && c > 0 && c < cols - 1 && grid[r][c] === C.T_FLOOR && !(r === 1 && c === 1)) {
        grid[r][c] = C.T_SAVEPOINT;
        savePlaced = true;
      }
      attempts++;
    }

    // Place 1-2 Lore Tablets
    let loreCount = 0;
    attempts = 0;
    while (loreCount < 2 && attempts < 400) {
      const r = 1 + Math.floor(Math.random() * (rows - 2));
      const c = 1 + Math.floor(Math.random() * (cols - 2));
      if (grid[r][c] === C.T_FLOOR && !(r === 1 && c === 1)) {
        grid[r][c] = C.T_LORE;
        loreCount++;
      }
      attempts++;
    }

    return grid;
  }

  /**
   * Find all floor positions
   */
  function getFloorPositions(grid, rows, cols, exclude) {
    const positions = [];
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (grid[r][c] === C.T_FLOOR) {
          if (!exclude || !(exclude.r === r && exclude.c === c)) {
            positions.push({ r, c });
          }
        }
      }
    }
    return positions;
  }

  /**
   * Find the exit door position
   */
  function findExit(grid, rows, cols) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === C.T_DOOR) return { r, c };
      }
    }
    return { r: rows - 2, c: cols - 2 };
  }

  /**
   * Check if position is walkable
   */
  function isWalkable(grid, rows, cols, r, c) {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    const t = grid[r][c];
    return t === C.T_FLOOR || t === C.T_TORCH || t === C.T_DOOR || t === C.T_OPEN ||
           t === C.T_CHEST_OPEN || t === C.T_SAVEPOINT || t === C.T_LORE;
  }

  /**
   * Compute fog-of-war visibility from player position
   */
  function computeVisibility(grid, rows, cols, pr, pc, radius) {
    const visible = new Set();
    const explored = new Set();

    function key(r, c) { return r * 1000 + c; }

    function castRay(tr, tc) {
      const steps = Math.max(Math.abs(tr - pr), Math.abs(tc - pc)) * 2;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const r = Math.round(pr + (tr - pr) * t);
        const c = Math.round(pc + (tc - pc) * t);
        if (r < 0 || r >= rows || c < 0 || c >= cols) return;
        const k = key(r, c);
        visible.add(k);
        explored.add(k);
        if (grid[r][c] === C.T_WALL) return;
      }
    }

    // Cast rays to perimeter of vision radius
    for (let dr = -radius; dr <= radius; dr++) {
      castRay(pr + dr, pc - radius);
      castRay(pr + dr, pc + radius);
    }
    for (let dc = -radius + 1; dc < radius; dc++) {
      castRay(pr - radius, pc + dc);
      castRay(pr + radius, pc + dc);
    }

    return { visible, explored };
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  return { generate, getFloorPositions, findExit, isWalkable, computeVisibility };
})();
