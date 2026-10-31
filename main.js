import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Sound, floatText, updateFloaters, cutIn } from './fx.js';
import { addDecorations } from './deco.js';

let decoUpdate = null;
const portrait = (key) => (window.__PORTRAITS && window.__PORTRAITS[key]) || `${import.meta.env?.BASE_URL || './'}portraits/${key}.png`;

// ============================================================
//  基本設定：網格、六大兵種、三大陣營、四大古戰場與專屬敵軍
// ============================================================
const COLS = 18, ROWS = 11, CELL = 2;
const TOTAL_WAVES = 10;
const DIFF = { startLives: 3, hpMul: 2.0, hpGrowth: 0.48, speedMul: 1.25, startGold: 260, waveBonus: 32, waveBonusGrowth: 8, bossGrowth: 0.32 };

// 六種兵種原型（各陣營 6 位名將）
const ARCHETYPES = {
  blade:      { role: '近戰橫掃', cost: 100, range: 4.2, dmg: 32, rate: 0.9,  splash: 2.4 },
  rapid:      { role: '快攻連刺', cost: 80,  range: 5.0, dmg: 9,  rate: 4.0 },
  archer:     { role: '遠程神射', cost: 120, range: 9.5, dmg: 48, rate: 0.6 },
  strategist: { role: '軍師緩敵', cost: 140, range: 6.0, dmg: 14, rate: 1.0,  splash: 2.6, slow: 0.5 },
  heavy:      { role: '重擊破甲', cost: 150, range: 4.3, dmg: 64, rate: 0.65, splash: 2.7, stun: 0.45, armorBreak: true },
  cavalry:    { role: '鐵騎貫穿', cost: 160, range: 6.8, dmg: 44, rate: 1.15, pierce: 2.2 },
};

const FACTIONS = {
  shu: {
    name: '蜀漢', seal: '蜀', lord: '主公　劉備', color: 0x2f8f4e, css: 'hsl(145 50% 34%)',
    generals: {
      blade:      { name: '關羽',   desc: '青龍偃月刀橫掃千軍，範圍傷害。' },
      rapid:      { name: '趙雲',   desc: '龍膽亮銀槍，出手如電。' },
      archer:     { name: '黃忠',   desc: '老當益壯，百步穿楊。' },
      strategist: { name: '諸葛亮', desc: '羽扇綸巾，八陣圖令敵軍遲滯。' },
      heavy:      { name: '張飛',   desc: '丈八蛇矛暴喝震地，破甲範圍重擊並短暫震暈敵軍。' },
      cavalry:    { name: '馬超',   desc: '錦馬超西涼銀槍突擊，直線貫穿路徑上所有敵軍。' },
    },
  },
  wei: {
    name: '曹魏', seal: '魏', lord: '主公　曹操', color: 0x2d5fa8, css: 'hsl(214 58% 42%)',
    generals: {
      blade:      { name: '夏侯惇', desc: '拔矢啖睛，猛將橫掃。' },
      rapid:      { name: '張遼',   desc: '威震逍遙津，攻勢迅捷。' },
      archer:     { name: '夏侯淵', desc: '神速奔襲，箭無虛發。' },
      strategist: { name: '司馬懿', desc: '鷹視狼顧，以謀困敵。' },
      heavy:      { name: '許褚',   desc: '虎痴巨錘裂地千鈞，破甲範圍重擊並短暫震暈敵軍。' },
      cavalry:    { name: '典韋',   desc: '古之惡來雙鐵戟破陣，直線貫穿路徑上所有敵軍。' },
    },
  },
  wu: {
    name: '東吳', seal: '吳', lord: '主公　孫權', color: 0xb8332e, css: 'hsl(3 60% 45%)',
    generals: {
      blade:      { name: '甘寧',   desc: '錦帆遊俠，百騎劫營。' },
      rapid:      { name: '孫尚香', desc: '弓腰姬，雙圈連擊。' },
      archer:     { name: '太史慈', desc: '神亭酣戰，善射無雙。' },
      strategist: { name: '周瑜',   desc: '赤壁火攻，烈焰延燒緩敵。' },
      heavy:      { name: '周泰',   desc: '身被十二創浴血奮戰，破甲範圍斬擊並短暫震暈敵軍。' },
      cavalry:    { name: '呂蒙',   desc: '白衣渡江奇襲劍氣，直線貫穿路徑上所有敵軍。' },
    },
  },
};

// 四大古戰場所有敵軍定義
const ENEMY_TYPES = {
  // 虎牢關（董卓聯軍 & 黃巾軍）
  soldier:      { name: '黃巾兵',   hp: 75,   speed: 2.6,  reward: 6,   scale: 1.0,  color: 0xc9a227 },
  cavalry:      { name: '西涼狼騎', hp: 62,   speed: 4.6,  reward: 8,   scale: 1.0,  color: 0xb88a1e, mounted: true, horseColor: 0x6e4b2e },
  shield:       { name: '陷陣重盾', hp: 240,  speed: 1.75, reward: 12,  scale: 1.15, color: 0x8a6d1a, hasShield: true },
  huaxiong:     { name: '華雄',     hp: 1450, speed: 1.75, reward: 100, scale: 1.6,  color: 0x4a3a32, boss: true, lives: 2, quote: '董卓帳下驍將，連斬數員大將' },
  zhangjiao:    { name: '張角',     hp: 2150, speed: 1.55, reward: 130, scale: 1.6,  color: 0xe0c040, boss: true, heal: true, lives: 2, quote: '蒼天已死，黃天當立！（會為周圍敵軍回血）' },
  boss:         { name: '呂布',     hp: 3400, speed: 1.85, reward: 200, scale: 1.6,  color: 0x7a1f1f, boss: true, mounted: true, horseColor: 0xb0261c, portrait: 'boss_lubu', lives: 3, quote: '人中呂布，馬中赤兔' },

  // 赤壁（荊州水軍 & 連環戰船部隊）
  sailor:       { name: '荊州水兵', hp: 72,   speed: 2.8,  reward: 6,   scale: 1.0,  color: 0x2b628f },
  naval_shield: { name: '鐵索盾衛', hp: 250,  speed: 1.7,  reward: 12,  scale: 1.15, color: 0x35485e, hasShield: true, armor: true },
  fire_raider:  { name: '火船死士', hp: 66,   speed: 4.75, reward: 9,   scale: 1.0,  color: 0xd84318, fireTorch: true },
  zhangyun:     { name: '張允',     hp: 1500, speed: 1.75, reward: 100, scale: 1.55, color: 0x264b73, boss: true, lives: 2, quote: '荊州水軍副都督，熟諳江戰！' },
  kuaiyue:      { name: '蒯越',     hp: 2150, speed: 1.6,  reward: 130, scale: 1.55, color: 0x4a3b7a, boss: true, heal: true, lives: 2, quote: '鐵索連舟，如履平地！（為周圍水軍回血）' },
  boss_caimao:  { name: '蔡瑁',     hp: 3450, speed: 1.85, reward: 200, scale: 1.65, color: 0x1c3b61, boss: true, mounted: true, horseColor: 0x2c3b4d, portrait: 'boss_caimao', lives: 3, quote: '水軍大都督，連環大艦壓境！' },

  // 長板坡（曹操南征虎豹精銳）
  wei_soldier:  { name: '青州步卒', hp: 78,   speed: 2.6,  reward: 6,   scale: 1.0,  color: 0x2d5fa8 },
  tiger_cav:    { name: '虎豹鐵騎', hp: 70,   speed: 4.8,  reward: 9,   scale: 1.05, color: 0x1e293b, mounted: true, horseColor: 0x1a1a1f },
  ram_cart:     { name: '攻城衝車', hp: 290,  speed: 1.6,  reward: 14,  scale: 1.22, color: 0x5c4028, armor: true, cart: true, lives: 1 },
  xiahouen:     { name: '夏侯恩',   hp: 1500, speed: 1.8,  reward: 100, scale: 1.55, color: 0x284b82, boss: true, lives: 2, quote: '背負丞相青釭寶劍，恃勇輕進！' },
  zhanghe:      { name: '張郃',     hp: 2200, speed: 1.65, reward: 130, scale: 1.55, color: 0x3b2d66, boss: true, heal: true, lives: 2, quote: '河北名將，巧變善陣！（激勵周圍曹軍回血）' },
  boss_caocao:  { name: '曹操',     hp: 3500, speed: 1.85, reward: 200, scale: 1.65, color: 0x1b2a4a, boss: true, mounted: true, horseColor: 0xf0ece0, portrait: 'boss_caocao', lives: 3, quote: '寧教我負天下人，休教天下人負我！' },

  // 雲夢澤（南蠻藤甲與猛獸大軍）
  poison_dart:  { name: '毒吹箭手', hp: 65,   speed: 4.1,  reward: 7,   scale: 0.96, color: 0x3b7a4a },
  rattan:       { name: '南蠻藤甲', hp: 195,  speed: 2.25, reward: 12,  scale: 1.1,  color: 0x9a7a3a, armor: true },
  elephant:     { name: '南蠻戰象', hp: 330,  speed: 1.62, reward: 15,  scale: 1.3,  color: 0x6e6a64, elephant: true, lives: 1 },
  wutugu:       { name: '兀突骨',   hp: 1600, speed: 1.65, reward: 100, scale: 1.7,  color: 0x5a4628, boss: true, armor: true, lives: 2, quote: '烏戈國主，身披鱗甲，刀箭減半！' },
  mulu:         { name: '木鹿大王', hp: 2200, speed: 1.6,  reward: 130, scale: 1.6,  color: 0x5a8c32, boss: true, heal: true, elephant: true, lives: 2, quote: '驅象呼風，毒瘴護體！（為周圍蠻兵回血）' },
  boss_menghuo: { name: '孟獲',     hp: 3600, speed: 1.8,  reward: 200, scale: 1.7,  color: 0x8a2e1a, boss: true, elephant: true, portrait: 'boss_menghuo', lives: 3, quote: '七擒七縱，南蠻巨象踏平城池！' },
};

