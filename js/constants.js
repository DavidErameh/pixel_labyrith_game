// ============================================================
// constants.js — Game-wide constants for Pixel Labyrinth
// ============================================================

const C = {
  // Tile sizes
  TILE: 32,         // pixels per tile on canvas
  MAP_COLS: 31,     // must be odd for maze gen
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
  // T_LORE removed

  // Entity types
  E_PLAYER:           'player',
  E_SLIME:            'slime',
  E_BLACK_KNIGHT:     'black_knight',
  E_CASTLE_KNIGHT:    'castle_knight',
  E_ENEMY_WIZARD:     'enemy_wizard',
  E_RED_KNIGHT:       'red_knight',
  E_GHOST:            'ghost',
  E_DARK_CHAMPION:    'dark_champion',
  E_SPIDER:           'spider',
  E_BOSS:             'boss',

  // Item types
  I_HEART:        'heart',
  I_KEY:          'key',
  I_POTION:       'potion',
  I_POTION_LARGE: 'potion_large',
  I_EMBLEM:       'emblem',

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
    SLIME:       '#5ce1e6',
    BLACK_KNIGHT:'#1e1e2a',
    GHOST:       '#f0f0ff',
    BOSS:        '#c0202a',
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
  PLAYER_MAX_HP:     15,
  PLAYER_DMG:         2,
  PLAYER_MOVE_DELAY: 230,  // ms between moves
  CAMERA_ZOOM:       2.0,
  SHIELD_MAX_HITS:   5,
  SHIELD_COOLDOWN:   5000,

  // Class system
  CLASS_KNIGHT: 'knight',
  CLASS_WIZARD: 'wizard',

  // Knight stats
  KNIGHT_MAX_HP:     15,
  KNIGHT_DMG:         2,
  KNIGHT_SHIELD_HITS: 5,

  // Wizard stats
  WIZARD_MAX_HP:     10,
  WIZARD_DMG:         1,
  WIZARD_MAX_MP:      60,
  WIZARD_MP_REGEN:    2.0,
  WIZARD_MP_REGEN_KILL: 8,
  WIZARD_FIREBALL_COST:  10,
  WIZARD_FIREBURST_COST: 25,
  WIZARD_BARRIER_COST:   20,
  WIZARD_BARRIER_HITS:   2,
  WIZARD_BARRIER_COOLDOWN: 6000,
  WIZARD_FIREBALL_SPEED: 180,
  WIZARD_FIREBALL_RANGE: 5,

  // Power-up constants
  FLAME_SWORD_CHARGES:    7,
  MANA_BOOST_DURATION: 60000,  // 60 seconds
  SPELL_CHARGES_MIN:      5,
  SPELL_CHARGES_MAX:      7,

  // Enemy stats by type
  ENEMIES: {
    slime:          { hp: 5,  dmg: 2, speed: 0.9,  xp: 10,  color: '#5ce1e6' },
    black_knight:   { hp: 8,  dmg: 3, speed: 1.1,  xp: 15,  color: '#6d28d9' },
    castle_knight:  { hp: 8,  dmg: 3, speed: 1.1,  xp: 15,  color: '#6d28d9' },
    enemy_wizard:   { hp: 6,  dmg: 1, speed: 1.05, xp: 20,  color: '#38bdf8' },
    red_knight:     { hp: 32, dmg: 3, speed: 0.95, xp: 55,  color: '#dc2626' },
    ghost:          { hp: 7,  dmg: 3, speed: 1.25, xp: 18,  color: '#f0f0ff' },
    dark_champion:  { hp: 32, dmg: 3, speed: 0.95, xp: 55,  color: '#dc2626' },
    spider:         { hp: 14, dmg: 3, speed: 0.85, xp: 45,  color: '#a855f7' },
    boss:           { hp: 75, dmg: 5, speed: 0.65, xp: 300, color: '#475569' },
  },

  // Floor config
  FLOORS: 6,
  SPAWN_BLOCKS_MIN: 10,
  SPAWN_BLOCKS_MAX: 15,
  KEYS_NEEDED: 1,

  // 7-Labyrinth World Map
  LABYRINTHS: [
    { id: 1, name: "Duke Wiston's Castle", subtitle: 'Floors 1–6 · The Dark Knight', unlocked: true,  theme: '#9333ea' },
    { id: 2, name: 'The Sunken Catacombs', subtitle: 'Floors 1–6 · Coming Soon',     unlocked: false, theme: '#0ea5e9' },
    { id: 3, name: 'Ashen Keep',           subtitle: 'Floors 1–6 · Coming Soon',     unlocked: false, theme: '#f97316' },
    { id: 4, name: 'Blighted Hollows',     subtitle: 'Floors 1–6 · Coming Soon',     unlocked: false, theme: '#22c55e' },
    { id: 5, name: 'Obsidian Spire',       subtitle: 'Floors 1–6 · Coming Soon',     unlocked: false, theme: '#6366f1' },
    { id: 6, name: 'The Abyssal Gate',     subtitle: 'Floors 1–6 · Coming Soon',     unlocked: false, theme: '#e11d48' },
    { id: 7, name: 'The Underworld',       subtitle: 'Final Labyrinth · Coming Soon',unlocked: false, theme: '#dc2626' },
  ],

  // Score values
  SCORE: {
    heart: 0, key: 0, emblem: 500,
    enemy_slime: 10, enemy_black_knight: 15, enemy_castle_knight: 15,
    enemy_enemy_wizard: 20, enemy_red_knight: 55, enemy_ghost: 18,
    enemy_dark_champion: 55, enemy_spider: 45, enemy_boss: 300,
    floor_clear: 200,
  },

  // Lighting
  VISION_RADIUS: 5,

  // Lore & Floor Design
  FLOOR_LORE: {
    1: { name: 'OUTER COURTYARD',      text: "Castle Knights in purple robes guard Duke Wiston's outer walls." },
    2: { name: 'ARCANE GALLERY',       text: 'Castle Wizards join the garrison, hurling bolts of lightning.' },
    3: { name: 'CRIMSON BARRACKS',     text: 'Heavy Red Knights patrol these halls with broadswords.' },
    4: { name: 'THE TRAPPED ARMORY',   text: 'Combat triggers hidden black bombs and wall arrow traps.' },
    5: { name: 'THE GREAT GATEHOUSE',  text: 'Defeat the Key-Bearing Red Knight to unlock the Big Gate.' },
    6: { name: "THE DARK KNIGHT'S HALL", text: 'A narrow corridor. Use the side alcoves to evade the gray steed.' },
  },
};
