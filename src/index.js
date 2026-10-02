#!/usr/bin/env node
// life-zhinan — 紫微斗数 × 人类图 双系统互证 MCP 服务
// 用法：
//   npx life-zhinan               → MCP server（stdio）
//   npx life-zhinan read 1990-03-15 --time 12:00 --tz +08:00 --gender 男 [--age 36] [--json]
//   npx life-zhinan ziwei 1990-03-15 --hour 12 [--gender 男] [--json]
//   npx life-zhinan hd 1990-03-15 --time 12:00 [--tz +08:00] [--json]
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { crossRead, formatReport } from "./cross.js";
import { chart as ziweiChart, runChecks as zwChecks } from "./ziwei.js";
import { calculateChart as hdChart, runChecks as hdChecks } from "./hd.js";

const DISCLAIMER_TOOL = "文化/叙事系统的符号结构对照，非预测工具，不构成医疗/法律/投资依据";

// ─────────────────────────────────────────────
// MCP 工具面（4 个）
// ─────────────────────────────────────────────

const server = new McpServer({ name: "life-zhinan", version: "0.1.0" });

server.tool(
  "cross_read",
  `紫微斗数 × 人类图双系统互证报告：双引擎排盘 + 数据可信门禁（C1-C6 自检）+ 三轴信号矩阵`
  + `（发动/显化/决策）+ 一致点/差异点/单侧洞察 + 规则验证状态。${DISCLAIMER_TOOL}。`,
  {
    date: z.string().describe("出生日期 YYYY-MM-DD（公历）"),
    time: z.string().default("16:00").describe("出生时间 HH:MM（24h）"),
    tz: z.string().default("+08:00").describe("时区：+08:00 偏移或 Asia/Shanghai 等 IANA 名"),
    gender: z.enum(["男", "女"]).default("男"),
    name: z.string().default("").describe("姓名（可选，仅标签）"),
    age: z.number().optional().describe("当前年龄（可选，提供则输出当前大限章节）"),
    format: z.enum(["text", "json"]).default("text").describe("text=人读报告 / json=结构化"),
  },
  async ({ date, time, tz, gender, name, age, format }) => {
    const r = crossRead({ date, time, tz, gender, name, age });
    const text = r.error
      ? `❌ 门禁未通过: ${r.error}\n${JSON.stringify(r.findings ?? r.gate, null, 1)}`
      : (format === "json" ? JSON.stringify(r, null, 2) : formatReport(r));
    return { content: [{ type: "text", text }] };
  },
);

server.tool(
  "ziwei_chart",
  `紫微斗数排盘（facts 层）：十二宫/主星亮度/四化落宫/五行局/四柱 + C1-C5 一致性自检。`
  + `只输出结构化事实，不做解读。${DISCLAIMER_TOOL}。`,
  {
    date: z.string().describe("出生日期 YYYY-MM-DD（公历）或 --calendar lunar 时的农历日期"),
    hour: z.number().min(0).max(23).optional().describe("出生小时 0-23（与 shichen 二选一）"),
    shichen: z.number().min(0).max(12).optional().describe("时辰序号 子=0..亥=11, 晚子=12"),
    gender: z.enum(["男", "女"]).default("男"),
    calendar: z.enum(["solar", "lunar"]).default("solar"),
    name: z.string().default(""),
  },
  async ({ date, hour, shichen, gender, calendar, name }) => {
    try {
      const doc = ziweiChart({ date, hour, shichen, gender, calendar, name });
      const chk = zwChecks(doc);
      return {
        content: [{ type: "text", text: JSON.stringify({ ...doc, consistency: chk }, null, 2) }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: `❌ 排盘失败: ${e.message}` }], isError: true };
    }
  },
);

server.tool(
  "human_design_chart",
  `人类图排盘（facts 层）：类型/人生角色/内在权威/定义/轮回交叉/九中心/36通道 + 意识(黑)与`
  + `无意识(红)行星闸门 + C1-C6 一致性自检。天文用 astronomy-engine 真北交点。${DISCLAIMER_TOOL}。`,
  {
    date: z.string().describe("出生日期 YYYY-MM-DD（公历）"),
    time: z.string().default("12:00").describe("出生时间 HH:MM（24h，人类图需要精确到分）"),
    tz: z.string().default("+08:00").describe("时区：+08:00 偏移或 Asia/Shanghai 等 IANA 名"),
    name: z.string().default(""),
  },
  async ({ date, time, tz, name }) => {
    try {
      const doc = hdChart({ date, time, tz, name });
      const chk = hdChecks(doc);
      return {
        content: [{ type: "text", text: JSON.stringify({ ...doc, consistency: chk }, null, 2) }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: `❌ 排盘失败: ${e.message}` }], isError: true };
    }
  },
);

