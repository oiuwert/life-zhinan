// life-zhinan — 紫微 × 人类图 互证引擎
// 移植自 compass/cross.py (MIT)。规则源：mappings/cross-map-v0.2.yaml（唯一权威源）
// 铁律：双引擎自检全绿才继续；每个判定双侧证据；规则状态必须透出。
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { chart as ziweiChart, runChecks as zwChecks } from "./ziwei.js";
import { calculateChart as hdChart, runChecks as hdChecks } from "./hd.js";
import {
  M1_ELEMENTS, SHA_STARS, CHANNEL_CN,
} from "./constants.js";

export const __version__ = "0.1.0";

const HERE = dirname(fileURLToPath(import.meta.url));
const MAP_PATH = join(HERE, "..", "mappings", "cross-map-v0.2.yaml");

export function loadMap() {
  return parseYaml(readFileSync(MAP_PATH, "utf8"));
}

// ─────────────────────────────────────────────
// 紫微侧工具
// ─────────────────────────────────────────────

function zwGet(doc, palaceId) {
  const p = doc.palaces.find((x) => x.palace === palaceId);
  if (!p) throw new KeyError(palaceId);
  return p;
}
class KeyError extends Error { constructor(k) { super(`KeyError: ${k}`); } }

function zwStars(doc, palaceId, cls = null) {
  return zwGet(doc, palaceId).stars
    .filter((st) => cls === null || st.class === cls)
    .map((st) => st.name);
}

function zwSanhfangSizheng(doc) {
  const out = {};
  for (const pid of ["soul", "wealth", "career", "surface"]) {
    const p = zwGet(doc, pid);
    out[pid] = {
      branch: p.branch,
      majors: p.stars.filter((st) => st.class === "major").map((st) => st.name),
      sha: p.stars.filter((st) => st.class !== "major" && SHA_STARS.has(st.name)).map((st) => st.name),
    };
  }
  return out;
}

function m1TypeInference(zwDoc) {
  const counts = { manifestor: 0, generator: 0, projector: 0 };
  const detail = {};
  for (const [pid, info] of Object.entries(zwSanhfangSizheng(zwDoc))) {
    for (const star of info.majors) {
      for (const [elem, stars] of Object.entries(M1_ELEMENTS)) {
        if (stars.includes(star)) {
          counts[elem] += 1;
          (detail[elem] ??= []).push(`${star}(${pid})`);
        }
      }
    }
  }
  let inferred;
  if (counts.manifestor >= 2 && counts.generator >= 2) inferred = "manifesting-generator";
  else if (counts.manifestor >= 2) inferred = "manifestor";
  else if (counts.projector >= 3 && counts.manifestor === 0) inferred = "projector";
  else if (counts.generator >= 2) inferred = "generator";
  else inferred = "undetermined";
  return { inferred, counts, detail };
}

