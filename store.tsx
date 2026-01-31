import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { AppState, Section, AuditLogEntry, Expense, Account, SavingsAccount, SavingsTransaction, Holding, InvestmentTransaction, WeightEntry, CalorieEntry, StepEntry, TrainingEntry, InvestmentAction } from './types';
import { INITIAL_STATE } from './constants';
import { v4 as uuidv4 } from 'uuid'; // We will use a simple random ID generator instead of uuid lib for simplicity in this env

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Actions
type Action =
  | { type: 'LOAD_STATE'; payload: AppState }
  | { type: 'MERGE_STATE'; payload: AppState }
  | { type: 'RESET_DATA' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppState['settings']> }
  // Money - Expenses
  | { type: 'ADD_EXPENSE'; payload: Expense }
  | { type: 'DELETE_EXPENSE'; payload: string }
  | { type: 'EDIT_EXPENSE'; payload: Expense }
  // Money - Accounts
  | { type: 'UPDATE_ACCOUNT_BALANCE'; payload: { id: string; amount: number; isAdjustment?: boolean } } // Add or subtract
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'EDIT_ACCOUNT'; payload: Account }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  // Money - Savings
  | { type: 'ADD_SAVINGS_TX'; payload: SavingsTransaction }
  | { type: 'ADD_SAVINGS_ACCOUNT'; payload: SavingsAccount }
  | { type: 'EDIT_SAVINGS_ACCOUNT'; payload: SavingsAccount }
  | { type: 'DELETE_SAVINGS_ACCOUNT'; payload: string }
  // Investments & Crypto
  | { type: 'ADD_HOLDING'; payload: Holding }
  | { type: 'ADD_INVESTMENT_TX'; payload: InvestmentTransaction }
  | { type: 'UPDATE_HOLDING_PRICE'; payload: { id: string; price: number } }
  // Health
  | { type: 'ADD_WEIGHT'; payload: WeightEntry }
  | { type: 'EDIT_WEIGHT'; payload: WeightEntry }
  | { type: 'DELETE_WEIGHT'; payload: string }
  | { type: 'ADD_CALORIES'; payload: CalorieEntry }
  | { type: 'EDIT_CALORIES'; payload: CalorieEntry }
  | { type: 'DELETE_CALORIES'; payload: string }
  | { type: 'ADD_STEPS'; payload: StepEntry }
  | { type: 'EDIT_STEPS'; payload: StepEntry }
  | { type: 'DELETE_STEPS'; payload: string }
  | { type: 'ADD_TRAINING'; payload: TrainingEntry }
  | { type: 'EDIT_TRAINING'; payload: TrainingEntry }
  | { type: 'DELETE_TRAINING'; payload: string }
  // Generic
  | { type: 'LOG_ACTION'; payload: Omit<AuditLogEntry, 'id' | 'timestamp'> };

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> }>({
  state: INITIAL_STATE,
  dispatch: () => null,
});

