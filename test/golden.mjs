// golden 对拍：TS 实现 vs Python 参考输出（compass + renlei-tu 引擎）
// 用法: node test/golden.mjs   全部通过 exit 0，任一失败 exit 1
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { crossRead } from "../src/cross.js";
import { chart as ziweiChart, runChecks as zwChecks } from "../src/ziwei.js";
import { calculateChart as hdChart, runChecks as hdChecks } from "../src/hd.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const load = (n) => JSON.parse(readFileSync(join(HERE, n), "utf8"));

const G = { cross: load("golden_cross.json"), hd: load("golden_hd.json"), zw: load("golden_zw.json") };
const BIRTH = { date: "1990-03-15", time: "12:00", tz: "+08:00", gender: "男", name: "样例", age: 36 };

let pass = 0, fail = 0;
const eq = (label, a, b) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  if (ok) pass++; else { fail++; console.error(`✗ ${label}\n    TS: ${JSON.stringify(a)}\n   PY: ${JSON.stringify(b)}`); }
};

// ── 1. 人类图引擎 ──
const hd = hdChart(BIRTH);
const hdChk = hdChecks(hd);
eq("HD 自检全绿", hdChk.ok, true);
eq("HD type", hd.summary.type, G.hd.summary.type);
eq("HD profile", hd.summary.profile, G.hd.summary.profile);
eq("HD authority", hd.summary.authority, G.hd.summary.authority);
eq("HD authority_center", hd.summary.authority_center, G.hd.summary.authority_center);
eq("HD definition", hd.summary.definition, G.hd.summary.definition);
eq("HD cross gates", hd.summary.incarnation_cross, G.hd.summary.incarnation_cross);
eq("HD defined centers", hd.centers.defined, G.hd.centers.defined);
eq("HD open centers", hd.centers.open, G.hd.centers.open);
eq("HD channels", hd.channels.map((c) => c.gates), G.hd.channels.map((c) => c.gates));
eq("HD active_gates", hd.active_gates, G.hd.active_gates);
for (const side of ["personality", "design"]) {
  for (const [planet, g] of Object.entries(G.hd[side])) {
    eq(`HD ${side}.${planet}.gate/line`,
      [hd[side][planet].gate, hd[side][planet].line], [g.gate, g.line]);
  }
}
// 天文度数容差（astronomy-engine vs swisseph moshier，0.01° 内）
for (const side of ["personality", "design"]) {
  for (const [planet, g] of Object.entries(G.hd[side])) {
    const d = Math.abs(hd[side][planet].degree - g.degree);
    const ok = d < 0.01 || Math.abs(d - 360) < 0.01; // 黄经回绕
    if (ok) pass++; else { fail++; console.error(`✗ HD ${side}.${planet}.degree diff=${d.toFixed(4)}`); }
  }
}

// ── 2. 紫微引擎 ──
const zw = ziweiChart({ date: BIRTH.date, hour: Number(BIRTH.time.split(":")[0]), gender: BIRTH.gender, name: BIRTH.name });
const zwChk = zwChecks(zw);
eq("ZW 自检全绿", zwChk.ok, true);
eq("ZW four_pillars", zw.summary.four_pillars, G.zw.summary.four_pillars);
eq("ZW year_gan", zw.summary.year_gan, G.zw.summary.year_gan);
eq("ZW five_elements", zw.summary.five_elements_class, G.zw.summary.five_elements_class);
eq("ZW soul/body", [zw.summary.soul_palace_branch, zw.summary.body_palace_branch],
  [G.zw.summary.soul_palace_branch, G.zw.summary.body_palace_branch]);