// 四大古戰場設定
const STAGES = {
  chibi: {
    name: '赤壁', badge: '水戰火攻', sub: '長江夜戰 · 鐵索連舟',
    bossPortrait: 'boss_caimao',
    enemySummary: '荊州水兵 · 鐵索盾衛 · 火船死士 · 張允 · 蒯越 · <b>蔡瑁</b>',
    sky: 0x261a20, fog: 0x342026, ground: 0x455446, tileA: 0x536652, tileB: 0x4b5c4a, path: 0x8a6448,
    waypoints: [[0, 2], [4, 2], [4, 8], [9, 8], [9, 2], [13, 2], [13, 7], [17, 7]],
    waves: {
      1:  [['sailor', 8, 0.9]],
      2:  [['sailor', 10, 0.8], ['fire_raider', 4, 0.6]],
      3:  [['sailor', 8, 0.7], ['naval_shield', 4, 1.2], ['fire_raider', 5, 0.5]],
      4:  [['sailor', 10, 0.6], ['zhangyun', 1, 2.5], ['naval_shield', 4, 1.1]],
      5:  [['naval_shield', 6, 1.0], ['fire_raider', 8, 0.45], ['sailor', 10, 0.5]],
      6:  [['naval_shield', 8, 0.9], ['fire_raider', 10, 0.4], ['sailor', 8, 0.5]],
      7:  [['sailor', 14, 0.4], ['kuaiyue', 1, 2.5], ['naval_shield', 8, 0.8]],
      8:  [['fire_raider', 16, 0.35], ['naval_shield', 10, 0.8], ['sailor', 10, 0.5]],
      9:  [['sailor', 18, 0.3], ['naval_shield', 12, 0.65], ['fire_raider', 10, 0.4], ['zhangyun', 2, 3]],
      10: [['fire_raider', 14, 0.35], ['naval_shield', 10, 0.7], ['kuaiyue', 1, 3], ['boss_caimao', 1, 3]],
    },
  },
  changban: {
    name: '長板坡', badge: '斷橋阻擊', sub: '當陽險橋 · 虎豹追擊',
    bossPortrait: 'boss_caocao',
    enemySummary: '青州步卒 · 虎豹鐵騎 · 攻城衝車 · 夏侯恩 · 張郃 · <b>曹操</b>',
    sky: 0xcfd9d2, fog: 0xcfd9d2, ground: 0x6f9650, tileA: 0x82ab5d, tileB: 0x7aa256, path: 0xd4ba88,
    waypoints: [[0, 8], [4, 8], [4, 2], [8, 2], [8, 7], [13, 7], [13, 3], [16, 3], [16, 7], [17, 7]],
    waves: {
      1:  [['wei_soldier', 8, 0.9]],
      2:  [['wei_soldier', 10, 0.8], ['tiger_cav', 4, 0.6]],
      3:  [['wei_soldier', 8, 0.7], ['ram_cart', 3, 1.4], ['tiger_cav', 5, 0.5]],
      4:  [['wei_soldier', 10, 0.6], ['xiahouen', 1, 2.5], ['ram_cart', 4, 1.2]],
      5:  [['ram_cart', 5, 1.1], ['tiger_cav', 8, 0.45], ['wei_soldier', 10, 0.5]],
      6:  [['ram_cart', 7, 1.0], ['tiger_cav', 9, 0.4], ['wei_soldier', 8, 0.5]],
      7:  [['wei_soldier', 14, 0.4], ['zhanghe', 1, 2.5], ['ram_cart', 7, 0.9]],
      8:  [['tiger_cav', 16, 0.35], ['ram_cart', 8, 0.85], ['wei_soldier', 10, 0.5]],
      9:  [['wei_soldier', 18, 0.3], ['ram_cart', 10, 0.7], ['tiger_cav', 10, 0.4], ['xiahouen', 2, 3]],
      10: [['tiger_cav', 14, 0.35], ['ram_cart', 9, 0.75], ['zhanghe', 1, 3], ['boss_caocao', 1, 3]],
    },
  },
  hulao: {
    name: '虎牢關', badge: '雄關戰神', sub: '雄關漫道 · 西涼鐵騎',
    bossPortrait: 'boss_lubu',
    enemySummary: '黃巾兵 · 西涼狼騎 · 陷陣重盾 · 華雄 · 張角 · <b>呂布</b>',
    sky: 0xdcc4a2, fog: 0xdcc4a2, ground: 0xa68958, tileA: 0xb89a67, tileB: 0xb09260, path: 0xd9c298,
    waypoints: [[0, 2], [5, 2], [5, 8], [10, 8], [10, 3], [14, 3], [14, 7], [17, 7]],
    waves: {
      1:  [['soldier', 8, 0.9]],
      2:  [['soldier', 10, 0.8], ['cavalry', 4, 0.6]],
      3:  [['soldier', 8, 0.7], ['shield', 4, 1.2], ['cavalry', 5, 0.5]],
      4:  [['soldier', 10, 0.6], ['huaxiong', 1, 2.5], ['shield', 4, 1.1]],
      5:  [['shield', 6, 1.0], ['cavalry', 8, 0.45], ['soldier', 10, 0.5]],
      6:  [['shield', 8, 0.9], ['cavalry', 9, 0.4], ['soldier', 8, 0.5]],
      7:  [['soldier', 14, 0.4], ['zhangjiao', 1, 2.5], ['shield', 8, 0.8]],
      8:  [['cavalry', 16, 0.35], ['shield', 10, 0.8], ['soldier', 10, 0.5]],
      9:  [['soldier', 20, 0.3], ['shield', 12, 0.65], ['cavalry', 10, 0.4], ['huaxiong', 2, 3]],
      10: [['cavalry', 14, 0.35], ['shield', 10, 0.7], ['zhangjiao', 1, 3], ['boss', 1, 3]],
    },
  },
  yunmeng: {
    name: '雲夢澤', badge: '南蠻藤甲', sub: '毒瘴迷霧 · 蠻族戰象',
    bossPortrait: 'boss_menghuo',
    enemySummary: '毒吹箭手 · 南蠻藤甲 · 南蠻戰象 · 兀突骨 · 木鹿大王 · <b>孟獲</b>',
    sky: 0x8ca683, fog: 0x8ca683, ground: 0x486642, tileA: 0x56784e, tileB: 0x4f7047, path: 0x9c8b65,
    waypoints: [[0, 5], [3, 5], [3, 1], [7, 1], [7, 9], [11, 9], [11, 3], [15, 3], [15, 7], [17, 7]],
    waves: {
      1:  [['poison_dart', 8, 0.85]],
      2:  [['poison_dart', 9, 0.75], ['rattan', 4, 0.9]],
      3:  [['poison_dart', 8, 0.65], ['rattan', 5, 0.9], ['elephant', 2, 1.5]],
      4:  [['rattan', 8, 0.75], ['wutugu', 1, 2.5], ['elephant', 3, 1.4]],
      5:  [['rattan', 8, 0.8], ['poison_dart', 10, 0.45], ['elephant', 4, 1.3]],
      6:  [['rattan', 10, 0.75], ['elephant', 5, 1.2], ['poison_dart', 10, 0.45]],
      7:  [['poison_dart', 14, 0.4], ['mulu', 1, 2.5], ['rattan', 8, 0.75]],
      8:  [['poison_dart', 16, 0.35], ['rattan', 10, 0.7], ['elephant', 6, 1.1]],
      9:  [['rattan', 14, 0.55], ['elephant', 7, 1.0], ['wutugu', 2, 3]],
      10: [['poison_dart', 14, 0.35], ['rattan', 10, 0.6], ['elephant', 6, 1.0], ['mulu', 1, 3], ['boss_menghuo', 1, 3]],
    },
  },
};

const QUOTES = {
  shu_blade: '關雲長在此，誰敢來戰！', shu_rapid: '吾乃常山趙子龍也！', shu_archer: '老夫寶刀未老！', shu_strategist: '略施小計，破敵如反掌。',
  shu_heavy: '燕人張翼德在此，誰敢與我決一死戰！', shu_cavalry: '西涼馬孟起，殺汝片甲不留！',
  wei_blade: '父精母血，不可棄也！', wei_rapid: '遼來遼來！', wei_archer: '看我神速一擊！', wei_strategist: '一切盡在掌握之中。',
  wei_heavy: '誰敢與俺許仲康大戰三百回合！', wei_cavalry: '雙戟在手，天下誰人能擋！',
  wu_blade: '錦帆賊甘興霸來也！', wu_rapid: '弓腰姬，不讓鬚眉！', wu_archer: '大丈夫當帶三尺劍立不世之功！', wu_strategist: '火燒赤壁，檣櫓灰飛煙滅！',
  wu_heavy: '縱死沙場，亦護主公周全！', wu_cavalry: '士別三日，即更刮目相待！',
};

const ULTS = {
  shu: { blade: '青龍偃月斬', rapid: '七進七出',   archer: '百步穿楊', strategist: '天雷八陣', heavy: '燕人咆哮', cavalry: '西涼鐵騎' },
  wei: { blade: '剛烈怒斬',   rapid: '威震逍遙津', archer: '神速箭雨', strategist: '鷹視狼顧', heavy: '虎痴破軍', cavalry: '惡來雙戟' },
  wu:  { blade: '錦帆夜襲',   rapid: '乾坤連環',   archer: '神亭箭雨', strategist: '火燒赤壁', heavy: '不屈血戰', cavalry: '白衣渡江' },
};
const RAGE_MAX = { blade: 16, rapid: 55, archer: 15, strategist: 18, heavy: 14, cavalry: 20 };

// ============================================================
//  Three.js 場景與動態戰場地形生成
// ============================================================
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfd9d2);
scene.fog = new THREE.Fog(0xcfd9d2, 45, 95);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(0, 30, 28);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 1);
controls.enablePan = false;
controls.enableDamping = true;
controls.minDistance = 18;
controls.maxDistance = 60;
controls.maxPolarAngle = Math.PI * 0.42;
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: null, TWO: THREE.TOUCH.DOLLY_ROTATE };

scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a6b3a, 1.1));
const sun = new THREE.DirectionalLight(0xffe6c0, 2.2);
sun.position.set(-18, 30, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30 });
scene.add(sun);

const mat = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...opts });
const cellToWorld = (c, r) => new THREE.Vector3((c - COLS / 2 + 0.5) * CELL, 0, (r - ROWS / 2 + 0.5) * CELL);
const worldToCell = (v) => [Math.floor(v.x / CELL + COLS / 2), Math.floor(v.z / CELL + ROWS / 2)];
const key = (c, r) => `${c},${r}`;

const pathCells = new Set();
const blocked = new Set();
let pathPoints = [];
let gatePos = cellToWorld(COLS, 7);
const stageGroup = new THREE.Group();
scene.add(stageGroup);
let castle = null;

