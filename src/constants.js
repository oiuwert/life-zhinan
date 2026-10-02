// life-zhinan — 常量表（紫微 × 人类图）
// HD 常量移植自 renlei-tu rlt/engine.py (MIT, 核心 ported from human-design-py, geodetheseeker)
// 紫微常量移植自 compass-ziwei (MIT)

// ─────────────────── 人类图 ───────────────────

// 黄经 0-360° → 64 闸门序列（从白羊座 0° 起，每星座 6 闸门）
export const GATE_SEQUENCE = [
  25, 17, 21, 51, 42, 3,   // Aries
  27, 24, 2, 23, 8, 20,    // Taurus
  16, 35, 45, 12, 15, 52,  // Gemini
  39, 53, 62, 56, 31, 33,  // Cancer
  7, 4, 29, 59, 40, 64,    // Leo
  47, 6, 46, 18, 48, 57,   // Virgo+Libra
  32, 50, 28, 44, 1, 43,   // Libra+Scorpio
  14, 34, 9, 5, 26, 11,    // Scorpio+Sag
  10, 58, 38, 54, 61, 60,  // Cap
  41, 19, 13, 49, 30, 55,  // Aquarius
  37, 63, 22, 36,          // Pisces
];

// 人类图新年起点：双鱼座 28°15'（358.25°）
export const HD_START_DEGREE = 358.25;

export const CENTERS = {
  head: [61, 63, 64],
  ajna: [4, 11, 17, 24, 43, 47],
  throat: [8, 12, 16, 20, 23, 31, 33, 35, 45, 56, 62],
  g: [1, 2, 7, 10, 13, 15, 25, 46],
  sacral: [3, 5, 9, 14, 27, 29, 34, 42, 59],
  root: [19, 28, 38, 39, 41, 52, 53, 54, 58, 60],
  spleen: [18, 28, 32, 44, 48, 50, 57],
  "solar-plexus": [6, 22, 30, 36, 37, 49, 55],
  heart: [21, 26, 40, 51],
};

export const CENTER_LABELS = {
  head: "头部中心（灵感/压力）",
  ajna: "逻辑中心（思维/分析）",
  throat: "喉咙中心（表达/沟通）",
  g: "G 中心（身份/方向）",
  sacral: "荐骨中心（生命力/性）",
  root: "根部中心（压力/动力）",
  spleen: "脾中心（直觉/生存）",
  "solar-plexus": "情绪中心（情绪/感受）",
  heart: "心中心（意志力/自我价值）",
};

// 36 条通道（闸门对）— v0.2 补齐 (10,34) 与 (10,57)
export const CHANNELS = [
  [1, 8], [2, 14], [3, 60], [4, 63], [5, 15],
  [6, 59], [7, 31], [9, 52], [10, 20], [10, 34],
  [10, 57], [11, 56], [12, 22], [13, 33], [16, 48],
  [17, 62], [18, 58], [19, 49], [20, 34], [20, 57],
  [21, 45], [23, 43], [24, 61], [25, 51], [26, 44],
  [27, 50], [28, 38], [29, 46], [30, 41], [32, 54],
  [34, 57], [35, 36], [37, 40], [39, 55], [42, 53],
  [47, 64],
];

export const CHANNEL_CENTERS = {
  "1,8": ["g", "throat"],
  "2,14": ["g", "sacral"],
  "3,60": ["sacral", "root"],
  "4,63": ["ajna", "head"],
  "5,15": ["sacral", "g"],
  "6,59": ["solar-plexus", "sacral"],
  "7,31": ["g", "throat"],
  "9,52": ["sacral", "root"],
  "10,20": ["g", "throat"],
  "10,34": ["g", "sacral"],
  "10,57": ["g", "spleen"],
  "11,56": ["ajna", "throat"],
  "12,22": ["throat", "solar-plexus"],
  "13,33": ["g", "throat"],
  "16,48": ["throat", "spleen"],
  "17,62": ["ajna", "throat"],
  "18,58": ["spleen", "root"],
  "19,49": ["root", "solar-plexus"],
  "20,34": ["throat", "sacral"],
  "20,57": ["throat", "spleen"],
  "21,45": ["heart", "throat"],
  "23,43": ["throat", "ajna"],
  "24,61": ["ajna", "head"],
  "25,51": ["g", "heart"],
  "26,44": ["heart", "spleen"],
  "27,50": ["sacral", "spleen"],
  "28,38": ["spleen", "root"],
  "29,46": ["sacral", "g"],
  "30,41": ["solar-plexus", "root"],
  "32,54": ["spleen", "root"],
  "34,57": ["sacral", "spleen"],
  "35,36": ["throat", "solar-plexus"],
  "37,40": ["solar-plexus", "heart"],
  "39,55": ["root", "solar-plexus"],
  "42,53": ["sacral", "root"],
  "47,64": ["ajna", "head"],
};

