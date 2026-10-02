// life-zhinan — 人类图计算引擎
// 移植自 renlei-tu rlt/engine.py (MIT, 核心 ported from human-design-py, geodetheseeker)
// 天文内核：astronomy-engine (MIT, Don Cross) 替代 pyswisseph —— 精度角秒级，
// 人类图按 5.625°/闸门、0.9375°/爻 判定，余量充足。
import * as A from "astronomy-engine";
import {
  assertValidDate,
  GATE_SEQUENCE, HD_START_DEGREE, CENTERS, CHANNELS, CHANNEL_CENTERS,
  AUTHORITY_PRIORITY, AUTHORITY_FALLBACK, RIGHT_ANGLE_PROFILES,
  LEFT_ANGLE_PROFILES, JUXTAPOSITION_PROFILES, PLANETS,
  NON_SACRAL_MOTOR, MENTAL_CENTERS,
  TYPE_LABELS, TYPE_STRATEGY, TYPE_NOT_SELF,
} from "./constants.js";

export const __version__ = "0.1.0";
export const CORE_CREDIT =
  "life-zhinan hd engine (MIT), ported from renlei-tu engine (MIT, core from human-design-py)";

// ─────────────────────────────────────────────
// 时区解析：'+08:00' 数字偏移 或 IANA 名（Intl 离线计算偏移）
// ─────────────────────────────────────────────

function parseOffsetStr(s) {
  s = String(s).trim();
  let sign = 1;
  if (s[0] === "-") { sign = -1; s = s.slice(1); }
  else if (s[0] === "+") { s = s.slice(1); }
  if (!s) return null;
  if (s.includes(":")) {
    const [hh, mm] = s.split(":");
    const v = Number(hh) + Number(mm) / 60;
    return Number.isFinite(v) ? sign * v : null;
  }
  const v = Number(s);
  return Number.isFinite(v) ? sign * v : null;
}

// 某 UTC 时刻在指定 IANA 时区的偏移（毫秒）
function ianaOffsetMs(utcMs, iana) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: iana, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const p = {};
  for (const part of dtf.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - utcMs;
}

// 本地出生时间 → UTC Date；tz = '+08:00' / 'Asia/Shanghai' / 8（小时数）
export function resolveUTC(birthStr, timeStr, tz) {
  birthStr = assertValidDate(birthStr);
  const [Y, M, D] = birthStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  const localMs = Date.UTC(Y, M - 1, D, h, m, 0); // 先当 UTC 拿到锚点

  const tzStr = String(tz);
  const numeric = parseOffsetStr(tzStr);
  let offsetH;
  if (numeric !== null && /^[-+\d.:.]+$/.test(tzStr.trim()) && !/[A-Za-z]/.test(tzStr)) {
    offsetH = numeric;
  } else {
    // IANA：迭代一次穿过 DST 边界
    let off = ianaOffsetMs(localMs, tzStr);
    off = ianaOffsetMs(localMs - off, tzStr); // 用修正后的时刻再取一次
    offsetH = off / 3600000;
  }
  return { utc: new Date(localMs - offsetH * 3600000), offsetHours: offsetH };
}

// ─────────────────────────────────────────────
// 天文：黄经 → 闸门/爻线；真北交点
// ─────────────────────────────────────────────

export function degreeToGateLine(degree) {
  const gateSize = 360 / 64;      // 5.625°
  const lineSize = gateSize / 6;  // 0.9375°
  const adjusted = ((degree - HD_START_DEGREE) % 360 + 360) % 360;
  const index = Math.floor(adjusted / gateSize);
  const line = Math.floor((adjusted % gateSize) / lineSize) + 1;
  return { gate: GATE_SEQUENCE[index], line };
}

function sunLon(date) {
  const t = A.MakeTime(date);
  return A.Ecliptic(A.GeoVector(A.Body.Sun, t, true)).elon;
}

const wrap180 = (d) => (((d + 180) % 360) + 360) % 360 - 180;