function makeTree(stageId = 'changban') {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.8, 6), mat(0x5c3e24));
  trunk.position.y = 0.4;
  const leafColor1 = stageId === 'chibi' ? 0x3a4f38 : stageId === 'yunmeng' ? 0x2f5e38 : stageId === 'hulao' ? 0x6b7038 : 0x3f7a3a;
  const leafColor2 = stageId === 'chibi' ? 0x486145 : stageId === 'yunmeng' ? 0x3d7347 : stageId === 'hulao' ? 0x7d8242 : 0x4b8a42;
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.6, 7), mat(leafColor1));
  leaves.position.y = 1.4;
  const leaves2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 7), mat(leafColor2));
  leaves2.position.y = 2.0;
  g.add(trunk, leaves, leaves2);
  g.traverse(o => { o.castShadow = true; });
  return g;
}
function makeRock(stageId = 'changban') {
  const rockColor = stageId === 'chibi' ? 0x6b3a30 : stageId === 'hulao' ? 0x9c8260 : stageId === 'yunmeng' ? 0x52614d : 0x8c8a84;
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5, 0), mat(rockColor));
  m.scale.set(1, 0.6, 0.8); m.position.y = 0.25; m.castShadow = true;
  return m;
}
function makeCastle(color) {
  const g = new THREE.Group();
  const stone = mat(0x9b9184), roofM = mat(0x3b3a3f), wood = mat(0x8a3b2a);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.0, 6.5), stone); wall.position.y = 1;
  const gate = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.3, 1.4), mat(0x3a2a1c)); gate.position.y = 0.65;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 3.2), wood); hall.position.y = 2.55;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.3, 4), roofM); roof.position.y = 3.7; roof.rotation.y = Math.PI / 4; roof.scale.set(0.8, 1, 1.35);
  g.add(wall, gate, hall, roof);
  for (const z of [-2.9, 2.9]) {
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6), mat(0x4a3a2a)); flagPole.position.set(0, 3.3, z);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), mat(color, { side: THREE.DoubleSide })); flag.position.set(0, 4.2, z + 0.55); flag.rotation.y = Math.PI / 2;
    flag.userData.wave = true;
    g.add(flagPole, flag);
  }
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}
function makeCamp(stageId) {
  const g = new THREE.Group();
  const tentColor = stageId === 'chibi' ? 0x2b4c73 : stageId === 'changban' ? 0x2d5fa8 : stageId === 'yunmeng' ? 0x6b4c28 : 0xd8b23a;
  const tent = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2, 6), mat(tentColor)); tent.position.y = 1;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3), mat(0x4a3a2a)); pole.position.set(0.9, 1.5, 1.2);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), mat(tentColor, { side: THREE.DoubleSide })); flag.position.set(1.35, 2.6, 1.2); flag.userData.wave = true;
  g.add(tent, pole, flag);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function buildStageMap(stageId, factionColor = 0x2f8f4e) {
  while (stageGroup.children.length) stageGroup.remove(stageGroup.children[0]);
  pathCells.clear();
  blocked.clear();

  const st = STAGES[stageId];
  scene.background = new THREE.Color(st.sky);
  scene.fog.color.setHex(st.fog);

  const wps = st.waypoints;
  for (let i = 0; i < wps.length - 1; i++) {
    let [c, r] = wps[i];
    const [c2, r2] = wps[i + 1];
    while (c !== c2 || r !== r2) {
      pathCells.add(key(c, r));
      c += Math.sign(c2 - c); r += Math.sign(r2 - r);
    }
    pathCells.add(key(c2, r2));
  }

  const ground = new THREE.Mesh(new THREE.BoxGeometry(COLS * CELL + 16, 1, ROWS * CELL + 16), mat(st.ground));
  ground.position.y = -0.5; ground.receiveShadow = true;
  stageGroup.add(ground);

  const buildTileGeo = new THREE.BoxGeometry(CELL * 0.94, 0.06, CELL * 0.94);
  const tileMats = [mat(st.tileA), mat(st.tileB)];
  const pathMat = mat(st.path);
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    const p = cellToWorld(c, r);
    const isPath = pathCells.has(key(c, r));
    const tile = new THREE.Mesh(isPath ? new THREE.BoxGeometry(CELL, 0.12, CELL) : buildTileGeo, isPath ? pathMat : tileMats[(c + r) % 2]);
    tile.position.set(p.x, isPath ? 0.02 : 0.03, p.z);
    tile.receiveShadow = true;
    stageGroup.add(tile);
  }

  let seed = stageId === 'chibi' ? 19 : stageId === 'changban' ? 7 : stageId === 'hulao' ? 31 : 43;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 20; i++) {
    const c = Math.floor(rand() * COLS), r = Math.floor(rand() * ROWS);
    if (pathCells.has(key(c, r)) || blocked.has(key(c, r))) continue;
    const near = [...pathCells].some(k => { const [pc, pr] = k.split(',').map(Number); return Math.abs(pc - c) + Math.abs(pr - r) <= 1; });
    if (near && rand() < 0.8) continue;
    blocked.add(key(c, r));
    const treeRatio = stageId === 'hulao' ? 0.3 : 0.7;
    const o = rand() < treeRatio ? makeTree(stageId) : makeRock(stageId);
    o.position.add(cellToWorld(c, r)); o.rotation.y = rand() * 6;
    stageGroup.add(o);
  }
  for (let i = 0; i < 50; i++) {
    const ang = rand() * Math.PI * 2;
    const x = Math.cos(ang) * (COLS + 4 + rand() * 6), z = Math.sin(ang) * (ROWS + 3 + rand() * 6);
    const t = stageId === 'hulao' && rand() < 0.5 ? makeRock(stageId) : makeTree(stageId);
    t.position.set(x, 0, z); t.scale.setScalar(0.8 + rand() * 0.6); stageGroup.add(t);
  }

  const startRow = wps[0][1];
  const endRow = wps[wps.length - 1][1];
  gatePos = cellToWorld(COLS, endRow);
  const camp = makeCamp(stageId);
  camp.position.copy(cellToWorld(-1.4, startRow));
  stageGroup.add(camp);

  castle = makeCastle(factionColor);
  castle.position.copy(gatePos); castle.position.x += 0.6;
  stageGroup.add(castle);

  pathPoints = [cellToWorld(-1, startRow), ...wps.map(([c, r]) => cellToWorld(c, r)), gatePos.clone()];
  decoUpdate = addDecorations({ scene, mat, COLS, ROWS, CELL, factionColor, stageId, targetGroup: stageGroup });
}

// ============================================================
//  模型：18 位名將外觀與四大戰場敵軍模型
// ============================================================
const LOOKS = {
  // 蜀漢 6 將
  shu_blade:      { skin: 0xc8452f, robe: 0x2f8f4e, armor: 0x2f6f3e, hat: 'turban',  hatColor: 0x1f6b3a, beard: 'long',   beardColor: 0x1a1a1a, flag: '關' },
  shu_rapid:      { skin: 0xf3d2b0, robe: 0xf2f2f2, armor: 0xc9d3dc, hat: 'helmet',  hatColor: 0xdfe6ec, plume: 0xffffff, flag: '趙' },
  shu_archer:     { skin: 0xeac39e, robe: 0x2f8f4e, armor: 0xd6a83a, hat: 'helmet',  hatColor: 0xd6a83a, beard: 'long',   beardColor: 0xf2f2f2, brows: 0xf2f2f2, flag: '黃' },
  shu_strategist: { skin: 0xf3d2b0, robe: 0xe9efe6, armor: 0x5f8f6a, hat: 'scholar', hatColor: 0x2c3a2e, beard: 'goatee', beardColor: 0x1a1a1a, fan: 0xffffff, flag: '諸葛' },
  shu_heavy:      { skin: 0xd96b4b, robe: 0x1e5c34, armor: 0x222a24, hat: 'helmet',  hatColor: 0x26422e, beard: 'short',  beardColor: 0x111111, weaponStyle: 'serpent', flag: '張' },
  shu_cavalry:    { skin: 0xf5d6b8, robe: 0x2f8f4e, armor: 0xe8eff5, hat: 'helmet',  hatColor: 0xf2f6fa, plume: 0x2f8f4e, weaponStyle: 'lance', flag: '馬' },

  // 曹魏 6 將
  wei_blade:      { skin: 0xe8bf95, robe: 0x2d5fa8, armor: 0x23324a, hat: 'helmet',  hatColor: 0x23324a, beard: 'short',  beardColor: 0x1a1a1a, eyepatch: true, flag: '夏' },
  wei_rapid:      { skin: 0xe8bf95, robe: 0x2d5fa8, armor: 0x5878a8, hat: 'helmet',  hatColor: 0x3b4f73, plume: 0x2d5fa8, beard: 'short', beardColor: 0x1a1a1a, dual: true, flag: '張' },
  wei_archer:     { skin: 0xe8bf95, robe: 0x3c6fb8, armor: 0x7a8ca8, hat: 'band',    hatColor: 0x2d5fa8, beard: 'short',  beardColor: 0x2a2a2a, flag: '淵' },
  wei_strategist: { skin: 0xf0cfae, robe: 0x3b3570, armor: 0x2a2550, hat: 'tall',    hatColor: 0x151515, beard: 'goatee', beardColor: 0x1a1a1a, fan: 0x222222, flag: '司馬' },
  wei_heavy:      { skin: 0xe2b288, robe: 0x2d5fa8, armor: 0x8a6d32, hat: 'band',    hatColor: 0x2d5fa8, beard: 'short',  beardColor: 0x1a1a1a, weaponStyle: 'hammer', flag: '許' },
  wei_cavalry:    { skin: 0xd9a278, robe: 0x1e3a6d, armor: 0x2a2f3a, hat: 'band',    hatColor: 0x1a1a1a, beard: 'short',  beardColor: 0x1a1a1a, dual: true, flag: '典' },

  // 東吳 6 將
  wu_blade:       { skin: 0xd9a77e, robe: 0xb8332e, armor: 0xc7962f, hat: 'band',    hatColor: 0xb8332e, plume: 0xffc23a, bells: true, beard: 'short', beardColor: 0x2a1a10, flag: '甘' },
  wu_rapid:       { skin: 0xf6d8bb, robe: 0xd0383a, armor: 0xe0b040, hat: 'buns',    hatColor: 0x2a1a14, female: true, ring: true, flag: '孫' },
  wu_archer:      { skin: 0xe8bf95, robe: 0xb8332e, armor: 0xd6a83a, hat: 'helmet',  hatColor: 0xb8332e, plume: 0xd82020, beard: 'short', beardColor: 0x1a1a1a, flag: '太史' },
  wu_strategist:  { skin: 0xf6d8bb, robe: 0xc8302c, armor: 0xe7c46a, hat: 'scholar', hatColor: 0x8a1f1f, fan: 0xff6a2a, flag: '周' },
  wu_heavy:       { skin: 0xd9a77e, robe: 0x9e2420, armor: 0x3a3232, hat: 'band',    hatColor: 0xb8332e, beard: 'short',  beardColor: 0x1a1a1a, weaponStyle: 'dadao', flag: '周泰' },
  wu_cavalry:     { skin: 0xeac39e, robe: 0xf0eee9, armor: 0xc7962f, hat: 'helmet',  hatColor: 0xd8d4cc, plume: 0xb8332e, beard: 'goatee', beardColor: 0x222222, weaponStyle: 'lance', flag: '呂' },
};

const badgeCache = {};
function portraitBadge(src, color) {
  if (badgeCache[src]) return badgeCache[src];
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => {
    const x = c.getContext('2d');
    x.beginPath(); x.arc(128, 128, 122, 0, Math.PI * 2); x.fillStyle = '#' + new THREE.Color(color).getHexString(); x.fill();
    x.save(); x.beginPath(); x.arc(128, 128, 108, 0, Math.PI * 2); x.clip();
    x.drawImage(img, 0, 0, 256, 256); x.restore();
    x.lineWidth = 8; x.strokeStyle = '#f2cf5b'; x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2); x.stroke();
    tex.needsUpdate = true;
  };
  img.src = src;
  return (badgeCache[src] = tex);
}

