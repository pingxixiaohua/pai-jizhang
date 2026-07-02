use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

pub struct DbState(pub Mutex<Connection>);

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategoryL1 {
    pub id: i64,
    pub name: String,
    pub icon: String,
    pub sort_order: i64,
    pub children: Vec<CategoryL2>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CategoryL2 {
    pub id: i64,
    pub parent_id: i64,
    pub name: String,
    pub sort_order: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Expense {
    pub id: i64,
    pub amount: f64,
    pub category_l1_id: i64,
    pub category_l2_id: i64,
    pub category_l1_name: String,
    pub category_l2_name: String,
    pub category_icon: String,
    pub date: String,
    pub note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct ExpenseFilter {
    pub category_l1_id: Option<i64>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AddExpenseResult {
    pub id: i64,
}

fn init_db(conn: &Connection) {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS category_level1 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon TEXT NOT NULL DEFAULT '',
            sort_order INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS category_level2 (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            parent_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (parent_id) REFERENCES category_level1(id)
        );

        CREATE TABLE IF NOT EXISTS expense (
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
        ",
    )
    .expect("Failed to initialize database tables");
}

fn seed_categories(conn: &Connection) {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM category_level1", [], |row| row.get(0))
        .unwrap_or(0);

    if count > 0 {
        return; // Already seeded
    }

    let categories: Vec<(&str, &str, Vec<&str>)> = vec![
        ("🍜", "餐饮饮食", vec!["早餐", "午餐", "晚餐", "零食饮料", "外卖", "聚餐请客", "食材果蔬"]),
        ("🚗", "交通出行", vec!["公交地铁", "出租车/网约车", "加油充电", "停车费", "共享单车", "长途出行(火车/飞机)"]),
        ("🛒", "购物消费", vec!["日用百货", "数码电子", "家居家装", "宠物用品", "母婴用品"]),
        ("🏠", "住房居住", vec!["房租/房贷", "水电燃气", "物业费", "维修保养", "家居用品"]),
        ("🎮", "娱乐休闲", vec!["电影演出", "旅游度假", "运动健身", "游戏充值", "咖啡茶馆", "KTV/酒吧"]),
        ("💊", "医疗健康", vec!["门诊就医", "药品购买", "体检保健", "牙科眼科", "运动康复"]),
        ("📚", "教育学习", vec!["培训课程", "考试报名", "书籍资料", "文具用品"]),
        ("📱", "通讯网络", vec!["话费充值", "宽带费用", "流量套餐"]),
        ("👗", "服饰美妆", vec!["衣服鞋帽", "美妆护肤", "首饰配饰", "美容美发"]),
        ("🎁", "人情社交", vec!["送礼红包", "聚会聚餐", "婚礼份子", "慈善捐款"]),
        ("💰", "金融保险", vec!["保险费用", "贷款利息", "手续费"]),
        ("📦", "其他支出", vec!["其他杂项"]),
    ];

    for (i, (icon, name, children)) in categories.iter().enumerate() {
        conn.execute(
            "INSERT INTO category_level1 (name, icon, sort_order) VALUES (?1, ?2, ?3)",
            params![name, icon, i as i64],
        )
        .expect("Failed to insert category_level1");

        let parent_id = conn.last_insert_rowid();

        for (j, child_name) in children.iter().enumerate() {
            conn.execute(
                "INSERT INTO category_level2 (parent_id, name, sort_order) VALUES (?1, ?2, ?3)",
                params![parent_id, child_name, j as i64],
            )
            .expect("Failed to insert category_level2");
        }
    }
}

#[tauri::command]
fn get_categories(state: State<DbState>) -> Result<Vec<CategoryL1>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, icon, sort_order FROM category_level1 ORDER BY sort_order")
        .map_err(|e| e.to_string())?;

    let l1_list: Vec<CategoryL1> = stmt
        .query_map([], |row| {
            Ok(CategoryL1 {
                id: row.get(0)?,
                name: row.get(1)?,
                icon: row.get(2)?,
                sort_order: row.get(3)?,
                children: vec![],
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    drop(stmt);

    let mut result = Vec::new();
    for mut l1 in l1_list {
        let mut stmt2 = conn
            .prepare(
                "SELECT id, parent_id, name, sort_order FROM category_level2 WHERE parent_id = ?1 ORDER BY sort_order",
            )
            .map_err(|e| e.to_string())?;

        let children: Vec<CategoryL2> = stmt2
            .query_map(params![l1.id], |row| {
                Ok(CategoryL2 {
                    id: row.get(0)?,
                    parent_id: row.get(1)?,
                    name: row.get(2)?,
                    sort_order: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        l1.children = children;
        result.push(l1);
    }

    Ok(result)
}

#[tauri::command]
fn add_expense(
    state: State<DbState>,
    amount: f64,
    category_l1_id: i64,
    category_l2_id: i64,
    date: String,
    note: Option<String>,
) -> Result<AddExpenseResult, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute(
        "INSERT INTO expense (amount, category_l1_id, category_l2_id, date, note) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![amount, category_l1_id, category_l2_id, date, note],
    )
    .map_err(|e| e.to_string())?;

    Ok(AddExpenseResult {
        id: conn.last_insert_rowid(),
    })
}

#[tauri::command]
fn get_expenses(state: State<DbState>, filter: Option<ExpenseFilter>) -> Result<Vec<Expense>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT e.id, e.amount, e.category_l1_id, e.category_l2_id,
                l1.name as l1_name, l2.name as l2_name, l1.icon,
                e.date, e.note, e.created_at
         FROM expense e
         JOIN category_level1 l1 ON e.category_l1_id = l1.id
         JOIN category_level2 l2 ON e.category_l2_id = l2.id
         WHERE 1=1",
    );

    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref f) = filter {
        if let Some(cat_id) = f.category_l1_id {
            param_values.push(Box::new(cat_id));
            sql.push_str(&format!(" AND e.category_l1_id = ?{}", param_values.len()));
        }
        if let Some(ref start) = f.start_date {
            param_values.push(Box::new(start.clone()));
            sql.push_str(&format!(" AND e.date >= ?{}", param_values.len()));
        }
        if let Some(ref end) = f.end_date {
            param_values.push(Box::new(end.clone()));
            sql.push_str(&format!(" AND e.date <= ?{}", param_values.len()));
        }
    }

    sql.push_str(" ORDER BY e.date DESC, e.created_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let expenses: Vec<Expense> = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok(Expense {
                id: row.get(0)?,
                amount: row.get(1)?,
                category_l1_id: row.get(2)?,
                category_l2_id: row.get(3)?,
                category_l1_name: row.get(4)?,
                category_l2_name: row.get(5)?,
                category_icon: row.get(6)?,
                date: row.get(7)?,
                note: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(expenses)
}

#[tauri::command]
fn delete_expense(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM expense WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn add_category_l2(state: State<DbState>, parent_id: i64, name: String) -> Result<i64, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let max_order: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), -1) FROM category_level2 WHERE parent_id = ?1",
            params![parent_id],
            |row| row.get(0),
        )
        .unwrap_or(-1);

    conn.execute(
        "INSERT INTO category_level2 (parent_id, name, sort_order) VALUES (?1, ?2, ?3)",
        params![parent_id, name, max_order + 1],
    )
    .map_err(|e| e.to_string())?;

    Ok(conn.last_insert_rowid())
}

#[tauri::command]
fn delete_category_l2(state: State<DbState>, id: i64) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    // Check if this category is in use
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM expense WHERE category_l2_id = ?1",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if count > 0 {
        return Err("该分类下有花销记录，无法删除".to_string());
    }

    conn.execute("DELETE FROM category_level2 WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_monthly_stats(
    state: State<DbState>,
    year: i32,
    month: u32,
) -> Result<Vec<CategoryStat>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let start_date = format!("{}-{:02}-01", year, month);
    let end_date = if month == 12 {
        format!("{}-01-01", year + 1)
    } else {
        format!("{}-{:02}-01", year, month + 1)
    };

    let mut stmt = conn
        .prepare(
            "SELECT l1.id, l1.name, l1.icon, COALESCE(SUM(e.amount), 0) as total
             FROM category_level1 l1
             LEFT JOIN expense e ON l1.id = e.category_l1_id
                 AND e.date >= ?1 AND e.date < ?2
             GROUP BY l1.id
             ORDER BY total DESC",
        )
        .map_err(|e| e.to_string())?;

    let stats: Vec<CategoryStat> = stmt
        .query_map(params![start_date, end_date], |row| {
            Ok(CategoryStat {
                category_id: row.get(0)?,
                category_name: row.get(1)?,
                category_icon: row.get(2)?,
                total: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(stats)
}

#[derive(Debug, Serialize)]
pub struct CategoryStat {
    pub category_id: i64,
    pub category_name: String,
    pub category_icon: String,
    pub total: f64,
}

#[derive(Debug, Serialize)]
pub struct MonthlyTotal {
    pub month: u32,
    pub total: f64,
}

#[tauri::command]
fn get_monthly_totals(state: State<DbState>, year: i32) -> Result<Vec<MonthlyTotal>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT CAST(substr(e.date, 6, 2) AS INTEGER) as month, COALESCE(SUM(e.amount), 0) as total
             FROM expense e
             WHERE e.date >= ?1 AND e.date < ?2
             GROUP BY month
             ORDER BY month",
        )
        .map_err(|e| e.to_string())?;

    let start = format!("{}-01-01", year);
    let end = format!("{}-01-01", year + 1);

    let totals: Vec<MonthlyTotal> = stmt
        .query_map(params![start, end], |row| {
            Ok(MonthlyTotal {
                month: row.get(0)?,
                total: row.get(1)?,
            })
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(totals)
}

#[tauri::command]
fn export_csv(
    state: State<DbState>,
    start_date: Option<String>,
    end_date: Option<String>,
    file_path: String,
) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT e.date, l1.name as l1_name, l2.name as l2_name, e.amount, e.note
         FROM expense e
         JOIN category_level1 l1 ON e.category_l1_id = l1.id
         JOIN category_level2 l2 ON e.category_l2_id = l2.id
         WHERE 1=1",
    );

    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref start) = start_date {
        param_values.push(Box::new(start.clone()));
        sql.push_str(&format!(" AND e.date >= ?{}", param_values.len()));
    }
    if let Some(ref end) = end_date {
        param_values.push(Box::new(end.clone()));
        sql.push_str(&format!(" AND e.date <= ?{}", param_values.len()));
    }

    sql.push_str(" ORDER BY e.date DESC, e.created_at DESC");

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let param_refs: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();

    let rows: Vec<(String, String, String, f64, Option<String>)> = stmt
        .query_map(param_refs.as_slice(), |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, f64>(3)?,
                row.get::<_, Option<String>>(4)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    // Build CSV with BOM for Excel UTF-8 compatibility
    let mut csv = String::from("\u{FEFF}");
    csv.push_str("日期,一级分类,二级分类,金额,备注\n");

    for (date, l1, l2, amount, note) in &rows {
        let note_escaped = note.as_deref().unwrap_or("");
        csv.push_str(&format!(
            "{},{},{},{:.2},\"{}\"\n",
            date, l1, l2, amount, note_escaped.replace('"', "\"\"")
        ));
    }

    // Ensure parent directory exists
    let path = std::path::Path::new(&file_path);
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    std::fs::write(&file_path, csv).map_err(|e| e.to_string())?;

    Ok(file_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_dir = dirs_next().unwrap_or_else(|| std::path::PathBuf::from("."));
    std::fs::create_dir_all(&app_dir).ok();

    let db_path = app_dir.join("pai-jizhang.db");
    let conn = Connection::open(&db_path).expect("Failed to open database");

    conn.execute("PRAGMA journal_mode=WAL", []).ok();
    conn.execute("PRAGMA foreign_keys=ON", []).ok();

    init_db(&conn);
    seed_categories(&conn);

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .manage(DbState(Mutex::new(conn)))
        .invoke_handler(tauri::generate_handler![
            get_categories,
            add_expense,
            get_expenses,
            delete_expense,
            add_category_l2,
            delete_category_l2,
            get_monthly_stats,
            get_monthly_totals,
            export_csv,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn dirs_next() -> Option<std::path::PathBuf> {
    if let Ok(dir) = std::env::var("XDG_DATA_HOME") {
        return Some(std::path::PathBuf::from(dir).join("pai-jizhang"));
    }
    if let Ok(home) = std::env::var("HOME") {
        return Some(
            std::path::PathBuf::from(home)
                .join(".local")
                .join("share")
                .join("pai-jizhang"),
        );
    }
    None
}