// 真北交点黄经：瞬时轨道面（osculating）与黄道的交线方向。
// n = r × v（GeoMoonState 地心状态向量）→ 轨道面法线；交线 d = n × 黄道极点。
// 帧转换用 Ecliptic() 对 EQJ 基向量的像重建（Ecliptic 挂 .t 才调真春分点 of date，
// 与 swisseph TRUE_NODE 同为日期坐标系）。基准样本对拍：本实现 40.4690 vs swisseph
// 40.4687（差 0.0003°，爻宽 0.9375° —— 远小于判定粒度）。
// 注：路径过零点插值法（月亮实际过黄道）与此系统性差 ~0.087°，勿回退。
export function northNodeLon(date) {
  const t = A.MakeTime(date);
  const dir = (x, y, z) => {
    const e = A.Ecliptic({ x, y, z, t });
    const cl = Math.cos((e.elat * Math.PI) / 180);
    return [
      cl * Math.cos((e.elon * Math.PI) / 180),
      cl * Math.sin((e.elon * Math.PI) / 180),
      Math.sin((e.elat * Math.PI) / 180),
    ];
  };
  const c1 = dir(1, 0, 0), c2 = dir(0, 1, 0), c3 = dir(0, 0, 1);
  const s = A.GeoMoonState(t);
  const n = [s.y * s.vz - s.z * s.vy, s.z * s.vx - s.x * s.vz, s.x * s.vy - s.y * s.vx];
  const ne = [0, 1, 2].map((i) => n[0] * c1[i] + n[1] * c2[i] + n[2] * c3[i]);
  // 升交点符号（北交点方向）由基准样本锁定
  return ((Math.atan2(ne[0], -ne[1]) * 180) / Math.PI + 360) % 360;
}

export function getPlanetaryPositions(date) {
  const results = {};
  const sLon = sunLon(date);
  for (const [name, body] of PLANETS) {
    let deg;
    if (name === "earth") deg = (sLon + 180) % 360;
    else if (name === "north-node") deg = northNodeLon(date);
    else if (name === "south-node") deg = (northNodeLon(date) + 180) % 360;
    else deg = A.Ecliptic(A.GeoVector(A.Body[body], A.MakeTime(date), true)).elon;
    const { gate, line } = degreeToGateLine(deg);
    results[name] = { degree: Math.round(deg * 10000) / 10000, gate, line };
  }
  return results;
}

// 设计时刻：出生前太阳精确行至 88° 太阳弧的时刻（二分搜索，对齐 Python 版容差 0.0001°）
export function findDesignDate(birthDate, pSunLon) {
  const target = ((pSunLon - 88) % 360 + 360) % 360;
  let low = birthDate.getTime() - 100 * 86400000;
  let high = birthDate.getTime() - 80 * 86400000;
  let design = birthDate.getTime();
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    design = mid;
    const diff = wrap180(sunLon(new Date(mid)) - target);
    if (Math.abs(diff) < 0.0001) break;
    if (diff > 0) high = mid; else low = mid;
  }
  return new Date(design);
}

// ─────────────────────────────────────────────
// 中心 / 类型 / 权威 / 定义 / 轮回交叉
// ─────────────────────────────────────────────

function pairSorted(a, b) { return a < b ? `${a},${b}` : `${b},${a}`; }

export function getDefinedCenters(activeGates) {
  const defined = new Set();
  const channelsDone = [];
  for (const [g1, g2] of CHANNELS) {
    if (activeGates.has(g1) && activeGates.has(g2)) {
      const [c1, c2] = CHANNEL_CENTERS[pairSorted(g1, g2)];
      defined.add(c1); defined.add(c2);
      channelsDone.push({ gates: [Math.min(g1, g2), Math.max(g1, g2)], centers: [c1, c2] });
    }
  }
  return { defined, channelsDone };
}

export function determineType(definedCenters, activeGates) {
  if (definedCenters.size === 0) return "reflector";
  const hasSacral = definedCenters.has("sacral");
  const hasThroat = definedCenters.has("throat");

  let hasThroatConnection = false;
  if (hasThroat) {
    const graph = {};
    for (const c of Object.keys(CENTERS)) graph[c] = new Set();
    for (const [g1, g2] of CHANNELS) {
      if (activeGates.has(g1) && activeGates.has(g2)) {
        const [c1, c2] = CHANNEL_CENTERS[pairSorted(g1, g2)];
        graph[c1].add(c2); graph[c2].add(c1);
      }
    }
    const visited = new Set();
    const queue = ["throat"];
    while (queue.length) {
      const cur = queue.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);
      if (NON_SACRAL_MOTOR.has(cur)) { hasThroatConnection = true; break; }
      for (const nb of graph[cur]) if (!visited.has(nb)) queue.push(nb);
    }
  }

  if (hasSacral) return hasThroatConnection ? "manifesting-generator" : "generator";
  if (hasThroatConnection) return "manifestor";

  const motors = [...definedCenters].filter((c) => NON_SACRAL_MOTOR.has(c));
  const belowThroat = [...definedCenters].filter((c) => !MENTAL_CENTERS.has(c));
  if (motors.length) return "energy-projector";
  if (belowThroat.length === 0) return "mental-projector";
  return "classic-projector";
}