function makeGeneral(type, color, lookKey) {
  const L = LOOKS[lookKey] || {};
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.5, 8), mat(0x8f877b)); base.position.y = 0.25;
  const body = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.6, 1.0, 10), mat(L.robe ?? color)); robe.position.y = 1.0;
  const armor = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.38, 0.4, 10), mat(L.armor ?? 0xb8a06a, { metalness: 0.35, roughness: 0.5 })); armor.position.y = 1.38;
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.08, 10), mat(color)); belt.position.y = 1.18;
  for (const sx of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), mat(L.armor ?? 0xb8a06a, { metalness: 0.35 })); sh.position.set(0.4 * sx, 1.52, 0); sh.scale.y = 0.7; body.add(sh);
  }
  const headY = 1.98;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), mat(L.skin ?? 0xf0c9a0)); head.position.y = headY;
  body.add(robe, armor, belt, head);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), mat(0x111111)); eye.position.set(0.14 * sx, headY + 0.02, 0.39);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 0.04), mat(L.brows ?? 0x1a1a1a)); brow.position.set(0.14 * sx, headY + 0.12, 0.38); brow.rotation.z = -0.25 * sx;
    body.add(eye, brow);
  }
  if (L.eyepatch) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.09, 10), mat(0x050505)); patch.position.set(-0.14, headY + 0.03, 0.415); body.add(patch);
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.018, 4, 24), mat(0x050505)); strap.position.y = headY + 0.06; strap.rotation.set(Math.PI / 2, 0.35, 0); body.add(strap);
  }
  if (L.beard === 'long') {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.85, 8), mat(L.beardColor)); b.position.set(0, headY - 0.55, 0.3); b.rotation.x = Math.PI + 0.25; body.add(b);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.06), mat(L.beardColor)); m.position.set(0, headY - 0.13, 0.4); body.add(m);
  } else if (L.beard === 'short') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 6, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45), mat(L.beardColor)); b.position.set(0, headY - 0.05, 0.06); body.add(b);
  } else if (L.beard === 'goatee') {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 6), mat(L.beardColor)); b.position.set(0, headY - 0.45, 0.33); b.rotation.x = Math.PI + 0.3; body.add(b);
  }
  const hc = L.hatColor ?? 0x2b2b2b;
  if (L.hat === 'turban') {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(hc)); t.position.y = headY + 0.03; body.add(t);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), mat(hc)); knot.position.set(0, headY + 0.42, -0.1); body.add(knot);
  } else if (L.hat === 'helmet') {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(hc, { metalness: 0.5, roughness: 0.4 })); t.position.y = headY + 0.02; body.add(t);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), mat(0xe8c060, { metalness: 0.6 })); spike.position.y = headY + 0.55; body.add(spike);
    if (L.plume) { const pl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), mat(L.plume)); pl.scale.set(0.8, 1.6, 0.8); pl.position.y = headY + 0.75; body.add(pl); }
  } else if (L.hat === 'scholar') {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.5), mat(hc)); t.position.y = headY + 0.42; body.add(t);
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.62), mat(hc)); r.position.y = headY + 0.5; body.add(r);
  } else if (L.hat === 'tall') {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.55, 8), mat(hc)); t.position.y = headY + 0.55; body.add(t);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 0.06), mat(hc)); wing.position.y = headY + 0.4; body.add(wing);
  } else if (L.hat === 'band') {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 4, 16), mat(hc)); t.position.y = headY + 0.14; t.rotation.x = Math.PI / 2; body.add(t);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.43, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), mat(0x1a1a1a)); hair.position.y = headY + 0.02; body.add(hair);
    if (L.plume) { const pl = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.7, 4), mat(L.plume)); pl.position.set(0.25, headY + 0.55, -0.1); pl.rotation.z = -0.5; body.add(pl); }
  } else if (L.hat === 'buns') {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.44, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(hc)); hair.position.y = headY + 0.02; body.add(hair);
    for (const sx of [-1, 1]) {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mat(hc)); bun.position.set(0.3 * sx, headY + 0.35, -0.05); body.add(bun);
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 4, 10), mat(0xd0383a)); rib.position.set(0.3 * sx, headY + 0.35, -0.05); body.add(rib);
    }
  }
  if (L.bells) for (const sx of [-0.2, 0, 0.2]) { const bell = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), mat(0xffd34d, { metalness: 0.7 })); bell.position.set(sx, 1.1, 0.42); body.add(bell); }

  // 武器
  let weapon = new THREE.Group();
  if (type === 'blade' || L.weaponStyle === 'dadao') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.4), mat(0x5b3a1e));
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.42), mat(0xdfe5ea, { metalness: 0.7, roughness: 0.25 })); blade.position.set(0, 1.3, 0.12);
    weapon.add(shaft, blade);
    if (lookKey === 'shu_blade') { const dragon = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 5, 10), mat(0x2f8f4e)); dragon.position.y = 0.9; weapon.add(dragon); }
    weapon.position.set(0.6, 1.4, 0.1);
  } else if (type === 'heavy') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.3), mat(0x4a2f18));
    weapon.add(shaft);
    if (L.weaponStyle === 'hammer') {
      const headM = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.48, 0.75), mat(0x5a626a, { metalness: 0.8, roughness: 0.3 }));
      headM.position.y = 1.25; weapon.add(headM);
    } else {
      // 丈八蛇矛
      const tip1 = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.55, 6), mat(0xe0e6ec, { metalness: 0.75 })); tip1.position.set(0, 1.4, 0.06); tip1.rotation.x = 0.2;
      const tip2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.45, 6), mat(0xe0e6ec, { metalness: 0.75 })); tip2.position.set(0, 1.05, -0.05); tip2.rotation.x = -0.25;
      weapon.add(tip1, tip2);
    }
    weapon.position.set(0.62, 1.4, 0.12);
  } else if (type === 'rapid' || type === 'cavalry') {
    if (L.ring) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 6, 20), mat(0xffcf4a, { metalness: 0.7, roughness: 0.3 }));
      ring.position.set(0.6, 1.35, 0.2); weapon.add(ring);
      const ring2 = ring.clone(); ring2.position.x = -0.6; weapon.add(ring2);
    } else {
      const mk = (x) => {
        const gg = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 2.4), mat(L.dual ? 0x3b3b3b : 0xeeeeee));
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.5, 6), mat(0xdfe5ea, { metalness: 0.75 })); tip.position.y = 1.4;
        gg.add(shaft, tip);
        if (L.dual) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.05), mat(0xdfe5ea, { metalness: 0.75 })); side.position.set(0.12, 1.08, 0); gg.add(side); }
        gg.position.set(x, 1.4, 0); gg.rotation.x = 0.42; return gg;
      };
      weapon.add(mk(0.6)); if (L.dual) weapon.add(mk(-0.6));
    }
  } else if (type === 'archer') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.045, 6, 16, Math.PI), mat(0x6b4a2b));
    bow.rotation.set(0, Math.PI / 2, Math.PI / 2); weapon.add(bow);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2), mat(0xeeeeee)); weapon.add(str);
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6), mat(0x7a4a2a)); quiver.position.set(-0.75, 0.15, -0.5); quiver.rotation.z = 0.4; weapon.add(quiver);
    weapon.position.set(0.55, 1.4, 0.25);
  } else {
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10, 0, Math.PI), mat(L.fan ?? 0xf5f0e6, { side: THREE.DoubleSide }));
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4), mat(0x6b4a2b)); handle.position.y = -0.2;
    weapon.add(fan, handle); weapon.position.set(0.55, 1.55, 0.3); weapon.rotation.set(0, 0.5, 0.2);
  }
  body.add(weapon);

  // 帥旗
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.0), mat(0x4a3a2a)); pole.position.set(-0.55, 1.8, -0.35);
  const fc = document.createElement('canvas'); fc.width = 128; fc.height = 160;
  const fx = fc.getContext('2d'); fx.fillStyle = '#' + new THREE.Color(color).getHexString(); fx.fillRect(0, 0, 128, 160);
  fx.strokeStyle = '#f2cf5b'; fx.lineWidth = 8; fx.strokeRect(6, 6, 116, 148);
  fx.fillStyle = '#fff7e0'; fx.font = `900 ${(L.flag || '').length > 1 ? 52 : 86}px "Noto Serif TC", serif`; fx.textAlign = 'center'; fx.textBaseline = 'middle';
  const ft = L.flag || ''; if (ft.length > 1) { fx.fillText(ft[0], 64, 52); fx.fillText(ft[1], 64, 110); } else fx.fillText(ft, 64, 84);
  const ftex = new THREE.CanvasTexture(fc); ftex.colorSpace = THREE.SRGBColorSpace;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), new THREE.MeshStandardMaterial({ map: ftex, side: THREE.DoubleSide, roughness: 0.9 }));
  flag.position.set(-0.55, 2.45, -0.04); flag.rotation.y = Math.PI / 2; flag.userData.wave = true;
  body.add(pole, flag);
  g.add(base, body);

  const badge = new THREE.Sprite(new THREE.SpriteMaterial({ map: portraitBadge(portrait(lookKey), color), depthWrite: false }));
  badge.scale.set(0.75, 0.75, 1); badge.position.y = 3.4;
  g.add(badge);
  weapon.userData.z0 = weapon.position.z; weapon.userData.rz0 = weapon.rotation.z;
  g.userData.body = body; g.userData.weapon = weapon;
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}

const additive = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, ...extra });

function makeEnemy(type) {
  const t = ENEMY_TYPES[type];
  const g = new THREE.Group();
  const inner = new THREE.Group();
  const mounted = !!t.mounted;
  const isElephant = !!t.elephant;
  const isCart = !!t.cart;
  const yOff = isElephant ? 0.85 : mounted ? 0.6 : isCart ? 0.35 : 0;

  if (isCart) {
    // 攻城衝車
    const cart = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 1.3), mat(0x5c3e24)); cart.position.y = 0.4;
    const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.5, 8), mat(0x3a3f45, { metalness: 0.7 }));
    ram.rotation.x = Math.PI / 2; ram.position.set(0, 0.55, 0.25);
    inner.add(cart, ram);
  } else if (isElephant) {
    // 南蠻巨象
    const elColor = type === 'mulu' ? 0xd8d6d0 : 0x6e6a64;
    const bodyE = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 1.25), mat(elColor)); bodyE.position.y = 0.65;
    const headE = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.5, 0.5), mat(elColor)); headE.position.set(0, 0.9, 0.75);
    const trunkE = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.55), mat(elColor)); trunkE.position.set(0, 0.65, 1.02); trunkE.rotation.x = 0.4;
    for (const sx of [-0.18, 0.18]) {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.45, 6), mat(0xf5f0e0));
      tusk.position.set(sx, 0.75, 1.05); tusk.rotation.x = Math.PI / 2 - 0.3; inner.add(tusk);
    }
    for (const [x, z] of [[-0.24, 0.42], [0.24, 0.42], [-0.24, -0.42], [0.24, -0.42]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.45, 6), mat(elColor)); leg.position.set(x, 0.22, z); inner.add(leg);
    }
    inner.add(bodyE, headE, trunkE);
  } else if (mounted) {
    const hc = t.horseColor || 0x6e4b2e;
    const horse = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 1.1), mat(hc)); horse.position.y = 0.55;
    const hh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.45, 0.4), mat(hc)); hh.position.set(0, 0.95, 0.55);
    const mane = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.6), mat(0x2a1a10)); mane.position.set(0, 0.9, 0.25);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.5, 5), mat(0x2a1a10)); tail.position.set(0, 0.55, -0.65); tail.rotation.x = -0.8;
    for (const [x, z] of [[-0.15, 0.4], [0.15, 0.4], [-0.15, -0.4], [0.15, -0.4]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.1), mat(hc)); leg.position.set(x, 0.15, z); inner.add(leg);
    }
    inner.add(horse, hh, mane, tail);
  }

  const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.35), mat(t.color)); bodyM.position.y = 0.55 + yOff;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.3), mat(0x4a3b2a)); legs.position.y = 0.15 + yOff;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(0xe8bf95)); head.position.y = 1.05 + yOff;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 4, 10), mat(t.boss ? 0xd23a2a : 0xf2d22e)); band.position.y = 1.12 + yOff; band.rotation.x = Math.PI / 2;
  if (mounted || isElephant || isCart) legs.visible = false;

  if (type === 'rattan' || type === 'wutugu') {
    for (let i = 0; i < 3; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 4, 10), mat(0x6b5020)); r.position.y = 0.38 + yOff + i * 0.17; r.rotation.x = Math.PI / 2; inner.add(r);
    }
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.18, 8), mat(0x8a6a2a)); hat.position.y = 1.25 + yOff; inner.add(hat);
  }
  if (t.fireTorch) {
    const torch = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.45, 6), additive(0xff6a1a)); torch.position.set(0.32, 1.1, 0.25); inner.add(torch);
  }
  if (t.hasShield) {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.82, 0.08), mat(0x5c4832)); sh.position.set(0, 0.55 + yOff, 0.28); inner.add(sh);
  }
  if (t.heal) {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6), mat(0x6b4a2b)); staff.position.set(0.35, 0.8 + yOff, 0);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), additive(0x8aff8a)); orb.position.set(0.35, 1.65 + yOff, 0);
    inner.add(staff, orb);
  }
  if (t.boss) {
    const halberd = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8), mat(0xd6a83a)); halberd.position.set(0.35, 0.8 + yOff, 0);
    const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.75), mat(0xa02020, { side: THREE.DoubleSide })); cape.position.set(0, 0.55 + yOff, -0.22);
    inner.add(halberd, cape);
  }
  inner.add(bodyM, legs, head, band);
  inner.scale.setScalar(t.scale);
  g.add(inner);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });

  const hpBar = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.1), new THREE.MeshBasicMaterial({ color: 0x2a1a12 }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.06), new THREE.MeshBasicMaterial({ color: 0x5ed15e }));
  fg.position.z = 0.001;
  hpBar.add(bg, fg);
  hpBar.position.y = (1.55 + yOff) * t.scale;
  g.add(hpBar);
  g.userData = { inner, hpBar, hpFg: fg };
  return g;
}

