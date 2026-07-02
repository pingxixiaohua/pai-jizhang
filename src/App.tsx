import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Layout from './components/Layout';
import AddExpense from './pages/AddExpense';
import ExpenseList from './pages/ExpenseList';
import CategoryManage from './pages/CategoryManage';
import Statistics from './pages/Statistics';
import type { CategoryL1, Page } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('add');
  const [categories, setCategories] = useState<CategoryL1[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await invoke<CategoryL1[]>('get_categories');
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load categories:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const renderPage = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-400 text-sm">加载中...</span>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'add':
        return (
          <AddExpense
            categories={categories}
            onSuccess={() => {}}
          />
        );
      case 'list':
        return <ExpenseList categories={categories} />;
      case 'categories':
        return (
          <CategoryManage
            categories={categories}
            onUpdate={loadCategories}
          />
        );
      case 'stats':
        return <Statistics />;
      default:
        return null;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

export default App;
