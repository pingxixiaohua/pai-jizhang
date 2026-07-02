import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { CategoryL1 } from '../types';
import AmountInput from '../components/AmountInput';
import CategoryPicker from '../components/CategoryPicker';
import { format } from 'date-fns';

interface AddExpenseProps {
  categories: CategoryL1[];
  onSuccess: () => void;
}

export default function AddExpense({ categories, onSuccess }: AddExpenseProps) {
  const [amount, setAmount] = useState('');
  const [selectedL1, setSelectedL1] = useState<number | null>(null);
  const [selectedL2, setSelectedL2] = useState<number | null>(null);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Pre-select first category
  useEffect(() => {
    if (categories.length > 0 && selectedL1 === null) {
      const firstCat = categories[0];
      setSelectedL1(firstCat.id);
      if (firstCat.children.length > 0) {
        setSelectedL2(firstCat.children[0].id);
      }
    }
  }, [categories, selectedL1]);

  const handleCategoryChange = (l1: number, l2: number) => {
    setSelectedL1(l1);
    setSelectedL2(l2);
  };

  const handleDateChange = (days: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setDate(format(d, 'yyyy-MM-dd'));
  };

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage({ type: 'error', text: '请输入有效金额' });
      return;
    }
    if (amountNum > 9999999999) {
      setMessage({ type: 'error', text: '金额过大' });
      return;
    }
    if (selectedL1 === null || selectedL2 === null) {
      setMessage({ type: 'error', text: '请选择分类' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await invoke('add_expense', {
        amount: amountNum,
        categoryL1Id: selectedL1,
        categoryL2Id: selectedL2,
        date,
        note: note.trim() || null,
      });

      setAmount('');
      setNote('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setMessage({ type: 'success', text: '✅ 已记录' });

      setTimeout(() => setMessage(null), 2000);
      onSuccess();
    } catch (e) {
      setMessage({ type: 'error', text: `保存失败: ${e}` });
    } finally {
      setSaving(false);
    }
  };

  const dateObj = new Date(date + 'T00:00:00');
  const dateDisplay = format(dateObj, 'M月d日');
  const weekdayDisplay = format(dateObj, 'EEEE');

  return (
    <div className="max-w-lg mx-auto h-full flex flex-col">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">记一笔</h2>

      {/* Amount Input */}
      <div className="card mb-4">
        <AmountInput value={amount} onChange={setAmount} disabled={saving} />
      </div>

      {/* Category Picker */}
      <div className="card mb-4">
        <label className="block text-sm font-medium text-gray-500 mb-3">选择分类</label>
        <CategoryPicker
          categories={categories}
          selectedL1={selectedL1}
          selectedL2={selectedL2}
          onChange={handleCategoryChange}
          disabled={saving}
        />
      </div>

      {/* Date Picker */}
      <div className="card mb-4">
        <label className="block text-sm font-medium text-gray-500 mb-3">日期</label>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleDateChange(-1)}
            disabled={saving}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-800">{dateDisplay}</div>
            <div className="text-sm text-gray-400">{weekdayDisplay}</div>
          </div>
          <button
            type="button"
            onClick={() => handleDateChange(1)}
            disabled={saving}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Note Input */}
      <div className="card mb-6">
        <label className="block text-sm font-medium text-gray-500 mb-2">备注 (可选)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={saving}
          placeholder="例如：午餐外卖"
          className="input-field"
          maxLength={100}
        />
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-center text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || !amount}
        className="btn-primary w-full py-3.5 text-base"
      >
        {saving ? '保存中...' : '保存'}
      </button>
    </div>
  );
}