eq("ZW shichen", zw.input.shichen_index, G.zw.input.shichen_index);
for (const mu of ["禄", "权", "科", "忌"]) {
  eq(`ZW mutagen ${mu}`,
    zw.mutagens[mu].map((h) => [h.star, h.palace]),
    G.zw.mutagens[mu].map((h) => [h.star, h.palace]));
}
// 每宫星对拍。
// 已知引擎差异豁免（iztro 2.6.1 TS vs iztro-py 0.5.0，TS 侧为准）：
//   A. 杂曜(adjective)星名：iztro-py 的 _star_name 映射表不全 → 拼音直出（longchi/tianchu…），
//      且 pinyin 撞名误翻（tianfu→天府、tianyue→天钺）；iztro TS zh-CN 直出中文。
//      → adjective 星只对拍 class 与数量，名称豁免。
//   B. 亮度表个别漂移（如 太阴@酉: TS=旺 / PY=不，上游 iztro 为准）。
//      → 亮度仅对命宫(互证 evidence 唯一用到亮度的宫)严格一致，其余记 warning 不判失败。
//   C. mutagen / class / major-minor 星名：必须逐星一致（互证逻辑依赖这些）。
const pyPal = Object.fromEntries(G.zw.palaces.map((p) => [p.palace, p]));
let brightWarn = 0;
for (const p of zw.palaces) {
  const g = pyPal[p.palace];
  if (!g) { fail++; console.error(`✗ ZW 宫 ${p.palace} 在 Python 输出中不存在`); continue; }
  eq(`ZW ${p.palace} branch/body/soul`, [p.branch, p.is_body_palace, p.is_soul_palace],
    [g.branch, g.is_body_palace, g.is_soul_palace]);
  eq(`ZW ${p.palace} star count/class`, p.stars.map((s) => s.class), g.stars.map((s) => s.class));
  eq(`ZW ${p.palace} mutagens`,
    p.stars.map((s) => [s.name, s.mutagen]).filter(([, m]) => m),
    g.stars.map((s) => [s.name, s.mutagen]).filter(([, m]) => m));
  const nonAdj = (stars) => stars.filter((s) => s.class !== "adjective").map((s) => s.name);
  eq(`ZW ${p.palace} major/minor names`, nonAdj(p.stars), nonAdj(g.stars));
  if (p.palace === "soul") {
    // 只比亮度序列（class 列表已对拍=按索引对齐；adjective 星名豁免）
    eq("ZW soul brightness",
      p.stars.map((s) => s.brightness),
      g.stars.map((s) => s.brightness));
  } else {
    const drift = p.stars.filter((s, i) => g.stars[i] && s.brightness !== g.stars[i].brightness);
    if (drift.length) {
      brightWarn++;
      const desc = drift.map((s) => {
        const gi = g.stars.findIndex((x, j) => j === p.stars.indexOf(s));
        return `${s.name} TS=${s.brightness}/PY=${gi >= 0 ? g.stars[gi].brightness : "?"}`;
      }).join(", ");
      console.warn(`  ⚠ ${p.palace} 亮度漂移(豁免): ${desc}`);
    }
  }
}

// ── 3. 互证报告 ──
const cr = crossRead(BIRTH);
eq("CROSS 无 error", cr.error ?? null, null);
eq("CROSS gate 全绿", cr.gate, G.cross.gate);
eq("CROSS meta", cr.meta, G.cross.meta);
eq("CROSS signals 数", cr.signals.length, G.cross.signals.length);
eq("CROSS signals 概要",
  cr.signals.map((s) => [s.axis, s.theme, s.verdict, s.confidence]),
  G.cross.signals.map((s) => [s.axis, s.theme, s.verdict, s.confidence]));
eq("CROSS differences 数", cr.differences.length, G.cross.differences.length);
eq("CROSS insights",
  cr.insights.map((i) => [i.source, i.text]),
  G.cross.insights.map((i) => [i.source, i.text]));
eq("CROSS facts.hd", cr.facts.hd, G.cross.facts.hd);
eq("CROSS facts.zwds", cr.facts.zwds, G.cross.facts.zwds);
// disclaimer：Python 版把 list repr 泄进散文（"['verified_1sample']"），TS 已修——
// 语义对拍：关键要素必须都在
eq("CROSS disclaimer 语义",
  ["文化/叙事", "非因果证明", "verified_1sample", "事后贴合", "医疗/法律/投资"].every((k) => cr.disclaimer.includes(k)),
  true);

// ── 汇总 ──
console.log(`\ngolden 对拍: ${pass} 通过 / ${fail} 失败`);
if (fail > 0) process.exit(1);
console.log("ALL OK ✅");
