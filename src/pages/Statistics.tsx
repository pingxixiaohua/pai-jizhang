import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { CategoryStat, MonthlyTotal } from '../types';

const PIE_COLORS = [
  '#f97316', '#fb923c', '#fdba74', '#fed7aa',
  '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a',
  '#ef4444', '#f87171', '#fca5a5', '#fecaca',
];

export default function Statistics() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [stats, setStats] = useState<CategoryStat[]>([]);
  const [totals, setTotals] = useState<MonthlyTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (y: number, m: number) => {
    setLoading(true);
    setError(null);

    // Fetch stats and totals independently — one failing won't block the other
    try {
      const monthStats = await invoke<CategoryStat[]>('get_monthly_stats', { year: y, month: m });
      setStats(monthStats.filter((s) => s.total > 0));
    } catch (e) {
      console.error('get_monthly_stats failed:', e);
      setError(`获取${y}年${m}月统计数据失败: ${e}`);
    }

    try {
      const yearTotals = await invoke<MonthlyTotal[]>('get_monthly_totals', { year: y });
      setTotals(yearTotals);
    } catch (e) {
      console.error('get_monthly_totals failed:', e);
      // Non-fatal: bar chart will just show zeros
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData(year, month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const totalAmount = stats.reduce((sum, s) => sum + s.total, 0);

  const barData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const found = totals.find((t) => t.month === m);
    return { name: `${m}月`, total: found ? found.total : 0 };
  });

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">加载统计...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold text-gray-800">
          {year}年{month}月
        </h2>
        <button
          onClick={nextMonth}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Total Card */}
      <div className="card mb-6 text-center">
        <p className="text-sm text-gray-400 mb-2">本月支出</p>
        <p className="text-4xl font-bold text-gray-800">¥{totalAmount.toFixed(2)}</p>
        <p className="text-xs text-gray-400 mt-2">
          {stats.length > 0 ? `${stats.length} 个分类有支出` : '暂无记录'}
        </p>
      </div>

      {totalAmount === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <p className="text-gray-400">本月暂无花销记录</p>
        </div>
      ) : (
        <>
          {/* Pie Chart */}
          <div className="card mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">分类占比</h3>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div style={{ width: 192, height: 192 }} className="flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats}
                      dataKey="total"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {stats.map((_, index) => (
                        <Cell
                          key={index}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: unknown) => `¥${(value as number).toFixed(2)}`}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend */}
              <div className="flex-1 w-full space-y-2">
                {stats.map((item, index) => (
                  <div key={item.category_id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      />
                      <span className="text-gray-600">
                        {item.category_icon} {item.category_name}
                      </span>
                    </div>
                    <span className="text-gray-800 font-medium">
                      ¥{item.total.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="card">
            <h3 className="text-sm font-medium text-gray-500 mb-4">{year}年 月度趋势</h3>
            <div style={{ width: '100%', height: 256 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: unknown) => (v as number) === 0 ? '' : `¥${v}`}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [`¥${(value as number).toFixed(2)}`, '月支出']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} maxBarSize={32}>
                    {barData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={barData[index].total > 0 ? '#f97316' : '#f1f5f9'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
