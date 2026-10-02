// life-zhinan — 紫微斗数引擎
// 内核：iztro (MIT, SylarLong) —— 直接用 TS 原版（Python 版 compass-ziwei 的移植源头）
// 职责三件事：排盘 → 规范化输出 → 自检。解读不进引擎（facts-before-interpretation）。
import { astro } from "iztro";
import {
  PALACE_ID, PALACE_CN, STAR_CLASS, SIHUA_TABLE, MAJOR_STARS_14, SHICHEN_NAMES,
  assertValidDate,
} from "./constants.js";

export const __version__ = "0.1.0";
export const ENGINE_CREDIT =
  "life-zhinan ziwei engine (MIT), core from iztro (MIT, SylarLong)";

// 时辰序号：对齐 Python compass-ziwei（23-1 子=0；1-3 丑=1 ... 21-23 亥=11）
export function hourToShichen(hour) {
  return Math.floor((hour + 1) / 2) % 12;
}

export function chart({
  date, hour = null, shichen = null, gender = "男", calendar = "solar", name = "",
}) {
  let idx = shichen;
  if (idx === null && hour !== null) idx = hourToShichen(hour);
  if (idx === null) idx = 0;

  date = assertValidDate(date);
  const [Y, M, D] = date.split("-").map(Number);
  const dateStr = `${Y}-${M}-${D}`;

  const ast = calendar === "lunar"
    ? astro.byLunar(dateStr, idx, gender, true, "zh-CN")
    : astro.bySolar(dateStr, idx, gender, true, "zh-CN");

  const ganZhi = String(ast.chineseDate ?? "");
  const yearGan = ganZhi[0] ?? "";
  const fiveElements = String(ast.fiveElementsClass ?? ""); // iztro zh-CN 直出 '火六局'
  const soulBranch = String(ast.earthlyBranchOfSoulPalace);
  const bodyBranch = String(ast.earthlyBranchOfBodyPalace);

  const palaces = [];
  const mutagenHits = { 禄: [], 权: [], 科: [], 忌: [] };

  for (const p of ast.palaces) {
    const pid = PALACE_ID[p.name] ?? p.name;
    const branch = p.earthlyBranch;
    const starsOut = [];
    for (const [cls, classKey] of [["majorStars", "major"], ["minorStars", "minor"], ["adjectiveStars", "adjective"]]) {
      for (const s of (p[cls] ?? [])) {
        const mutagen = s.mutagen || null;
        starsOut.push({
          name: s.name,
          class: STAR_CLASS[s.type] ?? classKey,
          mutagen,
          brightness: s.brightness || null,
        });
        if (mutagen && mutagenHits[mutagen]) {
          mutagenHits[mutagen].push({
            palace: pid, palace_cn: PALACE_CN[pid] ?? pid, branch, star: s.name,
          });
        }
      }
    }
    palaces.push({
      palace: pid,
      palace_cn: PALACE_CN[pid] ?? p.name,
      branch,
      is_body_palace: branch === bodyBranch,
      is_soul_palace: branch === soulBranch,
      stars: starsOut,
    });
  }

  return {
    engine: { name: "life-zhinan-ziwei", version: __version__, credit: ENGINE_CREDIT },
    input: {
      birth: `${Y}-${String(M).padStart(2, "0")}-${String(D).padStart(2, "0")}`,
      shichen_index: idx,
      gender,
      calendar,
      name,
    },
    summary: {
      four_pillars: ganZhi,
      year_gan: yearGan,
      five_elements_class: fiveElements,
      soul_palace_branch: soulBranch,
      body_palace_branch: bodyBranch,
    },
    palaces,
    mutagens: mutagenHits,
  };
}

// ─────────────────────────────────────────────
// 一致性自检 C1-C5（对齐 compass-ziwei run_checks）
// ─────────────────────────────────────────────

export function runChecks(doc) {
  const findings = [];
  const add = (id, name, ok, detail = "") => findings.push({ id, name, ok, detail });

  const majorsFound = new Set();
  for (const p of doc.palaces) {
    for (const st of p.stars) if (st.class === "major") majorsFound.add(st.name);
  }
  const missing = [...MAJOR_STARS_14].filter((s) => !majorsFound.has(s)).sort();
  add("C1", "十四主星齐备且无越界", majorsFound.size === MAJOR_STARS_14.size && missing.length === 0,
    `找到${majorsFound.size}颗; 缺失=[${missing.join(",")}]`);

  const branches = doc.palaces.map((p) => p.branch);
  add("C2", "十二宫地支互异且满12支",
    new Set(branches).size === 12 && branches.length === 12,
    `${new Set(branches).size} 支`);

  const idx = doc.input.shichen_index % 12;
  const soul = doc.summary.soul_palace_branch;
  const soulIdx = SHICHEN_NAMES.indexOf(soul);
  // 环形距离 min(d, 12-d)。上游 compass 用单向取模 (soul-idx)%12 是 bug：
  // 时辰申(8) vs 命宫未(7) 相邻却被算成 11 → README 示例 16:00 被误拒。此处修正。
  const raw = ((soulIdx - idx) % 12 + 12) % 12;
  const dist = Math.min(raw, 12 - raw);
  add("C3", "命宫地支在时辰邻域内（环形距离≤4, sanity only）",
    dist <= 4,
    `时辰${SHICHEN_NAMES[idx]} vs 命宫${soul} (环距=${dist})`);

  let sihuaOk = true;
  const detailParts = [];
  const expected = SIHUA_TABLE[doc.summary.year_gan] ?? ["?", "?", "?", "?"];
  for (const [i, mutagen] of ["禄", "权", "科", "忌"].entries()) {
    const actual = new Set((doc.mutagens[mutagen] ?? []).map((h) => h.star));
    if (!actual.has(expected[i])) {
      sihuaOk = false;
      detailParts.push(`${mutagen}:期望${expected[i]},实际=[${[...actual].join("/")}]`);
    }
  }
  add("C4", "年干四化表交叉核对", sihuaOk,
    detailParts.join("; ") || `${doc.summary.year_gan}干四化全中`);

  const bodySeen = doc.palaces.filter((p) => p.is_body_palace).length;
  const soulSeen = doc.palaces.filter((p) => p.is_soul_palace).length;
  add("C5", "身宫/命宫各恰好在标记的十二宫里出现一次",
    bodySeen === 1 && soulSeen === 1, `body×${bodySeen} soul×${soulSeen}`);

  return { ok: findings.every((f) => f.ok), findings };
}
