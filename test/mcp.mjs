// MCP 端到端：以真实 stdio 客户端连 src/index.js，验证 tools/list + tools/call
// 用法: node test/mcp.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["src/index.js"],
  stderr: "ignore",
});

const client = new Client({ name: "golden-client", version: "0.0.0" });
await client.connect(transport);

// 1. 工具清单
const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
const want = ["consistency_check", "cross_read", "human_design_chart", "ziwei_chart"];
const wantOk = JSON.stringify(names) === JSON.stringify(want);
console.log(`tools/list: ${names.join(", ")} ${wantOk ? "✅" : "❌ 期望 " + want.join(",")}`);

// 每个工具的 inputSchema 必须是合法 JSON Schema（MCP 客户端要渲染）
let schemaOk = true;
for (const t of tools) {
  if (!t.description || !t.inputSchema) { schemaOk = false; console.error(`✗ ${t.name} 缺 description/inputSchema`); }
}
console.log(`schema 完整性: ${schemaOk ? "✅" : "❌"}`);

// 2. cross_read 文本模式
const r1 = await client.callTool({
  name: "cross_read",
  arguments: { date: "1990-03-15", time: "12:00", tz: "+08:00", gender: "男", name: "样例", age: 36 },
});
const t1 = r1.content[0].text;
const ok1 = t1.includes("互证信号矩阵") && t1.includes("显示者") && t1.includes("🟢");
console.log(`cross_read(text): ${ok1 ? "✅" : "❌"} (${t1.length} chars)`);

// 3. cross_read json 模式
const r2 = await client.callTool({
  name: "cross_read",
  arguments: { date: "1990-03-15", time: "12:00", gender: "男", age: 36, format: "json" },
});
const j2 = JSON.parse(r2.content[0].text);
const ok2 = j2.gate?.ziwei_ok === true && j2.gate?.humandesign_ok === true && j2.signals?.length === 4;
console.log(`cross_read(json): ${ok2 ? "✅" : "❌"} signals=${j2.signals?.length}`);

// 4. consistency_check：11 项全绿
const r3 = await client.callTool({
  name: "consistency_check",
  arguments: { date: "1990-03-15", time: "12:00" },
});
const j3 = JSON.parse(r3.content[0].text);
const ok3 = j3.ok === true && j3.passed === "11/11";
console.log(`consistency_check: ${ok3 ? "✅" : "❌"} ${j3.passed}`);

// 5. ziwei_chart 自检
const r4 = await client.callTool({ name: "ziwei_chart", arguments: { date: "1990-03-15", hour: 12 } });
const j4 = JSON.parse(r4.content[0].text);
const ok4 = j4.consistency?.ok === true && j4.summary?.five_elements_class?.includes("局");
console.log(`ziwei_chart: ${ok4 ? "✅" : "❌"} ${j4.summary?.four_pillars}`);

// 6. human_design_chart 自检
const r5 = await client.callTool({
  name: "human_design_chart", arguments: { date: "1990-03-15", time: "12:00" },
});
const j5 = JSON.parse(r5.content[0].text);
const ok5 = j5.consistency?.ok === true && j5.summary?.profile;
console.log(`human_design_chart: ${ok5 ? "✅" : "❌"} ${j5.summary?.type_label} ${j5.summary?.profile}`);

// 7. 坏输入优雅拒绝（不崩溃）
const r6 = await client.callTool({ name: "cross_read", arguments: { date: "1990-02-31" } });
const t6 = r6.content[0].text;
const ok6 = t6.startsWith("❌") || t6.includes("排盘失败");
console.log(`坏输入拒绝: ${ok6 ? "✅" : "❌"}`);

const all = wantOk && schemaOk && ok1 && ok2 && ok3 && ok4 && ok5 && ok6;
await client.close();
console.log(all ? "\nMCP e2e: ALL OK ✅" : "\nMCP e2e: FAILED ❌");
process.exit(all ? 0 : 1);
