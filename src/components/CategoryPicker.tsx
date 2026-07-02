import { useState } from 'react';
import type { CategoryL1, CategoryL2 } from '../types';

interface CategoryPickerProps {
  categories: CategoryL1[];
  selectedL1: number | null;
  selectedL2: number | null;
  onChange: (l1: number, l2: number) => void;
  disabled?: boolean;
}

export default function CategoryPicker({
  categories,
  selectedL1,
  selectedL2,
  onChange,
  disabled,
}: CategoryPickerProps) {
  const [activeL1, setActiveL1] = useState<number | null>(
    selectedL1 || (categories.length > 0 ? categories[0].id : null)
  );

  const currentL1 = categories.find((c) => c.id === activeL1);

  const handleL1Change = (l1Id: number) => {
    setActiveL1(l1Id);
    const l1 = categories.find((c) => c.id === l1Id);
    if (l1 && l1.children.length > 0) {
      onChange(l1Id, l1.children[0].id);
    }
  };

  const handleL2Change = (l2Id: number) => {
    if (activeL1 !== null) {
      onChange(activeL1, l2Id);
    }
  };

  // Auto-select first child if L1 changes and no L2 selected
  const displayL2Id = selectedL1 === activeL1 ? selectedL2 : null;

  return (
    <div className="space-y-4">
      {/* Level 1 - Icon Grid */}
      <div className="grid grid-cols-4 gap-2">
        {categories.map((cat) => {
          const isActive = activeL1 === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => handleL1Change(cat.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary-100 ring-2 ring-primary-400'
                  : 'bg-gray-50 hover:bg-gray-100'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span className="text-xl">{cat.icon}</span>
              <span
                className={`text-xs font-medium ${
                  isActive ? 'text-primary-700' : 'text-gray-500'
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Level 2 - Flow Layout */}
      {currentL1 && currentL1.children.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {currentL1.children.map((child: CategoryL2) => {
            const isActive = displayL2Id === child.id;
            return (
              <button
                key={child.id}
                type="button"
                disabled={disabled}
                onClick={() => handleL2Change(child.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300 hover:text-primary-600'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {child.name}
              </button>
            );
          })}
        </div>
      )}

      {(!currentL1 || currentL1.children.length === 0) && (
        <p className="text-sm text-gray-400 text-center py-2">该分类下暂无小类</p>
      )}
    </div>
  );
}
