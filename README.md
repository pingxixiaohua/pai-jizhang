# 派记账 (Pai Accounting)

> 每一笔，都算数

轻量级桌面记账应用，基于 **Tauri v2 + React + TypeScript + SQLite**，Ubuntu x64 原生运行。

## ✨ 功能

- 💰 **记一笔** — 快速记录花销：金额、二级分类、日期、备注
- 📋 **账单列表** — 时间倒序卡片式展示，分类/日期筛选，删除确认
- 🗂️ **分类管理** — 12 大类 51 小类预设，支持自定义扩展
- 📊 **统计图表** — 月度分类占比饼图 + 全年趋势柱状图
- 📥 **CSV 导出** — 自定义路径，Excel 兼容（UTF-8 BOM）

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri v2 |
| 前端 | React 19 + TypeScript + Tailwind CSS 3 |
| 图表 | Recharts |
| 后端 | Rust + rusqlite (bundled SQLite) |
| 打包 | .deb (~2.8MB) |

## 🚀 快速开始

### 依赖

- Node.js ≥ 18
- Rust toolchain (rustup)
- Ubuntu: `libwebkit2gtk-4.1-dev libsoup-3.0-dev libjavascriptcoregtk-4.1-dev librsvg2-dev libssl-dev`

```bash
# 安装前端依赖
npm install

# 开发模式
npm run tauri dev

# 构建 .deb 包
npm run tauri build
```

## 📦 安装

```bash
sudo dpkg -i pai-jizhang_0.3.0_amd64.deb
```

数据存储在 `~/.local/share/pai-jizhang/pai-jizhang.db`

## 📂 项目结构

```
pai-jizhang/
├── src/                        # React 前端
│   ├── components/             # 通用组件
│   ├── pages/                  # 页面组件
│   └── types.ts                # 类型定义
├── src-tauri/                  # Rust 后端
│   └── src/lib.rs              # 数据库 + Commands
└── claude.md                   # 详细产品文档
```

## 📄 协议

MIT
