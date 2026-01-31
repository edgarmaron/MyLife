import { AppState, Section } from './types';

export const EXPENSE_CATEGORIES = [
  'Food',
  'Groceries',
  'Transport',
  'Housing',
  'Utilities',
  'Shopping',
  'Gadgets/Electronics',
  'Entertainment',
  'Health',
  'Personal Care',
  'Education',
  'Travel',
  'Gifts',
  'Subscriptions',
  'Charity',
  'Other',
];

export const INVESTMENT_TYPES = ['STOCK', 'ETF', 'FUND'];
export const CRYPTO_TYPES = ['CRYPTO'];

export const INITIAL_STATE: AppState = {
  settings: {
    name: 'User',
    heightCm: 175,
    dailyCalorieTarget: 2000,
    dailyStepTarget: 10000,
    mainCurrency: 'RON',
    investmentCurrency: 'EUR',
    exchangeRate: 4.97, // Approximate EUR to RON
    lastBackupDate: undefined,
  },
  accounts: [
    { id: 'acc_1', name: 'Wallet', type: 'CASH', currency: 'RON', balance: 0 },
    { id: 'acc_2', name: 'Main Checking', type: 'BANK', currency: 'RON', balance: 0 },
  ],
  expenses: [],
  savings: [
    { id: 'sav_1', name: 'Emergency Fund', type: 'EMERGENCY', balance: 0, currency: 'RON' }
  ],
  savingsTransactions: [],
  holdings: [],
  investmentTransactions: [],
  weightEntries: [],
  calorieEntries: [],
  stepEntries: [],
  trainingEntries: [],
  auditLog: [
    {
      id: 'init',
      timestamp: new Date().toISOString(),
      section: Section.SETTINGS,
      actionType: 'ADD',
      description: 'App initialized',
    },
  ],
};