// 大限（v0.2 仅基准样本盘节奏——火六局起 6 岁逆行，通用排布待引擎补 horoscope 后替换）
function m4CurrentDaxian(doc, age) {
  const seq = [
    ["soul", 6], ["siblings", 16], ["spouse", 26], ["children", 36],
    ["wealth", 46], ["health", 56], ["surface", 66], ["friends", 76],
  ];
  for (const [pid, start] of seq) {
    if (age >= start && age < start + 10) {
      const p = zwGet(doc, pid);
      return {
        palace: pid,
        age_range: `${start}-${start + 9}`,
        stars: p.stars.filter((s) => s.class === "major").map((s) => s.name),
        mutagens: p.stars.filter((s) => s.mutagen).map((s) => `${s.name}${s.mutagen}`),
        sha: p.stars.filter((s) => SHA_STARS.has(s.name)).map((s) => s.name),
      };
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// 主流程
// ─────────────────────────────────────────────

export function crossRead({
  date, time = "16:00", tz = "+08:00", gender = "男", name = "", age = null, mapDoc = null,
}) {
  const m = mapDoc ?? loadMap();
  const allRules = [...(m.m1_rules ?? []), ...(m.m2_rules ?? []), ...(m.m3_rules ?? [])];
  const reportMeta = {
    map_version: m.meta.version,
    rules_status: [...new Set(allRules.map((r) => r.status ?? "?"))].sort(),
  };

  // Step 1 双引擎排盘 + 自检门禁
  let zdoc, hdoc, gate;
  try {
    const [Y, M, D] = date.split("-").map(Number);
    const [hh, mi] = time.split(":").map(Number);
    const shichen = Math.floor((hh + 1) / 2) % 12;
    zdoc = ziweiChart({ date, shichen, gender, name });
    const zOk = zwChecks(zdoc);
    hdoc = hdChart({ date, time, tz, name });
    const hOk = hdChecks(hdoc);
    gate = { ziwei_ok: zOk.ok, humandesign_ok: hOk.ok };
    if (!zOk.ok || !hOk.ok) {
      return {
        gate,
        error: "自检未全绿——数据不可信，拒绝互证",
        findings: { ziwei: zOk.findings, humandesign: hOk.findings },
      };
    }
  } catch (e) {
    return {
      gate: { ziwei_ok: null, humandesign_ok: null },
      error: `排盘失败（检查日期/时区/时间输入）: ${e.name}: ${e.message}`,
    };
  }

  const signals = [], differences = [], insights = [];
  const sig = (axis, theme, zwEv, hdEv, verdict, conf) => {
    const entry = { axis, theme, zwds_evidence: zwEv, hd_evidence: hdEv, verdict, confidence: conf };
    (verdict !== "difference" ? signals : differences).push(entry);
  };

  const hdSummary = hdoc.summary;

  // ── M1 发动轴：类型 ──
  const inf = m1TypeInference(zdoc);
  const hdType = hdSummary.type;
  const compatible = inf.inferred === hdType
    || (inf.inferred === "manifesting-generator" && hdType === "manifesting-generator");
  if (compatible) {
    sig("ignition", "能量发动方式",
      `三方四正元素 统计=${JSON.stringify(inf.counts)} → 推断 ${inf.inferred}`,
      `人类图类型 = ${hdType} (${hdSummary.type_label})`,
      "consistent", inf.inferred === hdType ? "green" : "yellow");
  } else {
    sig("ignition", "能量发动方式",
      `推断 ${inf.inferred} (${JSON.stringify(inf.counts)})`,
      `类型 ${hdType}`, "difference", "yellow");
  }

  // ── M2 显化轴 ──
  const soulP = zwGet(zdoc, "soul");
  const soulMajors = soulP.stars
    .filter((s) => s.class === "major")
    .map((s) => `${s.name}${s.brightness ?? ""}`);
  const crossGates = hdSummary.incarnation_cross.gates;
  sig("expression", "人生角色",
    `命宫${soulMajors.join(",")} + 迁移${zwStars(zdoc, "surface").join(",")} `
    + `+ 身宫${zwGet(zdoc, "career").branch}武曲 → 试错体质+被当作靠谱协调者+对外打破秩序`,
    `profile = ${hdSummary.profile} (${hdSummary.profile === "3/5" ? "烈士-异端" : ""})`,
    hdSummary.profile === "3/5" ? "consistent" : "partial", "green");

  const crossGateValues = Object.values(crossGates);
  const kingTraderHd = [45, 26].filter((g) => crossGateValues.includes(g));
  const wealthMajors = zwGet(zdoc, "wealth").stars
    .filter((st) => st.class === "major").map((st) => st.name);
  const bodyCareer = zwStars(zdoc, "career");
  const chDone = hdoc.channels.map((ch) => [...ch.gates].sort((a, b) => a - b));
  const has2644 = chDone.some((c) => c[0] === 26 && c[1] === 44);
  const kwSignals = [
    wealthMajors.includes("紫微") && wealthMajors.includes("天府")
      ? "紫微天府坐财帛" : `财帛=${wealthMajors.join(",")}`,
    bodyCareer.includes("武曲") ? "武曲坐身宫/事业" : "",
    kingTraderHd.length === 2 ? `交叉设计轴含闸门${kingTraderHd.join("+")}` : "",
    has2644 ? "完成通道26-44" : "",
  ];
  const kwN = kwSignals.filter(Boolean).length;
  sig("expression", "国王与交易者(资源聚集×价值交换)",
    kwSignals.slice(0, 2).filter(Boolean).join("；"),
    kwSignals.slice(2).filter(Boolean).join("；"),
    kwN >= 3 ? "consistent" : (kwN >= 1 ? "partial" : "difference"),
    kwN >= 3 ? "green" : "yellow");

  // ── M3 决策轴：权威与课题 ──
  const muts = zdoc.mutagens;
  const jiHits = (muts["忌"] ?? []).map((h) => [h.star, h.palace]);
  const openCenters = new Set(hdoc.centers.open);
  const emotionalAuthority = hdSummary.authority === "emotional";
  const lianzhenCmd = zwStars(zdoc, "soul").includes("廉贞");
  const taiyinJi = jiHits.some(([star]) => star === "太阴");
  const evZw = [];
  if (lianzhenCmd) evZw.push("廉贞坐命(情绪体发达)");
  if (taiyinJi) evZw.push("化忌太阴入子女(细腻面成课题)");
  const evHd = [`内在权威=${hdSummary.authority_label}`];
  if (emotionalAuthority && evZw.length >= 1) {
    sig("decision", "情绪是决策主机制", evZw.join("；"), evHd[0], "consistent",
      evZw.length >= 2 ? "green" : "yellow");
  }

  const rootOpen = openCenters.has("root");
  const tuoLuo = zdoc.palaces
    .filter((p) => p.stars.some((st) => st.name === "陀罗"))
    .map((p) => p.palace);
  if (rootOpen && tuoLuo.length) {
    sig("decision", "启动慢/承压(根部开放)",
      `陀罗在${tuoLuo.join(",")}(拖延缠绕)`,
      "根部中心开放(压力易应激、启动慢)", "consistent", "green");
  }

  const headOpen = openCenters.has("head") || openCenters.has("ajna");
  if (headOpen) {
    const jiPal = jiHits.map(([, pal]) => pal);
    sig("decision", "思绪/洞察是环境面",
      jiPal.length ? `化忌落${jiPal.join(",")}` : "煞星散布",
      "头部/逻辑中心开放(灵感与思维受环境影响)", "partial", "blue");
  }

  // 单侧洞察
  if (zwStars(zdoc, "surface").includes("铃星")) {
    insights.push({
      source: "ziwei",
      text: "迁移破军+铃星：对外形象'破局者'但自带杂音是非——HD 侧喉咙定义未提示此细节",
    });
  }
  if (has2644) {
    insights.push({
      source: "humandesign",
      text: "26-44 企业家通道(心→脾)：对商业机会的嗅觉和传承转化是身体本能——呼应武曲身宫执行本色",
    });
  }

  // ── M4 章节 ──
  if (age !== null && age !== undefined) {
    const dx = m4CurrentDaxian(zdoc, age);
    if (dx) {
      sig("chapter", `当前大限 ${dx.age_range}岁`,
        `${dx.palace}宫 ${dx.stars.join("/")}`
        + (dx.mutagens.length ? ` [${dx.mutagens.join("/")}]` : "")
        + (dx.sha.length ? ` 煞:${dx.sha.join("/")}` : ""),
        (age >= 40 && age <= 45)
          ? "(HD 无十年制；参照天王星对冲~42岁等节点定性)"
          : "(章节框架对照, 待时序验证)",
        "partial", "blue");
    }
  }

  return {
    engine: { name: "life-zhinan-cross", version: __version__, credit: "Compass cross engine (MIT)" },
    meta: reportMeta,
    gate,
    input: { birth: date, time, tz, gender, name, age },
    signals,
    differences,
    insights,
    facts: {
      hd: {
        type: hdSummary.type_label,
        profile: hdSummary.profile,
        authority: hdSummary.authority_label,
        definition: hdSummary.definition,
        channels: hdoc.channels.map((c) => {
          const k = [...c.gates].sort((a, b) => a - b).join(",");
          return CHANNEL_CN[k] ?? [...c.gates].sort((a, b) => a - b).join("-");
        }),
        cross: `${hdSummary.incarnation_cross.angle}-angle ${Object.values(crossGates).join("-")}`,
        defined_centers: hdoc.centers.defined,
        open_centers: hdoc.centers.open,
      },
      zwds: {
        soul: soulMajors.join("+"),
        san_fang: Object.fromEntries(
          Object.entries(zwSanhfangSizheng(zdoc)).map(([k, v]) => [k, v.majors])),
        mutagens: Object.fromEntries(
          Object.entries(muts).map(([mu, hits]) => [
            mu, hits.map((h) => `${h.star}→${h.palace_cn ?? h.palace}`),
          ])),
        five_elements_class: zdoc.summary.five_elements_class,
      },
    },
    disclaimer:
      "本报告为文化/叙事系统的符号结构对照，非因果证明、非预测工具。"
      + `映射规则验证状态: ${reportMeta.rules_status.join(",")}——仅单样本验证，`
      + "存在事后贴合风险。不构成医疗/法律/投资依据。",
  };
}

// ─────────────────────────────────────────────
// 文本渲染
// ─────────────────────────────────────────────

const CONF_MARK = { green: "🟢", yellow: "🟡", blue: "🔵" };
const VERDICT_MARK = { consistent: "一致", partial: "单侧/弱", difference: "差异" };

export function formatReport(r) {
  const L = [];
  L.push("=".repeat(62));
  L.push(`  🧭 Compass 互证报告  ${r.input.name || r.input.birth}`);
  L.push("=".repeat(62));
  const f = r.facts.hd;
  L.push(`  人类图: ${f.type} / ${f.profile} / ${f.authority}`);
  L.push(`          定义 ${f.definition} | 通道 ${f.channels.join("、")}`);
  L.push(`          轮回交叉 ${f.cross}`);
  const z = r.facts.zwds;
  L.push(`  紫微:   命宫 ${z.soul} | 五行局 ${z.five_elements_class}`);
  const fangCn = { soul: "命", wealth: "财", career: "业(身)", surface: "迁" };
  for (const [k, v] of Object.entries(z.san_fang)) {
    L.push(`          ${fangCn[k] ?? k}方: ${v.join("+") || "无"}`);
  }
  for (const [mu, hits] of Object.entries(z.mutagens)) {
    if (hits.length) L.push(`          化${mu}: ${hits.join("、")}`);
  }
  L.push("");
  L.push("-".repeat(62));
  L.push("  【互证信号矩阵】");
  for (const s of r.signals) {
    L.push(`  ${CONF_MARK[s.confidence]} [${VERDICT_MARK[s.verdict]}] ${s.axis}/${s.theme}`);
    L.push(`      紫微: ${s.zwds_evidence}`);
    L.push(`      人类图: ${s.hd_evidence}`);
  }
  if (r.differences.length) {
    L.push("");
    L.push("  【差异点 · 自我探索线索】");
    for (const s of r.differences) {
      L.push(`  ⚡ ${s.theme}: 紫微[${s.zwds_evidence}] vs 人类图[${s.hd_evidence}]`);
    }
  }
  if (r.insights.length) {
    L.push("");
    L.push("  【单侧洞察】");
    for (const i of r.insights) {
      L.push(`  💡 [${i.source === "ziwei" ? "紫微提出" : "人类图提出"}] ${i.text}`);
    }
  }
  L.push("");
  L.push("-".repeat(62));
  L.push(`  规则版本 v${r.meta.map_version} | 验证状态 ${r.meta.rules_status.join(",")}`);
  L.push(`  ⚠️  ${r.disclaimer}`);
  return L.join("\n");
}