// ============================================================
//  遊戲狀態與戰場／陣營選單
// ============================================================
const state = {
  stage: 'chibi', faction: null, gold: DIFF.startGold, lives: DIFF.startLives, wave: 0, speed: 1,
  towers: [], enemies: [], projectiles: [], effects: [], timers: [],
  spawnQueue: [], spawnTimer: 0, waveActive: false,
  buildType: null, selected: null, over: false,
};

const $ = (id) => document.getElementById(id);
function toast(text, ms = 1600) {
  const el = $('toast'); el.textContent = text; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => el.classList.remove('show'), ms);
}
function currentWaves() {
  return STAGES[state.stage].waves;
}
function updateHud() {
  $('stage-name').textContent = STAGES[state.stage].name;
  $('gold').textContent = state.gold;
  $('lives').textContent = state.lives;
  $('wave').textContent = `${state.wave} / ${TOTAL_WAVES}`;
  $('wave-preview').textContent = state.wave < TOTAL_WAVES && !state.waveActive ? `下一波：${wavePreview(state.wave + 1)}` : '';
  $('wave-btn').disabled = state.waveActive || state.over;
  $('wave-btn').textContent = state.waveActive ? '交戰中' : (state.wave === 0 ? '出 戰' : '下一波');
  document.querySelectorAll('.tower-card').forEach(el => {
    el.classList.toggle('poor', ARCHETYPES[el.dataset.type].cost > state.gold);
    el.classList.toggle('active', el.dataset.type === state.buildType);
  });
  if (state.selected) refreshPanel();
}

// ---------- 四大古戰場選擇 ----------
const stageList = $('stage-list');
function renderStages() {
  stageList.innerHTML = '';
  for (const [id, st] of Object.entries(STAGES)) {
    const el = document.createElement('div');
    el.className = 'stage-card' + (state.stage === id ? ' active' : '');
    el.id = `stage-${id}`;
    el.innerHTML = `
      <span class="stage-badge">${st.badge}</span>
      <div class="stage-top">
        <img class="stage-boss-img" src="${portrait(st.bossPortrait)}" alt="${st.name}" />
        <div>
          <h4>${st.name}</h4>
          <div class="stage-sub">${st.sub}</div>
        </div>
      </div>
      <div class="stage-enemies">敵軍：${st.enemySummary}</div>
    `;
    el.onclick = () => selectStage(id);
    stageList.appendChild(el);
  }
}
function selectStage(id) {
  state.stage = id;
  renderStages();
  buildStageMap(id, state.faction ? FACTIONS[state.faction].color : 0x2f8f4e);
}

// ---------- 三大陣營選擇（各 6 員大將） ----------
const factionList = $('faction-list');
for (const [id, f] of Object.entries(FACTIONS)) {
  const el = document.createElement('div');
  el.className = 'faction'; el.id = `faction-${id}`;
  el.innerHTML = `<div class="seal" style="background:${f.css}">${f.seal}</div>
    <h3>${f.name}</h3><div class="lord">${f.lord}</div>
    <ul class="roster">${Object.entries(f.generals).map(([t, g]) => `<li><img src="${portrait(`${id}_${t}`)}" alt="${g.name}" /><b>${g.name}</b><span>${ARCHETYPES[t].role}</span></li>`).join('')}</ul>`;
  el.onclick = () => startGame(id);
  factionList.appendChild(el);
}

// 初始化預設戰場預覽
renderStages();
buildStageMap(state.stage);

function startGame(id, stageId = state.stage) {
  if (stageId && STAGES[stageId]) state.stage = stageId;
  // 清理舊局物件
  for (const t of state.towers) scene.remove(t.mesh);
  for (const e of state.enemies) scene.remove(e.mesh);
  for (const p of state.projectiles) scene.remove(p.mesh);
  for (const fx of state.effects) scene.remove(fx.mesh);
  Object.assign(state, {
    faction: id, gold: DIFF.startGold, lives: DIFF.startLives, wave: 0, speed: 1,
    towers: [], enemies: [], projectiles: [], effects: [], timers: [],
    spawnQueue: [], spawnTimer: 0, waveActive: false, buildType: null, selected: null, over: false, paused: false,
  });
  Sound.start();
  const f = FACTIONS[id];
  buildStageMap(state.stage, f.color);
  $('faction-screen').classList.add('hidden');
  $('end-screen').classList.add('hidden');
  ['hud', 'tower-bar'].forEach(i => $(i).classList.remove('hidden'));
  const bar = $('tower-bar'); bar.innerHTML = '';
  Object.keys(ARCHETYPES).forEach((t, i) => {
    const a = ARCHETYPES[t], g = f.generals[t];
    const el = document.createElement('div');
    el.className = 'tower-card'; el.dataset.type = t; el.id = `card-${t}`;
    el.innerHTML = `<img class="portrait" src="${portrait(`${id}_${t}`)}" alt="${g.name}" /><span class="key">${i + 1}</span><div class="name">${g.name}</div><div class="role">${a.role}</div><div class="cost">${a.cost} 糧</div>`;
    el.onclick = () => selectBuild(t);
    bar.appendChild(el);
  });
  toast(`${STAGES[state.stage].name} · ${f.name}出征`);
  showTutorial();
  updateHud();
}

$('menu-btn').onclick = () => {
  state.paused = true;
  selectTower(null);
  hideRange();
  $('faction-screen').classList.remove('hidden');
};

// ---------- 新手教學 ----------
const TUT = [
  { key: 'select', text: '① 點選下方的武將卡片（或按數字鍵 1～6）', target: 'tower-bar' },
  { key: 'place', text: '② 點擊道路旁的空地佈陣武將', target: null },
  { key: 'wave', text: '③ 按「出戰」迎敵！怒氣滿了點武將放無雙', target: 'wave-btn' },
];
let tutIdx = localStorage.getItem('sanguo_tut_done') ? TUT.length : 0;
function showTutorial() {
  const el = $('tutorial');
  if (tutIdx >= TUT.length || !state.faction) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden'); el.textContent = TUT[tutIdx].text;
  document.querySelectorAll('.tut-glow').forEach(x => x.classList.remove('tut-glow'));
  if (TUT[tutIdx].target) $(TUT[tutIdx].target).classList.add('tut-glow');
}
function tutorialStep(key) {
  if (tutIdx < TUT.length && TUT[tutIdx].key === key) {
    tutIdx++;
    if (tutIdx >= TUT.length) { localStorage.setItem('sanguo_tut_done', '1'); document.querySelectorAll('.tut-glow').forEach(x => x.classList.remove('tut-glow')); }
    showTutorial();
  }
}
function selectBuild(t) {
  state.buildType = state.buildType === t ? null : t;
  selectTower(null);
  if (state.buildType) tutorialStep('select');
  updateHud();
}

// ---------- 滑鼠互動 ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hoverMarker = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.96, 0.08, CELL * 0.96), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 }));
hoverMarker.position.y = 0.1; hoverMarker.visible = false; scene.add(hoverMarker);
const rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.96, 1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
rangeRing.rotation.x = -Math.PI / 2; rangeRing.position.y = 0.12; rangeRing.visible = false; scene.add(rangeRing);
const rangeDisc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
rangeDisc.rotation.x = -Math.PI / 2; rangeDisc.position.y = 0.11; rangeDisc.visible = false; scene.add(rangeDisc);
let hoverCell = null;

function showRange(pos, r, color = 0xffffff) {
  for (const m of [rangeRing, rangeDisc]) { m.visible = true; m.position.x = pos.x; m.position.z = pos.z; m.scale.setScalar(r); m.material.color.set(color); }
}
function hideRange() { rangeRing.visible = rangeDisc.visible = false; }
const towerAt = (c, r) => state.towers.find(t => t.c === c && t.r === r);
const canBuild = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS && !pathCells.has(key(c, r)) && !blocked.has(key(c, r)) && !towerAt(c, r);

function pickCell(ev) {
  mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(groundPlane, hit)) return null;
  const [c, r] = worldToCell(hit);
  return (c < 0 || r < 0 || c >= COLS || r >= ROWS) ? null : [c, r];
}

canvas.addEventListener('pointermove', (ev) => {
  if (!state.faction) return;
  hoverCell = pickCell(ev);
  if (!hoverCell) { hoverMarker.visible = false; if (!state.selected) hideRange(); return; }
  const [c, r] = hoverCell, p = cellToWorld(c, r);
  hoverMarker.visible = true; hoverMarker.position.x = p.x; hoverMarker.position.z = p.z;
  if (state.buildType) {
    const ok = canBuild(c, r) && ARCHETYPES[state.buildType].cost <= state.gold;
    hoverMarker.material.color.set(ok ? 0x9cff8a : 0xff6b5a);
    showRange(p, ARCHETYPES[state.buildType].range, ok ? 0xffffff : 0xff8a7a);
  } else {
    hoverMarker.material.color.set(towerAt(c, r) ? 0xffe08a : 0xffffff);
    if (!state.selected) hideRange();
  }
  canvas.style.cursor = (state.buildType || towerAt(c, r)) ? 'pointer' : 'default';
});

