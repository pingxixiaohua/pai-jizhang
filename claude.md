# 派记账 (Pai Accounting) — 产品文档

## 产品概述

| 项目 | 内容 |
|------|------|
| **产品名称** | 派记账 (Pai Accounting) |
| **定位** | 轻量级桌面记账应用，专注个人日常花销记录与管理 |
| **运行平台** | Ubuntu Linux x64，deb 格式分发 |
| **版本** | 0.4.0 |
| **Slogan** | 每一笔，都算数 |

## 技术架构

```
Tauri v2 + React 18 + TypeScript + Tailwind CSS 3
├── 前端: React 18 + TypeScript + Tailwind CSS + Zustand + date-fns
├── 后端: Rust + rusqlite (bundled SQLite) + tauri-plugin-dialog
├── 桥接: Tauri v2 IPC Commands
└── 打包: .deb (~2.7MB)
```

### 数据库
- SQLite 单文件数据库
- 存储路径: `~/.local/share/pai-jizhang/pai-jizhang.db`

## 核心功能 (MVP)

### 1. 记一笔
- 金额输入（人民币 ¥），支持小数点后两位
- 两级分类选择（大类 → 小类）
- 日期选择（默认当天，支持前后翻页）
- 可选备注（最长 100 字）
- 保存后即时反馈

### 2. 账单列表
- 按日期倒序展示所有花销记录
- 卡片式布局，显示：分类图标 + 分类名 + 金额 + 日期 + 备注
- 按一级分类筛选
- 按日期范围筛选
- 显示记录总数和金额合计
- 支持删除单条记录

### 3. 分类管理
- 树形展示所有分类（12 大类 / 51 小类）
- 支持展开/折叠大类
- 支持添加自定义二级小类
- 支持删除自定义小类（有记录的分类不可删除）
- 预设分类不可删除

### 4. 统计概览
- 按月/年统计各分类花销占比
- 饼图（分类占比）/ 柱状图（月度趋势）展示
- 支持前后翻页切换月份

### 6. 数据备份与恢复
- 侧边栏底部 📤/📥 入口
- 备份：弹出保存对话框，导出数据库 `.db` 文件
- 恢复：弹出打开对话框，选择备份文件后恢复
- 恢复后需重启应用生效
- 恢复前自动创建安全备份（`.restore-bak`）

### 5. CSV 数据导出
- 在账单列表页一键导出
- 弹出系统原生保存对话框，**用户自定义路径和文件名**
- 支持按当前筛选条件导出
- 带 BOM 头，Excel 直接打开不乱码

## 花销分类体系

### 一级大类 & 二级小类（预设 12 大类 / 51 小类）

| 图标 | 一级分类 | 二级小类 |
|------|---------|---------|
| 🍜 | 餐饮饮食 | 早餐、午餐、晚餐、零食饮料、外卖、聚餐请客、食材果蔬 |
| 🚗 | 交通出行 | 公交地铁、出租车/网约车、加油充电、停车费、共享单车、长途出行(火车/飞机) |
| 🛒 | 购物消费 | 日用百货、数码电子、家居家装、宠物用品、母婴用品 |
| 🏠 | 住房居住 | 房租/房贷、水电燃气、物业费、维修保养、家居用品 |
| 🎮 | 娱乐休闲 | 电影演出、旅游度假、运动健身、游戏充值、咖啡茶馆、KTV/酒吧 |
| 💊 | 医疗健康 | 门诊就医、药品购买、体检保健、牙科眼科、运动康复 |
| 📚 | 教育学习 | 培训课程、考试报名、书籍资料、文具用品 |
| 📱 | 通讯网络 | 话费充值、宽带费用、流量套餐 |
| 👗 | 服饰美妆 | 衣服鞋帽、美妆护肤、首饰配饰、美容美发 |
| 🎁 | 人情社交 | 送礼红包、聚会聚餐、婚礼份子、慈善捐款 |
| 💰 | 金融保险 | 保险费用、贷款利息、手续费 |
| 📦 | 其他支出 | 其他杂项 |

## 数据库 Schema

```sql
-- 一级分类
CREATE TABLE category_level1 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '',
    sort_order INTEGER DEFAULT 0
);

-- 二级分类
CREATE TABLE category_level2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (parent_id) REFERENCES category_level1(id)
);

-- 花销记录
CREATE TABLE expense (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    category_l1_id INTEGER NOT NULL,
    category_l2_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (category_l1_id) REFERENCES category_level1(id),
    FOREIGN KEY (category_l2_id) REFERENCES category_level2(id)
);
```