server.tool(
  "consistency_check",
  "双引擎数据可信门禁：对同一出生输入跑紫微 C1-C5 + 人类图 C1-C6 共 11 项机械自检，"
  + "输出全部 findings 与总判定。全绿才可信——互证管线的前置条件。",
  {
    date: z.string().describe("出生日期 YYYY-MM-DD"),
    time: z.string().default("16:00").describe("出生时间 HH:MM"),
    tz: z.string().default("+08:00"),
    gender: z.enum(["男", "女"]).default("男"),
  },
  async ({ date, time, tz, gender }) => {
    try {
      const [hh] = time.split(":").map(Number);
      const zdoc = ziweiChart({ date, hour: hh, gender });
      const zchk = zwChecks(zdoc);
      const hdoc = hdChart({ date, time, tz });
      const hchk = hdChecks(hdoc);
      const all = [...zchk.findings, ...hchk.findings];
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ok: zchk.ok && hchk.ok,
            passed: `${all.filter((f) => f.ok).length}/${all.length}`,
            ziwei: zchk, humandesign: hchk,
          }, null, 2),
        }],
      };
    } catch (e) {
      return { content: [{ type: "text", text: `❌ 自检失败: ${e.message}` }], isError: true };
    }
  },
);

// ─────────────────────────────────────────────
// CLI 模式（子命令存在时）
// ─────────────────────────────────────────────

function parseArgs(argv) {
  const opts = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) { opts[key] = next; i++; }
      else opts[key] = true;
    } else positional.push(a);
  }
  return { opts, positional };
}

async function cli(mode, argv) {
  const { opts, positional } = parseArgs(argv);
  const date = positional[0];
  if (!date) { console.error(`用法: life-zhinan ${mode} YYYY-MM-DD [--time HH:MM] ...`); process.exit(2); }
  const asJson = Boolean(opts.json);
  let out, text;

  if (mode === "read") {
    const r = crossRead({
      date,
      time: opts.time ?? "16:00",
      tz: opts.tz ?? "+08:00",
      gender: opts.gender ?? "男",
      name: opts.name ?? "",
      age: opts.age ? Number(opts.age) : null,
    });
    if (r.error) { console.error(`❌ ${r.error}`); process.exit(1); }
    text = asJson ? JSON.stringify(r, null, 2) : formatReport(r);
  } else if (mode === "ziwei") {
    out = ziweiChart({
      date,
      hour: opts.hour !== undefined ? Number(opts.hour) : null,
      shichen: opts.shichen !== undefined ? Number(opts.shichen) : null,
      gender: opts.gender ?? "男",
      calendar: opts.calendar ?? "solar",
      name: opts.name ?? "",
    });
    out.consistency = zwChecks(out);
    if (!out.consistency.ok) { console.error("❌ 自检未全绿"); }
    text = JSON.stringify(out, null, 2);
  } else if (mode === "hd") {
    out = hdChart({
      date, time: opts.time ?? "12:00", tz: opts.tz ?? "+08:00", name: opts.name ?? "",
    });
    out.consistency = hdChecks(out);
    if (!out.consistency.ok) { console.error("❌ 自检未全绿"); }
    text = JSON.stringify(out, null, 2);
  } else if (mode === "check") {
    const [hh] = (opts.time ?? "16:00").split(":").map(Number);
    const zdoc = ziweiChart({ date, hour: hh, gender: opts.gender ?? "男" });
    const zchk = zwChecks(zdoc);
    const hdoc = hdChart({ date, time: opts.time ?? "16:00", tz: opts.tz ?? "+08:00" });
    const hchk = hdChecks(hdoc);
    const all = [...zchk.findings, ...hchk.findings];
    text = JSON.stringify({
      ok: zchk.ok && hchk.ok,
      passed: `${all.filter((f) => f.ok).length}/${all.length}`,
      ziwei: zchk, humandesign: hchk,
    }, null, 2);
    if (!(zchk.ok && hchk.ok)) process.exitCode = 1;
  } else {
    console.error(`未知模式: ${mode}`); process.exit(2);
  }
  console.log(text);
}

const argv = process.argv.slice(2);
const MODES = new Set(["read", "ziwei", "hd", "check"]);
if (argv.length > 0 && MODES.has(argv[0])) {
  cli(argv[0], argv.slice(1));
} else if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`life-zhinan v0.1.0 — 紫微斗数 × 人类图 双系统互证
用法:
  life-zhinan                     启动 MCP server (stdio)
  life-zhinan read 1990-03-15 --time 12:00 --tz +08:00 --gender 男 [--age 36] [--json]
  life-zhinan ziwei 1990-03-15 --hour 12 [--gender 男]
  life-zhinan hd 1990-03-15 --time 12:00 --tz Asia/Shanghai
MCP 接入 (claude/cursor/hermes...):
  {"mcpServers":{"life-zhinan":{"command":"npx","args":["life-zhinan"]}}}`);
} else {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdout 是 MCP 协议通道 —— 日志一律走 stderr
  console.error("life-zhinan MCP server ready (stdio)");
}