canvas.addEventListener('pointerdown', (ev) => {
  if (ev.button !== 0 || !state.faction || state.over) return;
  const cell = pickCell(ev);
  if (!cell) { selectTower(null); return; }
  const [c, r] = cell;
  if (state.buildType) {
    if (!canBuild(c, r)) { toast('此處不可佈陣'); return; }
    const a = ARCHETYPES[state.buildType];
    if (a.cost > state.gold) { toast('糧餉不足'); return; }
    placeTower(state.buildType, c, r);
    if (!ev.shiftKey) state.buildType = null;
    updateHud();
  } else {
    const t = towerAt(c, r);
    if (t && t.ready) { if (!castUltimate(t)) toast('射程內沒有敵人'); return; }
    selectTower(t || null);
  }
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

window.addEventListener('keydown', (e) => {
  if (!state.faction) return;
  const types = Object.keys(ARCHETYPES);
  if (e.key >= '1' && e.key <= '6') selectBuild(types[+e.key - 1]);
  if (e.key === 'Escape') { state.buildType = null; selectTower(null); hideRange(); updateHud(); }
  if (e.key === ' ') { e.preventDefault(); startWave(); }
  if (e.key === 'p' || e.key === 'P') togglePause();
  if (e.key === 'q' || e.key === 'Q') { for (const t of state.towers) if (t.ready) castUltimate(t); }
});

// ---------- 武將（塔） ----------
function towerStats(t) {
  const a = ARCHETYPES[t.type], k = t.level - 1;
  return {
    dmg: Math.round(a.dmg * Math.pow(1.55, k)),
    range: +(a.range * Math.pow(1.1, k)).toFixed(1),
    rate: +(a.rate * Math.pow(1.12, k)).toFixed(2),
    splash: a.splash, slow: a.slow, stun: a.stun, armorBreak: a.armorBreak, pierce: a.pierce,
  };
}
const upgradeCost = (t) => Math.round(ARCHETYPES[t.type].cost * 0.9 * t.level);
const sellValue = (t) => Math.round(t.spent * 0.6);

function placeTower(type, c, r) {
  const a = ARCHETYPES[type];
  state.gold -= a.cost;
  const mesh = makeGeneral(type, FACTIONS[state.faction].color, `${state.faction}_${type}`);
  const p = cellToWorld(c, r);
  mesh.position.copy(p);
  mesh.scale.setScalar(0.01);
  scene.add(mesh);
  const t = { type, c, r, level: 1, mesh, cooldown: 0, spent: a.cost, pos: p, spawnT: 0, stars: [], rage: 0 };
  const rb = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.12), new THREE.MeshBasicMaterial({ color: 0x2a1a12 }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.08), new THREE.MeshBasicMaterial({ color: 0xffb020 }));
  fg.position.z = 0.002; rb.add(bg, fg); rb.userData.fg = fg; rb.position.y = 2.9;
  mesh.add(rb); t.rageBar = rb;
  t.readyRing = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.35, 32), additive(0xffc23a));
  t.readyRing.rotation.x = -Math.PI / 2; t.readyRing.position.y = 0.55; t.readyRing.visible = false; mesh.add(t.readyRing);
  if (state.buildType) tutorialStep('place');
  state.towers.push(t);
  spawnDust(p);
  Sound.play('build');
  return t;
}

function addStar(t) {
  const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), mat(0xffd34d, { emissive: 0x8a6a00 }));
  const i = t.stars.length;
  s.position.set(-0.3 + i * 0.3, 0.6, 0.8);
  t.mesh.add(s); t.stars.push(s);
}

function selectTower(t) {
  state.selected = t;
  if (!t) { $('tower-panel').classList.add('hidden'); hideRange(); return; }
  state.buildType = null;
  $('tower-panel').classList.remove('hidden');
  refreshPanel();
  updateHud();
}
function refreshPanel() {
  const t = state.selected, g = FACTIONS[state.faction].generals[t.type], s = towerStats(t);
  $('tp-name').textContent = `${g.name}　Lv.${t.level}`;
  $('tp-portrait').src = portrait(`${state.faction}_${t.type}`);
  $('tp-desc').textContent = g.desc;
  $('tp-stats').innerHTML = `<dt>攻擊</dt><dd>${s.dmg}</dd><dt>射程</dt><dd>${s.range}</dd><dt>攻速</dt><dd>${s.rate}/秒</dd>${s.splash ? `<dt>範圍</dt><dd>${s.splash}</dd>` : ''}${s.slow ? `<dt>緩速</dt><dd>${s.slow * 100}%</dd>` : ''}${s.stun ? `<dt>震暈</dt><dd>${s.stun}秒</dd>` : ''}${s.pierce ? `<dt>特性</dt><dd>直線貫穿</dd>` : ''}`;
  const up = $('tp-upgrade');
  if (t.level >= 3) { up.textContent = '已達頂級'; up.disabled = true; }
  else { up.textContent = `晉升 ${upgradeCost(t)} 糧`; up.disabled = upgradeCost(t) > state.gold; }
  $('tp-sell').textContent = `撤兵 +${sellValue(t)}`;
  showRange(t.pos, s.range, 0xffe08a);
}
$('tp-upgrade').onclick = () => {
  const t = state.selected; if (!t || t.level >= 3) return;
  const cost = upgradeCost(t); if (cost > state.gold) return;
  state.gold -= cost; t.spent += cost; t.level++; addStar(t);
  t.mesh.userData.body.scale.setScalar(1 + (t.level - 1) * 0.12);
  spawnDust(t.pos, 0xffd34d, 20);
  spawnPillar(t.pos, 0xffd34d, 5, 0.9, 0.6);
  Sound.play('ult');
  floatText(t.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), `晉升 Lv.${t.level}`, 'ult-name');
  if (t.level === 3 && !t.aura) {
    t.aura = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.25, 6), additive(0xffd34d));
    t.aura.rotation.x = -Math.PI / 2; t.aura.position.y = 0.08; t.mesh.add(t.aura);
  }
  updateHud();
};
$('tp-sell').onclick = () => {
  const t = state.selected; if (!t) return;
  state.gold += sellValue(t);
  scene.remove(t.mesh);
  state.towers.splice(state.towers.indexOf(t), 1);
  selectTower(null); updateHud();
};

// ---------- 波次 ----------
function buildWave(n) {
  const q = [];
  for (const [type, count, gap] of currentWaves()[n]) for (let i = 0; i < count; i++) q.push({ type, gap });
  return q;
}
function wavePreview(n) {
  const w = currentWaves()[n];
  if (!w) return '';
  const cnt = {};
  for (const [t, c] of w) cnt[t] = (cnt[t] || 0) + c;
  return Object.entries(cnt).map(([t, c]) => `${ENEMY_TYPES[t].boss ? '⚠ ' : ''}${ENEMY_TYPES[t].name}×${c}`).join('　');
}
function startWave() {
  if (state.waveActive || state.over || !state.faction) return;
  state.wave++;
  state.spawnQueue = buildWave(state.wave);
  state.spawnTimer = 0.5;
  state.waveActive = true;
  Sound.play('gong'); Sound.setIntense(true);
  const bossT = currentWaves()[state.wave].map(w => w[0]).filter(t => ENEMY_TYPES[t].boss).pop();
  toast(bossT ? `第 ${state.wave} 波 · ${ENEMY_TYPES[bossT].name}來襲！` : `第 ${state.wave} 波`);
  if (bossT) {
    const b = $('boss-banner');
    const et = ENEMY_TYPES[bossT];
    const pKey = et.portrait || STAGES[state.stage].bossPortrait;
    b.querySelector('img').src = portrait(pKey);
    b.querySelector('img').style.display = et.portrait ? '' : 'none';
    b.querySelector('b').textContent = et.name;
    b.querySelector('span').textContent = et.quote || '敵軍大將親率精銳壓境！';
    b.classList.add('show'); setTimeout(() => b.classList.remove('show'), 2800);
  }
  tutorialStep('wave');
  updateHud();
}
$('wave-btn').onclick = startWave;
function togglePause() { if (!state.faction || state.over) return; state.paused = !state.paused; $('pause-btn').textContent = state.paused ? '▶ 繼續' : '⏸ 暫停'; $('pause-overlay').classList.toggle('hidden', !state.paused); }
$('pause-btn').onclick = togglePause;
$('pause-overlay').onclick = togglePause;
$('ult-btn').onclick = () => { state.autoUlt = !state.autoUlt; $('ult-btn').textContent = state.autoUlt ? '無雙 自動' : '無雙 手動'; };
$('music-btn').onclick = () => { $('music-btn').textContent = Sound.toggle() ? '♪ 音樂 開' : '♪ 音樂 關'; };
$('speed-btn').onclick = () => {
  state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 3 : 1;
  $('speed-btn').textContent = `速度 ×${state.speed}`;
};

function spawnEnemy(type) {
  const t = ENEMY_TYPES[type];
  const hpScale = (1 + (state.wave - 1) * (t.boss ? DIFF.bossGrowth : DIFF.hpGrowth)) * DIFF.hpMul;
  const speedScale = (DIFF.speedMul || 1) * (1 + (state.wave - 1) * 0.025);
  const mesh = makeEnemy(type);
  mesh.position.copy(pathPoints[0]);
  scene.add(mesh);
  state.enemies.push({ type, mesh, hp: Math.round(t.hp * hpScale), maxHp: Math.round(t.hp * hpScale), speed: +(t.speed * speedScale).toFixed(2), reward: t.reward, armor: !!t.armor, heal: !!t.heal, healT: 2, seg: 0, dist: 0, slowT: 0, slow: 1, bob: Math.random() * 6, dead: false });
}

// ---------- 特效 ----------
function spawnDust(pos, color = 0xd9c9a0, count = 10, y = 0.3) {
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.12), new THREE.MeshBasicMaterial({ color, transparent: true }));
    m.position.copy(pos).add(new THREE.Vector3(0, y, 0));
    const v = new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4);
    scene.add(m);
    state.effects.push({ mesh: m, life: 0.6, max: 0.6, update: (e, dt) => { v.y -= 9 * dt; m.position.addScaledVector(v, dt); m.rotation.x += dt * 8; } });
  }
}
function spawnRing(pos, radius, color) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.3, pos.z);
  scene.add(m);
  state.effects.push({ mesh: m, life: 0.35, max: 0.35, update: (e) => { const k = 1 - e.life / e.max; m.scale.setScalar(0.3 + k * radius); } });
}

const PROJ = {
  rapid:      { color: 0xeaf2ff, speed: 26, geo: new THREE.SphereGeometry(0.1, 6, 4) },
  archer:     { color: 0x6b4a2b, speed: 30, geo: new THREE.CylinderGeometry(0.03, 0.03, 0.8).rotateX(Math.PI / 2) },
  strategist: { color: 0x9fe3ff, speed: 14, geo: new THREE.IcosahedronGeometry(0.22, 0) },
};
const STRAT_COLOR = { shu: 0x9fe3ff, wei: 0xb9a0ff, wu: 0xff8a3a };

let shakeAmt = 0, hitStopT = 0;
const shake = (a) => { shakeAmt = Math.max(shakeAmt, a); };
const later = (delay, fn) => state.timers.push({ t: delay, fn });

