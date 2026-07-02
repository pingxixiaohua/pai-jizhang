import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import type { CategoryL1, Expense, ExpenseFilter } from '../types';

interface ExpenseListProps {
  categories: CategoryL1[];
}

export default function ExpenseList({ categories }: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState<number | null>(null);
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const filter: ExpenseFilter = {
        category_l1_id: filterCat,
        start_date: filterStart || null,
        end_date: filterEnd || null,
      };
      const data = await invoke<Expense[]>('get_expenses', { filter });
      setExpenses(data);
    } catch (e) {
      console.error('Failed to load expenses:', e);
    } finally {
      setLoading(false);
    }
  }, [filterCat, filterStart, filterEnd]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('确定要删除这条记录吗？')) return;
    try {
      await invoke('delete_expense', { id });
      loadExpenses();
    } catch (e) {
      console.error('Failed to delete expense:', e);
    }
  };

  const handleExport = async () => {
    try {
      const filePath = await save({
        defaultPath: `派记账_导出_${new Date().toISOString().slice(0, 10)}.csv`,
        filters: [{ name: 'CSV 文件', extensions: ['csv'] }],
      });
      if (!filePath) return; // User cancelled

      await invoke('export_csv', {
        startDate: filterStart || null,
        endDate: filterEnd || null,
        filePath,
      });
      alert(`✅ 已导出到:\n${filePath}`);
    } catch (e) {
      alert(`导出失败: ${e}`);
    }
  };

  const clearFilters = () => {
    setFilterCat(null);
    setFilterStart('');
    setFilterEnd('');
    setShowFilters(false);
  };

  const hasFilters = filterCat !== null || filterStart !== '' || filterEnd !== '';

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">账单列表</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="px-3 py-1.5 text-sm rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium"
          >
            📥 导出 CSV
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              hasFilters
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            🔍 筛选 {hasFilters && '●'}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card mb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterCat(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterCat === null
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilterCat(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterCat === cat.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filterStart}
              onChange={(e) => setFilterStart(e.target.value)}
              className="input-field text-sm py-1.5"
              placeholder="开始日期"
            />
            <span className="text-gray-300">—</span>
            <input
              type="date"
              value={filterEnd}
              onChange={(e) => setFilterEnd(e.target.value)}
              className="input-field text-sm py-1.5"
              placeholder="结束日期"
            />
          </div>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-primary-500 hover:text-primary-600">
              清除筛选
            </button>
          )}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-sm text-gray-400">
          {expenses.length} 条记录
        </span>
        <span className="text-sm text-gray-500">
          合计 <span className="text-lg font-semibold text-gray-800">¥{totalAmount.toFixed(2)}</span>
        </span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-gray-400">暂无记录，去记一笔吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="card flex items-center gap-4 group hover:shadow-md transition-shadow"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl flex-shrink-0">
                {expense.category_icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">
                    {expense.category_l1_name} · {expense.category_l2_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-400">
                    {expense.date}
                  </span>
                  {expense.note && (
                    <span className="text-xs text-gray-400 truncate">
                      · {expense.note}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-semibold text-gray-800">
                  ¥{expense.amount.toFixed(2)}
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(expense.id)}
                className="opacity-0 group-hover:opacity-100 btn-danger flex-shrink-0 transition-opacity"
                title="删除"
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
