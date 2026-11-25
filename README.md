# Pixel Labyrinth

**The Sunken Vaults of Oakhaven** — a retro pixel-art top-down dungeon crawler playable in the browser on both PC and Mobile.

Descend through five procedurally generated cursed floors, battle dungeon creatures, uncover ancient lore tablets, and face **Malakor, the Hollow Warden** in the Obsidian Sanctum.

---

## Features

- **5 Procedurally Generated Floors:** Each floor is generated with a recursive backtracker maze, torchlit corridors, fog of war, and a live mini-map:
  1. *The Mossbound Threshold*
  2. *The Ossuary Galleries*
  3. *The Whispering Catacombs*
  4. *The Ashen Crucible*
  5. *The Obsidian Sanctum* (Boss Floor)
- **Active & Bump Combat:** Sweeping sideways sword swings, crescent slash trails, X-clash impact bursts, enemy hit-flashes, screen shake, floating damage numbers, and particle effects.
- **Enemies & Boss:** Slimes, Skeletons, Ghosts, and **Malakor, the Hollow Warden** (with a Phase 2 rage state and minion summoning).
- **Save Points & Progress Persistence:**
  - Step onto glowing **Runestone Save Shrines** in the dungeon to heal (`+2 HP`) and save your run.
  - Manual save via the Pause menu (`💾 SAVE PROGRESS`) and automatic save when descending floors.
  - Resume anytime with **🔮 CONTINUE** on the title screen or **🔮 LOAD SAVE POINT** on Game Over.
- **Interactive World:**
  - **Treasure Chests:** Open chests for gems, healing, or temporary buffs (**Speed ⚡**, **Shield 🛡️**, **Power Sword ⚔️**).
  - **Ancient Lore Tablets:** Read carved monoliths for story fragments and bonus score.
  - **Keys & Locked Exits:** Find the floor key to unlock the exit door.
- **8-Bit Web Audio Synth:** Procedurally generated sound effects for swings, clashes, kills, pickups, keys, and saves—with a HUD mute toggle (`🔊` / `🔇`).
- **High Scores:** Local top-10 leaderboard stored in `localStorage`.

---

## Controls

| Platform | Movement | Attack / Interact | Pause |
| :--- | :--- | :--- | :--- |
| **PC** | `WASD` or `Arrow Keys` | `Space` (or walk into enemies/chests) | `Esc` or `⏸` |
| **Mobile** | On-screen D-Pad or Swipe | `⚔` button (or walk into enemies/chests) | `⏸` |

---

## Running Locally

No build step or external assets required.

1. Clone the repository:
   ```bash
   git clone https://github.com/DavidErameh/pixel_labyrith_game.git
   cd pixel_labyrith_game
   ```
2. Serve with any static server (or open `index.html` directly):
   ```bash
   python -m http.server 8765
   ```
3. Open `http://localhost:8765/` in your browser.

---

## Project Structure

```text
pixel-labyrinth-game/
├── index.html        # Screens, HUD, mobile D-pad, and overlays
├── style.css         # Dark dungeon pixel-art styling and responsive layout
└── js/
    ├── constants.js  # Tile/entity constants, floor lore, and tuning values
    ├── audio.js      # Web Audio 8-bit sound synthesizer
    ├── sprites.js    # Procedural Canvas 2D pixel-art sprites & clash/slash effects
    ├── maze.js       # Maze generation, shrines/tablets/chests, fog-of-war raycasting
    ├── entities.js   # Player, Enemy, Boss, Item, and EntityFactory classes
    ├── game.js       # Game loop, combat, camera, save/load serialization, rendering
    ├── ui.js         # HUD updates, floor banners, lore modal, leaderboard, localStorage
    └── main.js       # Screen wiring, keyboard/D-pad/swipe input, lifecycle
```
