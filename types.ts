
// Enums
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER = 'TRANSFER',
}

export enum InvestmentAction {
  BUY = 'BUY',
  SELL = 'SELL',
  DIVIDEND = 'DIVIDEND',
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  UPDATE_PRICE = 'UPDATE_PRICE',
}

export enum Section {
  DASHBOARD = 'Dashboard',
  CASH = 'Cash', // Merged Expenses & Savings
  INVEST = 'Invest', // Merged Stocks & Crypto
  HEALTH = 'Health',
  SETTINGS = 'Settings',
}

export type DateRangePreset = 'TODAY' | 'WEEK' | 'LAST_WEEK' | 'MONTH' | 'LAST_MONTH' | '3_MONTHS' | '6_MONTHS' | 'YEAR' | 'ALL' | 'CUSTOM';

export interface DateRange {
  preset: DateRangePreset;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  label: string;
}

// Interfaces

// 1. Core Logic
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  section: Section;
  actionType: 'ADD' | 'EDIT' | 'DELETE';
  description: string;
  details?: string;
}

// 2. Money
export interface Account {
  id: string;
  name: string;
  type: 'CASH' | 'BANK' | 'CARD';
  currency: string;
  balance: number;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  currency: string;
  category: string;
  merchant?: string;
  accountId?: string; // Source of funds (Optional now)
  isRecurring?: boolean;
  note?: string;
}

export interface SavingsAccount {
  id: string;
  name: string;
  type: 'EMERGENCY' | 'REGULAR';
  balance: number;
  target?: number;
  currency: string;
  bankName?: string;
}

export interface SavingsTransaction {
  id: string;
  savingsAccountId: string;
  date: string;
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  note?: string;
}

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  type: 'STOCK' | 'ETF' | 'FUND' | 'CRYPTO';
  currency: string;
  currentPrice: number;
  lastPriceUpdate: string;
  tags?: string[];
}

export interface InvestmentTransaction {
  id: string;
  holdingId: string;
  date: string;
  type: InvestmentAction;
  quantity?: number; // Shares/Coins
  pricePerUnit?: number;
  fees?: number;
  totalAmount?: number; // Derived or explicit (e.g. Dividend amount)
  note?: string;
}

// 3. Health
export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
  note?: string;
}

export interface CalorieEntry {
  id: string;
  date: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  note?: string;
}

export interface StepEntry {
  id: string;
  date: string;
  count: number;
  note?: string;
}

export interface TrainingEntry {
  id: string;
  date: string;
  type: string;
  durationMinutes: number;
  intensity: 'EASY' | 'MEDIUM' | 'HARD';
  exercises?: string;
  note?: string;
}

// 4. Settings
export interface UserSettings {
  name: string;
  heightCm: number;
  startWeightKg?: number;
  goalWeightKg?: number;
  goalDate?: string; // ISO date string
  dailyCalorieTarget: number;
  dailyStepTarget: number;
  mainCurrency: string; // e.g. RON
  investmentCurrency: string; // e.g. EUR
  exchangeRate: number; // Investment Currency to Main Currency
  lastBackupDate?: string; // ISO date string
  pinnedDashboardSection?: 'HEALTH' | 'MONEY' | 'INVEST';
}

// Global Store State
export interface AppState {
  settings: UserSettings;
  accounts: Account[];
  expenses: Expense[];
  savings: SavingsAccount[];
  savingsTransactions: SavingsTransaction[];
  holdings: Holding[]; // Investments and Crypto
  investmentTransactions: InvestmentTransaction[];
  weightEntries: WeightEntry[];
  calorieEntries: CalorieEntry[];
  stepEntries: StepEntry[];
  trainingEntries: TrainingEntry[];
  auditLog: AuditLogEntry[];
}
