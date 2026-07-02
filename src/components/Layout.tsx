import { type ReactNode, useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';
import type { Page } from '../types';

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

const navItems: { key: Page; label: string; icon: string }[] = [
  { key: 'add', label: '记一笔', icon: '➕' },
  { key: 'list', label: '账单', icon: '📋' },
  { key: 'categories', label: '分类', icon: '📂' },
  { key: 'stats', label: '统计', icon: '📊' },
];

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const [version, setVersion] = useState('0.0.0');
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => {});
  }, []);

  const handleBackup = async () => {
    try {
      const dest = await save({
        defaultPath: `派记账_备份_${new Date().toISOString().slice(0, 10)}.db`,
        filters: [{ name: 'SQLite 数据库', extensions: ['db'] }],
      });
      if (!dest) return;
      await invoke('backup_db', { destPath: dest });
      setBackupMsg('✅ 备份成功');
      setTimeout(() => setBackupMsg(null), 3000);
    } catch (e) {
      setBackupMsg(`备份失败: ${e}`);
      setTimeout(() => setBackupMsg(null), 5000);
    }
  };

  const handleRestore = async () => {
    try {
      const src = await open({
        filters: [{ name: 'SQLite 数据库', extensions: ['db'] }],
        multiple: false,
      });
      if (!src) return;
      if (!window.confirm('恢复数据将替换当前所有记录，确定继续？')) return;
      await invoke('restore_db', { srcPath: src });
      alert('✅ 恢复成功！请重新启动应用。');
    } catch (e) {
      alert(`恢复失败: ${e}`);
    }
  };
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-gray-50">
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">
            💰 派记账
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">每一笔，都算数</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-50 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-300">派记账 v{version}</p>
            <div className="flex items-center gap-1">
              <button
                onClick={handleBackup}
                className="text-xs text-gray-400 hover:text-primary-500 transition-colors px-1 py-0.5"
                title="备份数据"
              >
                📤
              </button>
              <button
                onClick={handleRestore}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1 py-0.5"
                title="恢复数据"
              >
                📥
              </button>
            </div>
          </div>
          {backupMsg && (
            <p className={`text-xs ${backupMsg.startsWith('✅') ? 'text-green-500' : 'text-red-500'}`}>
              {backupMsg}
            </p>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