export function determineAuthority(definedCenters) {
  for (const [center, code, label] of AUTHORITY_PRIORITY) {
    if (definedCenters.has(center)) return { code, label, center };
  }
  return { code: AUTHORITY_FALLBACK[0], label: AUTHORITY_FALLBACK[1], center: "none" };
}

export function determineDefinition(definedCenters, channelsDone) {
  if (definedCenters.size === 0) return "undefined";
  const graph = {};
  for (const c of definedCenters) graph[c] = new Set();
  for (const ch of channelsDone) {
    const [c1, c2] = ch.centers;
    if (graph[c1] && graph[c2]) { graph[c1].add(c2); graph[c2].add(c1); }
  }
  const seen = new Set();
  let components = 0;
  for (const c of definedCenters) {
    if (seen.has(c)) continue;
    components++;
    const stack = [c];
    while (stack.length) {
      const node = stack.pop();
      if (seen.has(node)) continue;
      seen.add(node);
      for (const nb of graph[node]) if (!seen.has(nb)) stack.push(nb);
    }
  }
  return { 1: "single", 2: "split", 3: "triple-split", 4: "quadruple-split" }[components]
    ?? `split-${components}`;
}

function incarnationCross(personality, design, profile) {
  const pSun = personality.sun, pEarth = personality.earth;
  const dSun = design.sun, dEarth = design.earth;
  let angle = "unknown";
  if (RIGHT_ANGLE_PROFILES.includes(profile)) angle = "right";
  else if (LEFT_ANGLE_PROFILES.includes(profile)) angle = "left";
  else if (JUXTAPOSITION_PROFILES.includes(profile)) angle = "juxtaposition";
  return {
    angle,
    gates: {
      "personality-sun": pSun.gate,
      "personality-earth": pEarth.gate,
      "design-sun": dSun.gate,
      "design-earth": dEarth.gate,
    },
  };
}

// ─────────────────────────────────────────────
// 主计算入口
// ─────────────────────────────────────────────

export function calculateChart({
  date, time = "12:00", tz = "+08:00", name = "",
}) {
  const { utc, offsetHours } = resolveUTC(date, time, tz);
  const pSunLon = sunLon(utc);
  const designDate = findDesignDate(utc, pSunLon);

  const personality = getPlanetaryPositions(utc);
  const design = getPlanetaryPositions(designDate);

  const activeGates = new Set();
  for (const p of Object.values(personality)) activeGates.add(p.gate);
  for (const p of Object.values(design)) activeGates.add(p.gate);

  const { defined, channelsDone } = getDefinedCenters(activeGates);
  const profile = `${personality.sun.line}/${design.sun.line}`;
  const type = determineType(defined, activeGates);
  const authority = determineAuthority(defined);
  const definition = determineDefinition(defined, channelsDone);
  const cross = incarnationCross(personality, design, profile);

  const allCenters = Object.keys(CENTERS);
  const definedList = [...defined].sort();
  const openList = allCenters.filter((c) => !defined.has(c)).sort();

  return {
    engine: { name: "life-zhinan-hd", version: __version__, credit: CORE_CREDIT },
    input: {
      birth: `${date} ${time}`,
      tz: String(tz),
      utc: utc.toISOString(),
      offset_hours: offsetHours,
      name,
    },
    summary: {
      type,
      type_label: TYPE_LABELS[type],
      strategy: TYPE_STRATEGY[type],
      not_self_theme: TYPE_NOT_SELF[type],
      profile,
      authority: authority.code,
      authority_label: authority.label,
      authority_center: authority.center,
      definition,
      incarnation_cross: cross,
    },
    personality, // 意识（黑色）
    design,      // 无意识（红色）
    centers: { defined: definedList, open: openList },
    channels: channelsDone,
    active_gates: [...activeGates].sort((a, b) => a - b),
  };
}