export const CHANNEL_NAMES = {
  "1,8": "1-8 灵感的榜样（Inspired Creative）",
  "2,14": "2-14 掌握方向与资源（The Beat）",
  "3,60": "3-60 突变（Mutation）",
  "4,63": "4-63 逻辑（Logic）",
  "5,15": "5-15 韵律（Rhythm）",
  "6,59": "6-59 亲密（Mating）",
  "7,31": "7-31 领导者（The Alpha）",
  "9,52": "9-52 专注（Concentration）",
  "10,20": "10-20 觉醒（Awakening）",
  "10,34": "10-34 探索（Exploration）",
  "10,57": "10-57 完美形式（Perfected Form）",
  "11,56": "11-56 好奇/梦想家（Curiosity）",
  "12,22": "12-22 开放（Openness）",
  "13,33": "13-33 浪子/见证（Prodigal）",
  "16,48": "16-48 才华（Talent）",
  "17,62": "17-62 组织接受（Acceptance）",
  "18,58": "18-58 评判修正（Judgment）",
  "19,49": "19-49 敏感综合（Synthesis）",
  "20,34": "20-34 魅力（Charisma）",
  "20,57": "20-57 脑波直觉沟通（Brain Wave）",
  "21,45": "21-45 金钱线（Money）",
  "23,43": "23-43 结构化/天才（Structuring）",
  "24,61": "24-61 觉察思考（Awareness）",
  "25,51": "25-51 发起（Initiation）",
  "26,44": "26-44 投降/企业家（Surrender）",
  "27,50": "27-50 守护保存（Preservation）",
  "28,38": "28-38 挣扎（Struggle）",
  "29,46": "29-46 发现成功（Discovery）",
  "30,41": "30-41 梦想焦点（Recognition）",
  "32,54": "32-54 转变抱负（Transformation）",
  "34,57": "34-57 力量原型（Power）",
  "35,36": "35-36 无常善变（Transitoriness）",
  "37,40": "37-40 社群家庭（Community）",
  "39,55": "39-55 心情情绪（Emoting）",
  "42,53": "42-53 成熟循环（Maturation）",
  "47,64": "47-64 抽象联想（Abstraction）",
};

export const MOTOR_CENTERS = new Set(["sacral", "heart", "solar-plexus", "root"]);
// 类型判定用动力中心：不含荐骨（MG 判定用非荐骨动力中心）
export const NON_SACRAL_MOTOR = new Set(["heart", "solar-plexus", "root"]);
export const MENTAL_CENTERS = new Set(["head", "ajna", "throat"]);

// 权威判定优先级（Jovian 标准）
export const AUTHORITY_PRIORITY = [
  ["solar-plexus", "emotional", "情绪权威（等情绪波落定再决定）"],
  ["sacral", "sacral", "荐骨权威（腹部 yes/no 回应）"],
  ["spleen", "splenic", "脾权威（当下直觉）"],
  ["heart", "ego", "意志权威（这是我真正想要的吗）"],
  ["g", "self-projected", "自我投射权威（说出来听自己的声音）"],
];
export const AUTHORITY_FALLBACK = ["mental", "心智/外在权威（找可信的人当镜子）"];

export const RIGHT_ANGLE_PROFILES = ["1/3", "1/4", "2/4", "2/5", "3/5", "3/6", "4/6"];
export const LEFT_ANGLE_PROFILES = ["5/1", "5/2", "6/2", "6/3"];
export const JUXTAPOSITION_PROFILES = ["4/1"];

// 13 天体（name, astronomy-engine Body 或 null=派生）
export const PLANETS = [
  ["sun", "Sun", "太阳"],
  ["earth", null, "地球"],           // 太阳+180°
  ["north-node", "NODE", "北交点"],   // 真北交点（SearchMoonNode 插值）
  ["south-node", null, "南交点"],     // 北交点+180°
  ["moon", "Moon", "月亮"],
  ["mercury", "Mercury", "水星"],
  ["venus", "Venus", "金星"],
  ["mars", "Mars", "火星"],
  ["jupiter", "Jupiter", "木星"],
  ["saturn", "Saturn", "土星"],
  ["uranus", "Uranus", "天王星"],
  ["neptune", "Neptune", "海王星"],
  ["pluto", "Pluto", "冥王星"],
];

export const TYPE_LABELS = {
  manifestor: "显示者",
  generator: "生产者",
  "manifesting-generator": "显示生产者",
  projector: "投射者",
  "energy-projector": "能量投射者",
  "mental-projector": "心智投射者",
  "classic-projector": "经典投射者",
  reflector: "反映者",
};

