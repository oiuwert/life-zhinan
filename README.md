# life-zhinan 🧭

**紫微斗数 × 人类图 双系统互证 MCP 服务** —— 一条 `npx` 命令接入任何 agent。

> 两套古老系统对同一张出生盘各自排盘，用机器可读的映射规则做**符号结构互证**：
> 一致点、差异点、单侧洞察，全部附双侧证据与规则验证状态。
> Facts before interpretation —— 引擎只算事实，解读留给 agent。

## 快速开始

**MCP 接入（Claude Code / Cursor / Hermes / 任何 MCP 客户端）：**

```json
{
  "mcpServers": {
    "life-zhinan": { "command": "npx", "args": ["life-zhinan"] }
  }
}
```

首次运行自动从 npm 拉取（25KB 包，纯 JS，无 Python / 无编译 / 无系统依赖）。

**CLI（同引擎，人读/管道两用）：**

```bash
npx life-zhinan read 1990-03-15 --time 12:00 --tz +08:00 --gender 男 --age 36
npx life-zhinan read 1990-03-15 --time 12:00 --format json | jq '.signals'
npx life-zhinan ziwei 1990-03-15 --hour 12      # 紫微排盘 + C1-C5 自检
npx life-zhinan hd 1990-03-15 --time 12:00      # 人类图 + C1-C6 自检
npx life-zhinan check 1990-03-15 --time 12:00   # 双引擎 11 项门禁
```

## MCP 工具面（4 个）

| 工具 | 作用 |
|---|---|
| `cross_read` | 完整互证报告：双引擎排盘 → 11 项自检门禁 → 三轴信号矩阵（发动/显化/决策）→ 一致/差异/单侧洞察；`format: text\|json`，`age` 可选（提供则输出当前大限章节） |
| `ziwei_chart` | 紫微 facts：十二宫/主星亮度/四化落宫/五行局/四柱 + C1-C5 |
| `human_design_chart` | 人类图 facts：类型/人生角色/权威/定义/轮回交叉/九中心/36 通道/意识与无意识行星 + C1-C6 |
| `consistency_check` | 数据可信门禁：11 项机械自检一键全跑 |

**数据可信铁律**：双引擎自检全绿才输出互证结论，否则显式拒绝（gate 原样透出失败项）。

## 质量验证

- **双引擎 golden 对拍 132/132**：TS 实现对拍 Python 参考实现（compass + renlei-tu）逐字段比对——类型/人生角色/权威/定义/轮回交叉/中心/通道/激活闸门/行星闸门爻线/四柱/四化/信号矩阵全一致；天文黄经差 <0.01°
- **MCP e2e 全绿**：真实 stdio 客户端跑 tools/list + 全工具调用 + 坏输入拒绝
- **基准样本盘 1990-03-15**（合成测试数据）
- 已知差异（TS 为准，详见 `test/golden.mjs` 注释）：iztro-py 0.5.0 的拼音直出/亮度表漂移已修正；上游 C3 邻域检查的单向取模 bug 已修正为环形距离

## 架构

```
src/
├── index.js      MCP server (stdio, @modelcontextprotocol/sdk) + CLI
├── cross.js      互证引擎：三轴信号矩阵 + 规则状态透出
├── ziwei.js      紫微：内核 iztro (MIT, SylarLong) + C1-C5 自检
├── hd.js         人类图：内核 astronomy-engine (MIT) + C1-C6 自检
│                 真北交点 = 瞬时轨道面 r×v（与 swisseph TRUE_NODE 对拍差 0.0003°）
├── constants.js  映射表：64 闸门序列/36 通道/九中心/天干四化/三元素…
└── mappings/cross-map-v0.2.yaml   互证规则唯一权威源（机器可读，带验证状态）
```

**测试**：`npm test` = golden 对拍 132 项 · `npm run e2e` = MCP 协议端到端。

## 诚实声明

两套系统均为**文化/叙事系统**。互证 = 符号结构对照，非因果证明、非预测工具；
映射规则当前仅基准样本盘验证（`verified_1sample`），存在事后贴合风险；
不构成医疗/法律/投资依据；不分析未经同意的他人盘。

## 关联

- Python 开发内核（CLI 版双引擎 + 可视化）：[oiuwert/compass](https://github.com/oiuwert/compass)
- 本包 = 面向所有 agent 的 npx 分发形态（纯 TS，无 Python 依赖）

## 致谢

[iztro](https://github.com/SylarLong/iztro) (MIT) · [astronomy-engine](https://github.com/cosmicdrifter/astronomy-engine) (MIT) ·
[human-design-py](https://github.com/geodetheseeker/human-design-py) (MIT) · [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) (MIT)

## License

MIT