function spawnSlash(t, target, color, big = 1) {
  const m = new THREE.Mesh(new THREE.RingGeometry(1.0 * big, 1.9 * big, 32, 1, 0, Math.PI * 1.1), additive(color));
  m.rotation.x = -Math.PI / 2; m.position.set(t.pos.x, 1.0, t.pos.z);
  const base = Math.atan2(target.mesh.position.z - t.pos.z, target.mesh.position.x - t.pos.x);
  scene.add(m);
  state.effects.push({ mesh: m, life: 0.28, max: 0.28, update: (e) => { const k = 1 - e.life / e.max; m.rotation.z = base - 1.6 + k * 3.4; m.scale.setScalar(1 + k * 1.3); } });
}
function spawnPillar(pos, color, h = 7, r = 0.5, life = 0.55) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.5, h, 14, 1, true), additive(color));
  m.position.set(pos.x, h / 2, pos.z); scene.add(m);
  state.effects.push({ mesh: m, life, max: life, update: (e) => { const k = 1 - e.life / e.max; m.scale.set(1 + k, Math.min(1, k * 6), 1 + k); m.rotation.y += 0.3; } });
  spawnRing(pos, r * 4, color);
}
function spawnBolt(pos, color) {
  const pts = [];
  for (let y = 13; y > 0; y -= 1.3) pts.push(new THREE.Vector3(pos.x + (Math.random() - 0.5) * 1.2, y, pos.z + (Math.random() - 0.5) * 1.2));
  pts.push(new THREE.Vector3(pos.x, 0.2, pos.z));
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.09, 5), additive(color));
  scene.add(m);
  state.effects.push({ mesh: m, life: 0.3, max: 0.3, update: () => {} });
}
function spawnStreak(a, b, color) {
  const A = a.clone().setY(1.3), B = b.clone().setY(0.8), len = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, len), additive(color));
  m.position.copy(A).lerp(B, 0.5); m.lookAt(B); scene.add(m);
  state.effects.push({ mesh: m, life: 0.22, max: 0.22, update: () => {} });
}
function spawnFallingArrow(p, onHit) {
  const m = new THREE.Mesh(PROJ.archer.geo, additive(0xffe9a8));
  const start = new THREE.Vector3(p.x - 2.5, 10, p.z - 1);
  m.position.copy(start); m.lookAt(p); scene.add(m);
  state.effects.push({ mesh: m, life: 0.32, max: 0.32, noFade: true, update: (e) => { m.position.lerpVectors(start, p, 1 - e.life / e.max); }, onEnd: () => { spawnDust(p, 0xd9c9a0, 3, 0.1); onHit(); } });
}
function spawnTrail(pos, color) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), additive(color));
  m.position.copy(pos); scene.add(m);
  state.effects.push({ mesh: m, life: 0.18, max: 0.18, update: (e) => m.scale.setScalar(e.life / e.max) });
}
function stratFx(p, big) {
  if (state.faction === 'shu') { spawnBolt(p, 0xbfefff); if (big) { spawnBolt(p, 0xffffff); spawnPillar(p, 0x3fa6d8, 5, 0.35); } else spawnRing(p, 2.6, 0x9fe3ff); }
  else if (state.faction === 'wei') spawnPillar(p, 0x9a6bff, big ? 9 : 4, big ? 0.9 : 0.45);
  else { spawnPillar(p, 0xff7a2a, big ? 8 : 3.5, big ? 0.9 : 0.45); spawnDust(p, 0xffa040, big ? 14 : 5, 0.3); }
}
function spawnDeath(e) {
  const m = e.mesh;
  m.userData.hpBar.visible = false;
  m.traverse(o => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; } });
  const dir = new THREE.Vector3(-Math.sin(m.rotation.y), 0, -Math.cos(m.rotation.y));
  state.effects.push({ mesh: m, life: 0.75, max: 0.75, noFade: true, update: (fx, dt) => {
    const k = 1 - fx.life / fx.max;
    m.userData.inner.rotation.x = -k * 1.6;
    m.position.addScaledVector(dir, dt * 3 * (1 - k));
    m.position.y = Math.sin(k * Math.PI) * 0.6 - k * 0.3;
    m.traverse(o => { if (o.material) o.material.opacity = 1 - k * k; });
  } });
}

function fire(t, target) {
  const s = towerStats(t);
  const body = t.mesh.userData.body;
  body.lookAt(target.mesh.position.x, t.pos.y + 1, target.mesh.position.z);
  body.rotation.x = 0; body.rotation.z = 0;
  t.punch = 0.15;
  t.rage = Math.min(RAGE_MAX[t.type], (t.rage || 0) + 1);
  if (t.rage >= RAGE_MAX[t.type]) {
    if (state.autoUlt) { castUltimate(t); return; }
    if (!t.ready) { t.ready = true; if (!state.ultHinted) { state.ultHinted = true; toast('怒氣已滿！點擊發光的武將施放無雙', 2600); } }
  }
  t.anim = 0.3;
  if (t.type === 'blade') {
    spawnSlash(t, target, FACTIONS[state.faction].color);
    spawnSlash(t, target, 0xfff3c0, 0.8);
    Sound.play('slash');
    for (const e of state.enemies) if (!e.dead && e.mesh.position.distanceTo(t.pos) <= s.range) hit(e, s.dmg);
    return;
  }
  if (t.type === 'heavy') {
    // 重擊破甲：對目標點周圍震地重擊並短暫震暈
    const impact = target.mesh.position.clone();
    spawnRing(impact, s.splash, 0xffb83a);
    spawnDust(impact, 0xffd070, 12, 0.35);
    Sound.play('boom'); shake(0.12);
    for (const e of state.enemies) if (!e.dead && e.mesh.position.distanceTo(impact) <= s.splash) {
      hit(e, s.dmg, { armorBreak: true });
      e.slow = 0.1; e.slowT = Math.max(e.slowT, s.stun || 0.45);
    }
    return;
  }
  if (t.type === 'cavalry') {
    // 鐵騎貫穿：朝目標方向貫穿整條射程直線上的敵人
    const dir = new THREE.Vector3().subVectors(target.mesh.position, t.pos).setY(0).normalize();
    const endP = t.pos.clone().addScaledVector(dir, s.range);
    spawnStreak(t.pos, endP, FACTIONS[state.faction].color);
    spawnStreak(t.pos, endP, 0xffffff);
    Sound.play('stab');
    for (const e of state.enemies) {
      if (e.dead) continue;
      const toE = new THREE.Vector3().subVectors(e.mesh.position, t.pos).setY(0);
      const proj = toE.dot(dir);
      if (proj > 0 && proj <= s.range + 0.5) {
        const perp = toE.clone().addScaledVector(dir, -proj).length();
        if (perp <= 1.35) hit(e, s.dmg, { armorBreak: true });
      }
    }
    return;
  }
  Sound.play(t.type === 'archer' ? 'bow' : t.type === 'rapid' ? 'stab' : 'magic');
  const p = PROJ[t.type];
  const color = t.type === 'strategist' ? STRAT_COLOR[state.faction] : p.color;
  const m = new THREE.Mesh(p.geo, new THREE.MeshBasicMaterial({ color }));
  m.position.copy(t.pos).add(new THREE.Vector3(0, 1.8, 0));
  scene.add(m);
  state.projectiles.push({ mesh: m, target, speed: p.speed, dmg: s.dmg, splash: s.splash, slow: s.slow, type: t.type, color: t.type === 'archer' ? 0xffe9a8 : color });
}

function ultTarget(t) {
  const r = towerStats(t).range * 1.6;
  let best = null;
  for (const e of state.enemies) if (!e.dead && e.mesh.position.distanceTo(t.pos) <= r && (!best || e.progress > best.progress)) best = e;
  return best;
}
function castUltimate(t) {
  const target = ultTarget(t);
  if (!target) return false;
  t.rage = 0; t.ready = false; t.anim = 0.45;
  ultimate(t, target, towerStats(t));
  return true;
}
function ultimate(t, target, s) {
  const f = FACTIONS[state.faction], color = f.color;
  const shown = cutIn(portrait(`${state.faction}_${t.type}`), f.generals[t.type].name, ULTS[state.faction][t.type], f.css, QUOTES[`${state.faction}_${t.type}`]);
  if (shown) hitStopT = 0.45;
  Sound.play('ult'); shake(0.35);
  floatText(t.pos.clone().add(new THREE.Vector3(0, 1.2, 0)), ULTS[state.faction][t.type], 'ult-name');
  const inRange = (r) => state.enemies.filter(e => !e.dead && e.mesh.position.distanceTo(t.pos) <= r);
  if (t.type === 'blade') {
    for (let i = 0; i < 3; i++) later(i * 0.16, () => {
      spawnRing(t.pos, s.range * 1.4, 0xffe28a);
      spawnSlash(t, target, color, 1.5); spawnSlash(t, target, 0xffffff, 1.2);
      Sound.play('slash'); shake(0.22);
      for (const e of inRange(s.range * 1.4)) hit(e, s.dmg * 1.6, { cls: 'ult' });
    });
  } else if (t.type === 'heavy') {
    // 燕人咆哮／虎痴破軍／不屈血戰：3 波巨型裂地震波＋全場震暈破甲
    for (let i = 0; i < 3; i++) later(i * 0.2, () => {
      spawnPillar(t.pos, 0xffaa22, 8, 1.1, 0.55);
      spawnRing(t.pos, s.range * 1.7, 0xff6a1a);
      Sound.play('boom'); shake(0.35);
      for (const e of inRange(s.range * 1.7)) {
        hit(e, s.dmg * 1.85, { cls: 'ult', armorBreak: true });
        e.slow = 0.05; e.slowT = 2.0;
      }
    });
  } else if (t.type === 'rapid' || t.type === 'cavalry') {
    const targets = inRange(s.range * 1.6).sort((a, b) => b.progress - a.progress);
    if (!targets.length) targets.push(target);
    const hits = t.type === 'cavalry' ? 6 : 7;
    for (let i = 0; i < hits; i++) later(i * 0.08, () => {
      const e = targets.filter(x => !x.dead)[i % Math.max(1, targets.length)] || targets.find(x => !x.dead);
      if (!e) return;
      spawnStreak(t.pos, e.mesh.position, 0xffffff); spawnStreak(t.pos, e.mesh.position, color);
      if (t.type === 'cavalry') spawnRing(e.mesh.position, 2.2, color);
      Sound.play('stab'); hit(e, s.dmg * (t.type === 'cavalry' ? 2.4 : 4), { cls: 'ult', armorBreak: true });
    });
  } else if (t.type === 'archer') {
    const center = target.mesh.position.clone();
    for (let i = 0; i < 30; i++) later(i * 0.025, () => {
      const p = center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 5, 0, (Math.random() - 0.5) * 5));
      spawnFallingArrow(p, () => { for (const e of state.enemies) if (!e.dead && e.mesh.position.distanceTo(p) < 1.3) hit(e, s.dmg * 0.7, { cls: 'ult', crit: false }); });
    });
    later(0.15, () => Sound.play('bow')); later(0.4, () => Sound.play('bow'));
  } else {
    const targets = inRange(s.range * 1.6).slice(0, 6);
    if (!targets.length) targets.push(target);
    targets.forEach((e, i) => later(i * 0.12, () => {
      const p = e.mesh.position.clone();
      stratFx(p, true); Sound.play('boom'); shake(0.25);
      for (const x of state.enemies) if (!x.dead && x.mesh.position.distanceTo(p) < 2.6) { hit(x, s.dmg * 4, { cls: 'ult', magic: true }); x.slow = 0.3; x.slowT = 2.5; }
    }));
  }
}

function hit(e, dmg, opts = {}) {
  if (e.dead) return;
  const crit = opts.crit ?? Math.random() < 0.15;
  let mul = crit ? 2 : 1;
  if (e.armor && !opts.armorBreak) mul *= opts.magic ? (state.faction === 'wu' ? 2.2 : 1.5) : 0.5;
  const d = Math.round(dmg * mul);
  floatText(e.mesh.position, crit ? `暴擊 ${d}` : `${d}`, crit ? 'crit' : (e.armor && !opts.magic && !opts.armorBreak ? 'block' : (opts.cls || '')));
  spawnDust(e.mesh.position, crit ? 0xffd34d : 0xfff1c0, crit ? 8 : 4, 0.7);
  e.knock = 0.12;
  damage(e, d);
}