## Rust 后端 API (Tauri Commands)

| Command | 参数 | 返回 | 说明 |
|---------|------|------|------|
| `get_categories` | 无 | `Vec<CategoryL1>` | 获取完整分类树 |
| `add_expense` | amount, category_l1_id, category_l2_id, date, note | `AddExpenseResult` | 添加一条花销 |
| `get_expenses` | filter (可选) | `Vec<Expense>` | 查询花销列表 |
| `delete_expense` | id | `()` | 删除一条花销 |
| `add_category_l2` | parent_id, name | `i64` | 添加自定义小类 |
| `delete_category_l2` | id | `()` | 删除自定义小类 |
| `get_monthly_stats` | year, month | `Vec<CategoryStat>` | 月度分类统计 |
| `get_monthly_totals` | year | `Vec<MonthlyTotal>` | 全年各月总计 |
| `export_csv` | start_date, end_date (可选), file_path | `String` (文件路径) | 通过保存对话框导出 CSV |
| `backup_db` | dest_path | `String` | 备份数据库到指定路径 |
| `restore_db` | src_path | `()` | 从备份文件恢复数据库 |

## 前端组件树

```
App
├── Layout (侧边导航 + 内容区)
│   ├── Sidebar (导航菜单: 记一笔/账单/分类/统计)
│   └── Content
│       ├── AddExpense (记一笔)
│       │   ├── AmountInput (金额输入)
│       │   ├── CategoryPicker (级联选择：大类 → 小类)
│       │   ├── DatePicker (日期选择)
│       │   └── NoteInput (备注)
│       ├── ExpenseList (账单列表)
│       │   ├── FilterBar (筛选)
│       │   └── ExpenseItem (记录卡片)
│       └── CategoryManage (分类管理)
│           └── CategoryRow (展开/折叠)
```

## 项目结构

```
pai-jizhang/
├── claude.md                    # 产品文档（本文件）
├── package.json                 # 前端依赖管理
├── vite.config.ts              # Vite 配置
├── tailwind.config.js          # Tailwind CSS 配置
├── tsconfig.json               # TypeScript 配置
├── index.html                  # 入口 HTML
├── src/                        # 前端源码
│   ├── main.tsx                # React 入口
│   ├── App.tsx                 # 根组件（页面路由）
│   ├── types.ts                # TypeScript 类型定义
│   ├── index.css               # 全局样式 + Tailwind
│   ├── components/             # 通用组件
│   │   ├── Layout.tsx          # 布局（侧边栏）
│   │   ├── AmountInput.tsx     # 金额输入
│   │   └── CategoryPicker.tsx  # 分类选择器
│   └── pages/                  # 页面组件
│       ├── AddExpense.tsx      # 记一笔
│       ├── ExpenseList.tsx     # 账单列表
│       ├── CategoryManage.tsx  # 分类管理
│       └── Statistics.tsx      # 统计概览
└── src-tauri/                  # Rust 后端
    ├── Cargo.toml              # Rust 依赖
    ├── tauri.conf.json         # Tauri 配置
    ├── build.rs                # 构建脚本
    ├── capabilities/           # 权限配置
    │   └── default.json
    ├── icons/                  # 应用图标
    └── src/
        ├── main.rs             # 入口
        └── lib.rs              # 核心逻辑（DB 初始化、Commands）
```

## 构建与打包

```bash
# 开发模式
npm run tauri dev

# 构建 .deb 包
npm run tauri build

# 输出
# src-tauri/target/release/bundle/deb/pai-jizhang_0.3.0_amd64.deb (~2.7MB)
```

## 技术选型理由

选择 **Tauri v2 + React + TypeScript** 而非其他方案的原因：

1. **包体积最优**: 2.6MB vs Electron 的 80-150MB
2. **原生性能**: Rust 后端直接操作 SQLite，无 Node.js 中间层
3. **安全**: Tauri 沙箱安全模型，默认拒绝危险 API
4. **未来扩展**: 同一套代码可扩展到 macOS/Windows，甚至移动端
5. **开发生态**: React + TypeScript 生态成熟，Tailwind CSS 快速构建 UI

## 路线图

- [x] v0.1.0 — MVP: 记一笔 + 账单列表 + 分类管理
- [x] v0.2.0 — 统计概览（饼图/柱状图）+ 新应用图标
- [x] v0.3.0 — CSV 数据导出
- [x] v0.4.0 — 数据备份与恢复
- [ ] v1.0.0 — 正式发布