const reducer = (state: AppState, action: Action): AppState => {
  let newState = { ...state };
  
  // Helper to append log
  const log = (section: Section, actionType: 'ADD' | 'EDIT' | 'DELETE', description: string) => {
    newState.auditLog = [
      {
        id: generateId(),
        timestamp: new Date().toISOString(),
        section,
        actionType,
        description,
      },
      ...newState.auditLog,
    ];
  };

  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;
      
    case 'MERGE_STATE':
      // Basic merge strategy: Concatenate lists and deduplicate by ID if needed.
      // For this implementation, we simply append and rely on IDs being unique (random).
      // A robust implementation would check for ID collisions.
      const imported = action.payload;
      newState = {
          ...state,
          accounts: [...state.accounts, ...imported.accounts.filter(a => !state.accounts.find(x => x.id === a.id))],
          expenses: [...state.expenses, ...imported.expenses.filter(x => !state.expenses.find(y => y.id === x.id))],
          savings: [...state.savings, ...imported.savings.filter(s => !state.savings.find(x => x.id === s.id))],
          savingsTransactions: [...state.savingsTransactions, ...imported.savingsTransactions.filter(t => !state.savingsTransactions.find(x => x.id === t.id))],
          holdings: [...state.holdings, ...imported.holdings.filter(h => !state.holdings.find(x => x.id === h.id))],
          investmentTransactions: [...state.investmentTransactions, ...imported.investmentTransactions.filter(t => !state.investmentTransactions.find(x => x.id === t.id))],
          weightEntries: [...state.weightEntries, ...imported.weightEntries.filter(w => !state.weightEntries.find(x => x.id === w.id))],
          calorieEntries: [...state.calorieEntries, ...imported.calorieEntries.filter(c => !state.calorieEntries.find(x => x.id === c.id))],
          stepEntries: [...state.stepEntries, ...imported.stepEntries.filter(s => !state.stepEntries.find(x => x.id === s.id))],
          trainingEntries: [...state.trainingEntries, ...imported.trainingEntries.filter(t => !state.trainingEntries.find(x => x.id === t.id))],
          auditLog: [...state.auditLog, ...imported.auditLog],
          settings: { ...state.settings, ...imported.settings } // Overwrite settings
      };
      log(Section.SETTINGS, 'EDIT', 'Data imported via merge');
      break;

    case 'RESET_DATA':
      return INITIAL_STATE;
    case 'UPDATE_SETTINGS':
      newState.settings = { ...state.settings, ...action.payload };
      log(Section.SETTINGS, 'EDIT', 'Updated settings');
      break;

    // Expenses & Accounts
    case 'ADD_EXPENSE':
      newState.expenses = [action.payload, ...state.expenses];
      // Deduct from account ONLY if accountId is present
      if (action.payload.accountId) {
          newState.accounts = state.accounts.map(a => 
            a.id === action.payload.accountId 
              ? { ...a, balance: a.balance - action.payload.amount }
              : a
          );
      }
      log(Section.CASH, 'ADD', `Added expense: ${action.payload.category} - ${action.payload.amount}`);
      break;

    case 'EDIT_EXPENSE':
      const oldExpense = state.expenses.find(e => e.id === action.payload.id);
      if (oldExpense) {
          // 1. Revert old balance impact if needed
          if (oldExpense.accountId) {
              newState.accounts = newState.accounts.map(a => 
                  a.id === oldExpense.accountId 
                      ? { ...a, balance: a.balance + oldExpense.amount }
                      : a
              );
          }
          // 2. Apply new balance impact if needed
          if (action.payload.accountId) {
              newState.accounts = newState.accounts.map(a => 
                  a.id === action.payload.accountId 
                      ? { ...a, balance: a.balance - action.payload.amount }
                      : a
              );
          }
          
          newState.expenses = state.expenses.map(e => e.id === action.payload.id ? action.payload : e);
          log(Section.CASH, 'EDIT', `Edited expense: ${action.payload.category}`);
      }
      break;
    
    case 'DELETE_EXPENSE':
      const expense = state.expenses.find(e => e.id === action.payload);
      if (expense) {
        newState.expenses = state.expenses.filter(e => e.id !== action.payload);
        // Refund account ONLY if accountId was present
        if (expense.accountId) {
            newState.accounts = state.accounts.map(a => 
              a.id === expense.accountId 
                ? { ...a, balance: a.balance + expense.amount }
                : a
            );
        }
        log(Section.CASH, 'DELETE', `Deleted expense: ${expense.category}`);
      }
      break;

    case 'ADD_ACCOUNT':
      newState.accounts = [...state.accounts, action.payload];
      log(Section.CASH, 'ADD', `Added account: ${action.payload.name}`);
      break;

    case 'EDIT_ACCOUNT':
        newState.accounts = state.accounts.map(a => a.id === action.payload.id ? action.payload : a);
        log(Section.CASH, 'EDIT', `Edited account: ${action.payload.name}`);
        break;

    case 'DELETE_ACCOUNT':
        newState.accounts = state.accounts.filter(a => a.id !== action.payload);
        log(Section.CASH, 'DELETE', `Deleted account`);
        break;

    case 'UPDATE_ACCOUNT_BALANCE':
      newState.accounts = state.accounts.map(a => 
        a.id === action.payload.id 
          ? { ...a, balance: action.payload.isAdjustment ? action.payload.amount : a.balance + action.payload.amount }
          : a
      );
      log(Section.CASH, 'EDIT', `Updated account balance`);
      break;

    // Savings
    case 'ADD_SAVINGS_ACCOUNT':
      newState.savings = [...state.savings, action.payload];
      log(Section.CASH, 'ADD', `Added savings pot: ${action.payload.name}`);
      break;
    
    case 'EDIT_SAVINGS_ACCOUNT':
      newState.savings = state.savings.map(s => s.id === action.payload.id ? action.payload : s);
      log(Section.CASH, 'EDIT', `Edited savings pot: ${action.payload.name}`);
      break;

    case 'DELETE_SAVINGS_ACCOUNT':
      newState.savings = state.savings.filter(s => s.id !== action.payload);
      log(Section.CASH, 'DELETE', `Deleted savings pot`);
      break;

    case 'ADD_SAVINGS_TX':
      newState.savingsTransactions = [action.payload, ...state.savingsTransactions];
      newState.savings = state.savings.map(s => {
        if (s.id === action.payload.savingsAccountId) {
          const change = action.payload.type === 'DEPOSIT' ? action.payload.amount : -action.payload.amount;
          return { ...s, balance: s.balance + change };
        }
        return s;
      });
      log(Section.CASH, 'ADD', `${action.payload.type} savings: ${action.payload.amount}`);
      break;

    // Investments/Crypto
    case 'ADD_HOLDING':
      newState.holdings = [...state.holdings, action.payload];
      log(Section.INVEST, 'ADD', `Added holding: ${action.payload.symbol}`);
      break;

    case 'UPDATE_HOLDING_PRICE':
      newState.holdings = state.holdings.map(h => 
        h.id === action.payload.id 
          ? { ...h, currentPrice: action.payload.price, lastPriceUpdate: new Date().toISOString() } 
          : h
      );
      const holding = state.holdings.find(h => h.id === action.payload.id);
      if(holding) {
         log(Section.INVEST, 'EDIT', `Updated price for ${holding.symbol}`);
      }
      break;

    case 'ADD_INVESTMENT_TX':
      newState.investmentTransactions = [action.payload, ...state.investmentTransactions];
      const invHolding = state.holdings.find(h => h.id === action.payload.holdingId);
      log(Section.INVEST, 'ADD', `${action.payload.type} ${invHolding?.symbol || 'Asset'}`);
      break;

    // Health
    case 'ADD_WEIGHT':
      newState.weightEntries = [action.payload, ...state.weightEntries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      log(Section.HEALTH, 'ADD', `Logged weight: ${action.payload.weight}`);
      break;
    case 'EDIT_WEIGHT':
      newState.weightEntries = state.weightEntries.map(e => e.id === action.payload.id ? action.payload : e).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      log(Section.HEALTH, 'EDIT', 'Updated weight entry');
      break;
    case 'DELETE_WEIGHT':
      newState.weightEntries = state.weightEntries.filter(w => w.id !== action.payload);
      log(Section.HEALTH, 'DELETE', 'Deleted weight entry');
      break;

    case 'ADD_CALORIES':
      newState.calorieEntries = [action.payload, ...state.calorieEntries];
      log(Section.HEALTH, 'ADD', `Logged calories: ${action.payload.calories}`);
      break;
    case 'EDIT_CALORIES':
        newState.calorieEntries = state.calorieEntries.map(e => e.id === action.payload.id ? action.payload : e);
        log(Section.HEALTH, 'EDIT', 'Updated calorie entry');
        break;
    case 'DELETE_CALORIES':
        newState.calorieEntries = state.calorieEntries.filter(e => e.id !== action.payload);
        log(Section.HEALTH, 'DELETE', 'Deleted calorie entry');
        break;

    case 'ADD_STEPS':
      newState.stepEntries = [action.payload, ...state.stepEntries];
      log(Section.HEALTH, 'ADD', `Logged steps: ${action.payload.count}`);
      break;
    case 'EDIT_STEPS':
        newState.stepEntries = state.stepEntries.map(e => e.id === action.payload.id ? action.payload : e);
        log(Section.HEALTH, 'EDIT', 'Updated step entry');
        break;
    case 'DELETE_STEPS':
        newState.stepEntries = state.stepEntries.filter(e => e.id !== action.payload);
        log(Section.HEALTH, 'DELETE', 'Deleted step entry');
        break;

    case 'ADD_TRAINING':
      newState.trainingEntries = [action.payload, ...state.trainingEntries];
      log(Section.HEALTH, 'ADD', `Logged training: ${action.payload.type}`);
      break;
    case 'EDIT_TRAINING':
        newState.trainingEntries = state.trainingEntries.map(e => e.id === action.payload.id ? action.payload : e);
        log(Section.HEALTH, 'EDIT', 'Updated training entry');
        break;
    case 'DELETE_TRAINING':
        newState.trainingEntries = state.trainingEntries.filter(t => t.id !== action.payload);
        log(Section.HEALTH, 'DELETE', 'Deleted training session');
        break;

    default:
      return state;
  }
  
  // Persist
  localStorage.setItem('lifeDashboardState', JSON.stringify(newState));
  return newState;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    const saved = localStorage.getItem('lifeDashboardState');
    if (saved) {
      try {
        dispatch({ type: 'LOAD_STATE', payload: JSON.parse(saved) });
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
};

export const useStore = () => useContext(AppContext);
export { generateId };