function damage(e, dmg) {
  if (e.dead) return;
  e.hp -= dmg;
  e.flash = 0.1;
  if (e.hp <= 0) {
    e.dead = true;
    state.gold += e.reward;
    floatText(e.mesh.position.clone().add(new THREE.Vector3(0, 0.6, 0)), `+${e.reward} 糧`, 'gold');
    Sound.play('coin');
    if (ENEMY_TYPES[e.type].boss) { shake(0.6); Sound.play('boom'); spawnPillar(e.mesh.position, 0xffd34d, 10, 1.2, 0.9); toast(`${ENEMY_TYPES[e.type].name}敗走！`); }
    spawnDeath(e);
    updateHud();
  }
}

// ============================================================
//  主迴圈
// ============================================================
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
let elapsed = 0;

function update(dt) {
  elapsed += dt;
  if (state.waveActive && state.spawnQueue.length) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) { const s = state.spawnQueue.shift(); spawnEnemy(s.type); state.spawnTimer = s.gap; }
  }
  for (const e of state.enemies) {
    if (e.dead) continue;
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slow = 1; }
    if (e.heal) {
      e.healT -= dt;
      if (e.healT <= 0) {
        e.healT = 2.2; spawnRing(e.mesh.position, 4, 0x6aff6a);
        for (const o of state.enemies) if (!o.dead && o !== e && o.mesh.position.distanceTo(e.mesh.position) < 4) {
          const h = Math.round(o.maxHp * 0.08); o.hp = Math.min(o.maxHp, o.hp + h); floatText(o.mesh.position, `+${h}`, 'heal');
        }
      }
    }
    let move = e.speed * e.slow * dt;
    while (move > 0 && e.seg < pathPoints.length - 1) {
      const a = pathPoints[e.seg], b = pathPoints[e.seg + 1];
      const segLen = a.distanceTo(b);
      const remain = segLen - e.dist;
      if (move < remain) { e.dist += move; move = 0; }
      else { move -= remain; e.seg++; e.dist = 0; }
    }
    if (e.seg >= pathPoints.length - 1) {
      e.dead = true; scene.remove(e.mesh);
      state.lives -= ENEMY_TYPES[e.type].lives || 1;
      Sound.play('hurt'); shake(0.3);
      toast('城門告急！', 900);
      if (state.lives <= 0) { state.lives = 0; endGame(false); }
      updateHud();
      continue;
    }
    const a = pathPoints[e.seg], b = pathPoints[e.seg + 1];
    tmp.subVectors(b, a).normalize();
    e.mesh.position.copy(a).addScaledVector(tmp, e.dist);
    e.progress = e.seg * 1000 + e.dist;
    e.mesh.rotation.y = Math.atan2(tmp.x, tmp.z);
    e.bob += dt * 10 * e.slow;
    e.mesh.userData.inner.position.y = Math.abs(Math.sin(e.bob)) * 0.12;
    e.mesh.userData.inner.position.z = e.knock > 0 ? -e.knock * 2.5 : 0;
    if (e.knock > 0) e.knock -= dt;
    const hb = e.mesh.userData.hpBar;
    hb.quaternion.copy(e.mesh.quaternion).invert().multiply(camera.quaternion);
    const k = Math.max(0, e.hp / e.maxHp);
    e.mesh.userData.hpFg.scale.x = k; e.mesh.userData.hpFg.position.x = -0.43 * (1 - k);
    e.mesh.userData.hpFg.material.color.setHSL(0.33 * k, 0.65, 0.5);
    e.mesh.userData.inner.children.forEach(ch => { if (ch.material && ch.material.emissive) ch.material.emissive.setHex(e.flash > 0 ? 0x661111 : (e.slow < 1 ? 0x113355 : 0)); });
    if (e.flash > 0) e.flash -= dt;
  }
  state.enemies = state.enemies.filter(e => !e.dead);

  for (const t of state.towers) {
    if (t.spawnT < 1) { t.spawnT = Math.min(1, t.spawnT + dt * 4); const s = 1 - Math.pow(1 - t.spawnT, 3); t.mesh.scale.setScalar(s * (1 + 0.15 * Math.sin(t.spawnT * Math.PI))); }
    if (t.punch > 0) { t.punch -= dt; t.mesh.userData.body.position.y = Math.sin((t.punch / 0.15) * Math.PI) * 0.25; }
    const rb = t.rageBar, rk = Math.min(1, (t.rage || 0) / RAGE_MAX[t.type]);
    rb.quaternion.copy(camera.quaternion);
    rb.userData.fg.scale.x = Math.max(0.001, rk); rb.userData.fg.position.x = -0.48 * (1 - rk);
    rb.userData.fg.material.color.setHSL(0.1 - rk * 0.1, 0.9, 0.5 + 0.15 * Math.sin(elapsed * 12) * (rk > 0.8 ? 1 : 0));
    if (t.aura) t.aura.rotation.z += dt * 2;
    t.readyRing.visible = !!t.ready;
    if (t.ready) { const k = 1 + 0.15 * Math.sin(elapsed * 8); t.readyRing.scale.set(k, k, k); t.readyRing.material.opacity = 0.6 + 0.4 * Math.sin(elapsed * 8); }
    const w = t.mesh.userData.weapon;
    if (w) {
      const k = t.anim > 0 ? Math.sin((1 - t.anim / 0.3) * Math.PI) : 0;
      if (t.anim > 0) t.anim -= dt;
      if (t.type === 'blade' || t.type === 'heavy') { w.rotation.x = -k * 1.8; w.rotation.y = k * 0.6; }
      else if (t.type === 'rapid' || t.type === 'cavalry') { w.position.z = w.userData.z0 + k * 0.65; }
      else if (t.type === 'archer') { w.position.z = w.userData.z0 - k * 0.25; w.scale.setScalar(1 + k * 0.15); }
      else { w.rotation.z = w.userData.rz0 + Math.sin(k * Math.PI * 2) * 0.9; }
    }
    t.cooldown -= dt;
    if (t.cooldown > 0) continue;
    const s = towerStats(t);
    let best = null;
    for (const e of state.enemies) {
      if (e.mesh.position.distanceTo(t.pos) > s.range) continue;
      if (!best || e.progress > best.progress) best = e;
    }
    if (best) { fire(t, best); t.cooldown = 1 / s.rate; }
  }

  for (const p of state.projectiles) {
    if (p.done) continue;
    if (p.target.dead && !p.lastPos) p.lastPos = p.target.mesh.position.clone();
    const dest = p.lastPos || tmp.copy(p.target.mesh.position).add(new THREE.Vector3(0, 0.7, 0));
    const dir = new THREE.Vector3().subVectors(dest, p.mesh.position);
    const d = dir.length();
    const step = p.speed * dt;
    if (d <= step) {
      p.done = true; scene.remove(p.mesh);
      if (p.splash) {
        stratFx(dest, false);
        for (const e of state.enemies) if (!e.dead && e.mesh.position.distanceTo(dest) <= p.splash) {
          hit(e, p.dmg, { magic: true });
          if (p.slow) { e.slow = p.slow; e.slowT = 1.6; }
        }
      } else if (!p.target.dead) hit(p.target, p.dmg);
    } else {
      if (Math.random() < 0.8) spawnTrail(p.mesh.position, p.color);
      dir.normalize();
      p.mesh.position.addScaledVector(dir, step);
      p.mesh.lookAt(dest);
      if (p.type === 'strategist') p.mesh.rotation.z += dt * 10;
    }
  }
  state.projectiles = state.projectiles.filter(p => !p.done);

  for (const tm of state.timers) { tm.t -= dt; if (tm.t <= 0 && !tm.done) { tm.done = true; tm.fn(); } }
  state.timers = state.timers.filter(tm => !tm.done);

  for (const e of state.effects) {
    e.life -= dt; e.update(e, dt);
    if (!e.noFade && e.mesh.material) e.mesh.material.opacity = Math.max(0, e.life / e.max);
    if (e.life <= 0) { scene.remove(e.mesh); if (e.onEnd) e.onEnd(); }
  }
  state.effects = state.effects.filter(e => e.life > 0);

  if (state.waveActive && !state.spawnQueue.length && !state.enemies.length && !state.over) {
    state.waveActive = false;
    Sound.setIntense(false);
    const bonus = DIFF.waveBonus + state.wave * DIFF.waveBonusGrowth;
    state.gold += bonus;
    if (state.wave >= TOTAL_WAVES) endGame(true);
    else toast(`第 ${state.wave} 波擊退 · 犒賞 ${bonus} 糧`);
    updateHud();
  }
}

function endGame(win) {
  state.over = true;
  Sound.setIntense(false); Sound.play(win ? 'win' : 'lose');
  const f = FACTIONS[state.faction], st = STAGES[state.stage];
  $('end-title').textContent = win ? '大 捷' : '城 破';
  const stars = win ? (state.lives >= 3 ? 3 : state.lives === 2 ? 2 : 1) : 0;
  $('end-stars').textContent = win ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
  const k = `sanguo_best_${state.stage}_${state.faction}`, best = +(localStorage.getItem(k) || 0);
  if (stars > best) localStorage.setItem(k, stars);
  $('end-best').textContent = win ? `${st.name} · 城防剩餘 ${state.lives}　·　歷史最佳 ${'★'.repeat(Math.max(stars, best))}` : `${st.name} · 撐到第 ${state.wave} 波`;
  $('end-sub').textContent = win ? `${f.name}於【${st.name}】守住城池，${f.lord.replace('主公　', '')}大喜，論功行賞！` : `敵軍攻破【${st.name}】城門……勝敗乃兵家常事，請再整軍。`;
  $('end-screen').classList.remove('hidden');
  updateHud();
}

function animateFlags(t) {
  scene.traverse(o => { if (o.userData && o.userData.wave) o.rotation.x = Math.sin(t * 3 + o.id) * 0.25; });
}

function loop() {
  requestAnimationFrame(loop);
  const raw = Math.min(clock.getDelta(), 0.05);
  let scale = state.speed;
  if (hitStopT > 0) { hitStopT -= raw; scale *= 0.15; }
  if (state.faction && !state.over && !state.paused) update(raw * scale);
  updateFloaters(raw, camera);
  animateFlags(clock.elapsedTime);
  if (decoUpdate) decoUpdate(clock.elapsedTime);
  if (!state.faction) { controls.autoRotate = true; controls.autoRotateSpeed = 0.6; } else controls.autoRotate = false;
  controls.update();
  const off = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(shakeAmt);
  camera.position.add(off);
  renderer.render(scene, camera);
  camera.position.sub(off);
  shakeAmt = Math.max(0, shakeAmt - raw * 1.6);
}
loop();

function fitCamera() {
  const portraitMode = window.innerWidth / window.innerHeight < 1;
  controls.maxDistance = portraitMode ? 80 : 60;
  if (portraitMode) { camera.position.set(30, 40, 0.01); controls.target.set(1, 0, 0); scene.fog.near = 70; scene.fog.far = 150; }
  else { camera.position.set(0, 30, 28); controls.target.set(0, 0, 1); scene.fog.near = 45; scene.fog.far = 95; }
  camera.fov = portraitMode ? 50 : 45; camera.updateProjectionMatrix(); controls.update();
}
fitCamera();
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function simulate(seconds, dt = 1 / 30) { for (let t = 0; t < seconds && !state.over; t += dt) update(dt); }
window.__game = {
  state, camera, controls, selectStage, startGame, placeTower, startWave, updateHud, selectTower, simulate, castUltimate, towerStats, upgradeCost, canBuild, DIFF, ARCHETYPES, STAGES, pathCells,
  upgrade: (t) => { selectTower(t); $('tp-upgrade').onclick(); selectTower(null); },
};