// ─────────────────────────────────────────────
// 一致性自检 C1-C6（移植 rlt/consistency.py）
// ─────────────────────────────────────────────

export function runChecks(chart) {
  const findings = [];
  const add = (id, name, ok, detail) => findings.push({ id, name, ok, detail });

  // C1 通道表静态完整
  const pairs = CHANNELS.map(([a, b]) => pairSorted(a, b));
  const dup = new Set(pairs).size !== pairs.length;
  const gateRangeOk = CHANNELS.every(([a, b]) => a >= 1 && a <= 64 && b >= 1 && b <= 64);
  add("C1", "通道表=36条且无重复无越界",
    CHANNELS.length === 36 && !dup && gateRangeOk,
    `共${CHANNELS.length}条; 重复=${dup}; 闸门越界=${!gateRangeOk}`);

  // C2 通道⇄中心归属 + 命名
  const ccKeys = new Set(Object.keys(CHANNEL_CENTERS));
  const missingCc = pairs.filter((p) => !ccKeys.has(p));
  const badCenters = Object.entries(CHANNEL_CENTERS)
    .filter(([, [c1, c2]]) => !(c1 in CENTERS) || !(c2 in CENTERS));
  const nameMissing = pairs.filter((p) => !(p in NAMES));
  add("C2", "每条通道有中心归属+命名，中心合法",
    missingCc.length === 0 && badCenters.length === 0 && nameMissing.length === 0,
    `缺中心归属=[${missingCc}]; 非法中心=${badCenters.length}; 缺命名=[${nameMissing}]`);

  const activeGates = new Set(chart.active_gates);
  const donePairs = new Set(chart.channels.map((ch) => pairSorted(ch.gates[0], ch.gates[1])));

  // C3 完成通道两端均激活
  const orphan = [];
  for (const ch of chart.channels) {
    const [g1, g2] = [...ch.gates].sort((a, b) => a - b);
    if (!activeGates.has(g1) || !activeGates.has(g2)) orphan.push(`${g1}-${g2}`);
  }
  add("C3", "完成通道的两端闸门均在激活闸门中", orphan.length === 0,
    `孤儿通道=${orphan.length ? orphan.join("/") : "无"}`);

  // C4 定义中心/完成通道可机械重推
  const { defined: reDefined, channelsDone: reChannels } = getDefinedCenters(activeGates);
  const reDone = new Set(reChannels.map((ch) => pairSorted(ch.gates[0], ch.gates[1])));
  const diffCh = [...donePairs].filter((p) => !reDone.has(p))
    .concat([...reDone].filter((p) => !donePairs.has(p)));
  const diffDef = chart.centers.defined.filter((c) => !reDefined.has(c))
    .concat([...reDefined].filter((c) => !chart.centers.defined.includes(c)));
  add("C4", "定义中心与完成通道可由激活闸门完整重推",
    diffCh.length === 0 && diffDef.length === 0,
    `通道差集=${diffCh.length ? diffCh.join("|") : "无"}; 中心差集=${diffDef.length ? diffDef.join("|") : "无"}`);

  // C5 类型可复算
  const reType = determineType(reDefined, activeGates);
  add("C5", "类型判定可复算", reType === chart.summary.type,
    `重推=${reType} vs 输出=${chart.summary.type}`);

  // C6 权威/定义/交叉/profile
  const reAuth = determineAuthority(reDefined);
  const s = chart.summary;
  const authOk = s.authority === reAuth.code && s.authority_center === reAuth.center;
  const reDefn = determineDefinition(reDefined, chart.channels);
  const defnOk = s.definition === reDefn;
  const crossGates = new Set(Object.values(s.incarnation_cross.gates));
  const crossBad = [...crossGates].filter((g) => !activeGates.has(g)).sort((a, b) => a - b);
  const profOk = s.profile === `${chart.personality.sun.line}/${chart.design.sun.line}`;
  add("C6", "权威/定义/交叉/profile 全部可复算",
    authOk && defnOk && crossBad.length === 0 && profOk,
    `权威ok=${authOk}; 定义ok=${defnOk}; 交叉含未激活闸门=${crossBad.length ? crossBad.join("/") : "无"}; profileok=${profOk}`);

  return { ok: findings.every((f) => f.ok), findings };
}

// 供 C2 引用（避免循环依赖放这里）
import { CHANNEL_NAMES as NAMES } from "./constants.js";
