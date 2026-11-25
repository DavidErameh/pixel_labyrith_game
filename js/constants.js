// ============================================================
// constants.js — Game-wide constants for Pixel Labyrinth
// ============================================================

const C = {
  // Tile sizes
  TILE: 32,         // pixels per tile on canvas
  MAP_COLS: 31,     // must be odd for maze gen — 31x31 = 992px, forces camera scrolling
  MAP_ROWS: 31,

  // Tile types
  T_WALL:   0,
  T_FLOOR:  1,
  T_DOOR:   2,  // locked exit
  T_OPEN:   3,  // unlocked exit / stairs
  T_TORCH:      4,
  T_CHEST:      5,
  T_CHEST_OPEN: 6,
  T_SAVEPOINT:  7,
  T_LORE:       8,

  // Entity types
  E_PLAYER:           'player',
  E_SLIME:            'slime',
  E_SKELETON:         'skeleton',
  E_GHOST:            'ghost',
  E_ARMORED_SKELETON: 'armored_skeleton',
  E_SPIDER:           'spider',
  E_BOSS:             'boss',

  // Item types
  I_COIN:         'coin',
  I_GEM:          'gem',
  I_HEART:        'heart',
  I_KEY:          'key',
  I_POTION:       'potion',       // +2 HP — dropped by regular enemies
  I_POTION_LARGE: 'potion_large', // +5 HP — dropped by armored_skeleton & spider

  // Colors (canvas draw)
  COL: {
    WALL:        '#1a1a28',
    WALL_BORDER: '#0e0e1a',
    FLOOR:       '#2a2435',
    FLOOR_ALT:   '#251f30',
    TORCH_LIGHT: 'rgba(255,140,0,0.18)',
    SHADOW:      'rgba(0,0,0,0.6)',
    PLAYER:      '#a0d8ef',
    PLAYER_SWORD:'#ffd700',
    SLIME:       '#2dc653',
    SKELETON:    '#e0d8c8',
    GHOST:       '#9b9bcf',
    BOSS:        '#e63946',
    COIN:        '#ffd700',
    GEM:         '#4fa3e0',
    HEART:       '#e63946',
    KEY:         '#ffd700',
    DOOR:        '#8b4513',
    STAIRS:      '#2dc653',
    SPEED:       '#ff9f1c',
    SHIELD:      '#4fa3e0',
    SWORD_PU:    '#e63946',
    CHEST:       '#a0522d',
    TORCH:       '#ff8c00',
    UI_BG:       '#12121a',
    MINIMAP_WALL:'#1a1a28',
    MINIMAP_FLOOR:'#3a3458',
    MINIMAP_PLAYER:'#a0d8ef',
    MINIMAP_ENEMY:'#e63946',
    MINIMAP_ITEM: '#ffd700',
    MINIMAP_EXIT: '#2dc653',
    MINIMAP_FOG:  'rgba(5,5,10,0.85)',
  },

  // Gameplay
  PLAYER_MAX_HP:     12,
  PLAYER_DMG:         2,
  PLAYER_MOVE_DELAY: 230,  // ms between moves (held key — steady dungeon walk)
  CAMERA_ZOOM:       2.0,  // ~100% zoomed in
  SHIELD_MAX_HITS:   3,
  SHIELD_COOLDOWN:   5000, // 5 seconds cooldown after 3 hits

  // Class system
  CLASS_KNIGHT: 'knight',
  CLASS_WIZARD: 'wizard',

  // Knight stats
  KNIGHT_MAX_HP:     14,
  KNIGHT_DMG:         2,
  KNIGHT_SHIELD_HITS: 3,

  // Wizard stats
  WIZARD_MAX_HP:     10,
  WIZARD_DMG:         1,   // weak melee
  WIZARD_MAX_MP:      60,
  WIZARD_MP_REGEN:    2.0, // MP per second
  WIZARD_MP_REGEN_KILL: 8, // MP gained per kill
  WIZARD_FIREBALL_COST:  10,
  WIZARD_FIREBURST_COST: 25,
  WIZARD_BARRIER_COST:   20,
  WIZARD_BARRIER_HITS:   2,
  WIZARD_BARRIER_COOLDOWN: 6000,
  WIZARD_FIREBALL_SPEED: 180, // px/sec
  WIZARD_FIREBALL_RANGE: 5,   // tiles

  // Enemy stats by type per floor multiplier (harder + faster)
  ENEMIES: {
    slime:            { hp: 5,  dmg: 2, speed: 0.9,  xp: 10,  color: '#5ce1e6' },
    skeleton:         { hp: 8,  dmg: 3, speed: 1.1,  xp: 15,  color: '#e0d8c8' },
    ghost:            { hp: 7,  dmg: 3, speed: 1.25, xp: 18,  color: '#9b9bcf' },
    armored_skeleton: { hp: 16, dmg: 4, speed: 1.0,  xp: 45,  color: '#94a3b8' },
    spider:           { hp: 14, dmg: 3, speed: 0.85, xp: 45,  color: '#a855f7' },
    boss:             { hp: 40, dmg: 5, speed: 0.85, xp: 150, color: '#e63946' },
  },

  // Floor config
  FLOORS: 5,  // 5 floors, floor 5 has final boss
  SPAWN_BLOCKS_MIN: 10,
  SPAWN_BLOCKS_MAX: 15,
  KEYS_NEEDED: 1,

  // Score values
  SCORE: {
    coin: 10, gem: 50, heart: 0, key: 0,
    enemy_slime: 10, enemy_skeleton: 15, enemy_ghost: 18,
    enemy_armored_skeleton: 45, enemy_spider: 45, enemy_boss: 150,
    floor_clear: 200,
  },

  // Lighting
  VISION_RADIUS: 5,  // tiles player can see

  // Lore & Floor Design
  FLOOR_LORE: {
    1: { name: 'THE MOSSBOUND THRESHOLD', text: 'Once the outer ward of Oakhaven, now choked by creeping rot and watchful slimes.' },
    2: { name: 'THE OSSUARY GALLERIES',   text: 'The fallen knights of the Sun-Keep still patrol these halls, long after their flesh turned to dust.' },
    3: { name: 'THE WHISPERING CATACOMBS',text: 'Torches flicker without wind. Restless shades guard the sealed relics of the old king.' },
    4: { name: 'THE ASHEN CRUCIBLE',      text: 'Soot-stained flagstones burn warm underfoot. The air tastes of iron and ancient oaths.' },
    5: { name: 'THE OBSIDIAN SANCTUM',    text: 'Throne of Malakor, the Hollow Warden. Break his cursed crown or join his silent legion.' },
  },

  LORE_FRAGMENTS: [
    'Carved in stone: "When the Sun-Keep sank, Malakor locked the gates from within—to keep something in, or us out?"',
    'A faded parchment: "The Warden’s armor still breathes. Aim for the cracks where the violet light bleeds through."',
    'Etched by a dying knight: "Do not trust the silence on the third floor. The dead remember the weight of their blades."',
    'An altar inscription: "Three keys were forged of star-iron; only the worthy may descend to the Sanctum."',
    'Scratched into the wall: "If you find a glowing Runestone, kneel and rest. Few survive the descent without its grace."',
    'A broken seal: "The slimes were once the alchemists’ wards—until the Obsidian Crown twisted their purpose."',
  ],
};
