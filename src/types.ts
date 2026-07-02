export interface CategoryL2 {
  id: number;
  parent_id: number;
  name: string;
  sort_order: number;
}

export interface CategoryL1 {
  id: number;
  name: string;
  icon: string;
  sort_order: number;
  children: CategoryL2[];
}

export interface Expense {
  id: number;
  amount: number;
  category_l1_id: number;
  category_l2_id: number;
  category_l1_name: string;
  category_l2_name: string;
  category_icon: string;
  date: string;
  note: string | null;
  created_at: string;
}

export interface ExpenseFilter {
  category_l1_id: number | null;
  start_date: string | null;
  end_date: string | null;
}

export interface CategoryStat {
  category_id: number;
  category_name: string;
  category_icon: string;
  total: number;
}

export interface MonthlyTotal {
  month: number;
  total: number;
}

export type Page = 'add' | 'list' | 'categories' | 'stats';
