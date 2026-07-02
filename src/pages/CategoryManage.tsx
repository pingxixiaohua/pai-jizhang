import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { CategoryL1 } from '../types';

interface CategoryManageProps {
  categories: CategoryL1[];
  onUpdate: () => void;
}

export default function CategoryManage({ categories, onUpdate }: CategoryManageProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAdd = async (parentId: number) => {
    const name = newName.trim();
    if (!name) {
      setMessage({ type: 'error', text: '请输入分类名称' });
      return;
    }

    // Check for duplicates
    const parent = categories.find((c) => c.id === parentId);
    if (parent?.children.some((c) => c.name === name)) {
      setMessage({ type: 'error', text: '该分类已存在' });
      return;
    }

    try {
      await invoke('add_category_l2', { parentId, name });
      setNewName('');
      setAddingTo(null);
      setMessage({ type: 'success', text: '✅ 已添加' });
      setTimeout(() => setMessage(null), 2000);
      onUpdate();
    } catch (e) {
      setMessage({ type: 'error', text: `添加失败: ${e}` });
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`确定要删除「${name}」分类吗？`)) return;
    try {
      await invoke('delete_category_l2', { id });
      setMessage({ type: 'success', text: `已删除「${name}」` });
      setTimeout(() => setMessage(null), 2000);
      onUpdate();
    } catch (e) {
      setMessage({ type: 'error', text: `${e}` });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 mb-6">分类管理</h2>

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

      <div className="space-y-3">
        {categories.map((cat) => {
          const isExpanded = expanded === cat.id;
          const isAdding = addingTo === cat.id;

          return (
            <div key={cat.id} className="card">
              {/* Category L1 Header */}
              <button
                onClick={() => setExpanded(isExpanded ? null : cat.id)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="font-medium text-gray-800">{cat.name}</span>
                  <span className="text-xs text-gray-400">({cat.children.length})</span>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Category L2 List */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                  {cat.children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-gray-50 group"
                    >
                      <span className="text-sm text-gray-600">{child.name}</span>
                      <button
                        onClick={() => handleDelete(child.id, child.name)}
                        className="text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        title="删除"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* Add new */}
                  {isAdding ? (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="新分类名称"
                        className="input-field text-sm py-1.5 flex-1"
                        maxLength={20}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAdd(cat.id);
                          if (e.key === 'Escape') {
                            setAddingTo(null);
                            setNewName('');
                          }
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleAdd(cat.id)}
                        className="px-3 py-1.5 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                      >
                        添加
                      </button>
                      <button
                        onClick={() => {
                          setAddingTo(null);
                          setNewName('');
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingTo(cat.id)}
                      className="w-full text-sm text-primary-500 hover:text-primary-600 py-2 px-3 rounded-lg hover:bg-primary-50 transition-colors"
                    >
                      + 添加小类
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