export const TYPE_STRATEGY = {
  manifestor: "告知（行动前先告知他人）",
  generator: "等待回应（对生命中的邀请做出回应）",
  "manifesting-generator": "等待回应 + 快速显化",
  projector: "等待被邀请（被看见、被认可后受邀）",
  "energy-projector": "等待被邀请（有动力引擎，适合驱动他人）",
  "mental-projector": "等待被邀请（心智投射者，等被询问）",
  "classic-projector": "等待被邀请",
  reflector: "等待 28 天月亮周期",
};

export const TYPE_NOT_SELF = {
  manifestor: "愤怒",
  generator: "挫败",
  "manifesting-generator": "挫败 + 愤怒",
  projector: "苦涩",
  "energy-projector": "苦涩",
  "mental-projector": "苦涩",
  "classic-projector": "苦涩",
  reflector: "失望",
};

// ─────────────────── 紫微 ───────────────────

// iztro 宫名（zh-CN 直出中文）→ 规范英文 id
export const PALACE_ID = {
  命宫: "soul", 兄弟: "siblings", 夫妻: "spouse", 子女: "children",
  财帛: "wealth", 疾厄: "health", 迁移: "surface", 交友: "friends",
  仆役: "friends", 官禄: "career", 田宅: "property", 福德: "spirit",
  父母: "parents",
};

export const PALACE_CN = {
  soul: "命宫", siblings: "兄弟宫", spouse: "夫妻宫", children: "子女宫",
  wealth: "财帛宫", health: "疾厄宫", surface: "迁移宫", friends: "交友宫",
  career: "事业宫", property: "田宅宫", spirit: "福德宫", parents: "父母宫",
};

// iztro star.type → compass class（iztro: major/soft/adjective）
export const STAR_CLASS = { major: "major", soft: "minor", adjective: "adjective" };

// 天干四化表（甲→癸），C4 自检交叉核对
export const SIHUA_TABLE = {
  甲: ["廉贞", "破军", "武曲", "太阳"],
  乙: ["天机", "天梁", "紫微", "太阴"],
  丙: ["天同", "天机", "文昌", "廉贞"],
  丁: ["太阴", "天同", "天机", "巨门"],
  戊: ["贪狼", "太阴", "右弼", "天机"],
  己: ["武曲", "贪狼", "天梁", "文曲"],
  庚: ["太阳", "武曲", "太阴", "天同"],
  辛: ["巨门", "太阳", "文曲", "文昌"],
  壬: ["天梁", "紫微", "左辅", "武曲"],
  癸: ["破军", "巨门", "太阴", "贪狼"],
};

export const MAJOR_STARS_14 = new Set([
  "紫微", "天机", "太阳", "武曲", "天同", "廉贞", "天府",
  "太阴", "贪狼", "巨门", "天相", "天梁", "七杀", "破军",
]);

export const SHICHEN_NAMES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

// 煞曜（互证层用）
export const SHA_STARS = new Set(["擎羊", "陀罗", "火星", "铃星", "地空", "地劫"]);

// ─────────────────── 互证层 ───────────────────

// R1：三方四正主星三元素
export const M1_ELEMENTS = {
  manifestor: ["紫微", "七杀", "破军", "贪狼"],
  generator: ["武曲", "太阳", "天府", "天同"],
  projector: ["天相", "天梁", "太阴", "天机", "巨门"],
};

export const HD_GATE_THEMES = {
  45: "国王/聚集资源", 26: "交易者/价值交换", 44: "企业家/嗅觉",
  47: "领悟/觉醒", 22: "开放/社交恩典", 12: "谨慎表达",
};

export const CHANNEL_CN = {
  "5,15": "5-15 韵律",
  "12,22": "12-22 开放",
  "26,44": "26-44 投降/企业家",
};

export const pairKey = (g1, g2) => (g1 < g2 ? `${g1},${g2}` : `${g2},${g1}`);

// 日期合法性：JS Date 会把 1990-02-31 静默溢出成 03-03（Python datetime 会抛错）——
// 入口必须显式校验，否则坏日期被静默接受排出"另一天"的盘。
export function assertValidDate(s) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s).trim());
  if (!m) throw new Error(`日期格式须为 YYYY-MM-DD: ${s}`);
  const [Y, M, D] = [+m[1], +m[2], +m[3]];
  const d = new Date(Date.UTC(Y, M - 1, D));
  if (d.getUTCFullYear() !== Y || d.getUTCMonth() !== M - 1 || d.getUTCDate() !== D) {
    throw new Error(`无效日期: ${s}（该月无此日）`);
  }
  return `${Y}-${String(M).padStart(2, "0")}-${String(D).padStart(2, "0")}`;
}
