import React, { useState, useMemo } from 'react';
import { useStore, generateId } from '../store';
import { Card, Button, Container, Modal, Input, Select, ProgressBar, Badge, TimeRangeSelector } from '../components/UI';
import { 
    Plus, PiggyBank, 
    ArrowUpRight, ArrowDownRight, 
    Calendar, RefreshCw, Check, TrendingUp, Sparkles, ShieldCheck, Target, Layers, Wallet
} from 'lucide-react';
import { Expense, SavingsAccount, DateRange, SavingsTransaction } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, subMonths, subWeeks, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const Cash = ({ range: ignoredRange }: { range: DateRange }) => {
  const { state, dispatch } = useStore();
  const [activeTab, setActiveTab] = useState<'GOALS' | 'TIMELINE'>('GOALS');
  
  // Local Range State for Timeline
  const today = new Date();
  const [range, setRange] = useState<DateRange>({
      preset: 'MONTH',
      start: format(startOfMonth(today), 'yyyy-MM-dd'),
      end: format(endOfMonth(today), 'yyyy-MM-dd'),
      label: 'This Month'
  });

  // Modal States
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddPot, setShowAddPot] = useState(false);
  const [showPotTx, setShowPotTx] = useState<{ isOpen: boolean; type: 'DEPOSIT'|'WITHDRAW'; potId: string } | null>(null);
  
  // Editing States
  const [editingPot, setEditingPot] = useState<SavingsAccount | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

  // --- 1. Savings Logic (GOALS Tab) ---
  const totalSavings = state.savings.reduce((sum, s) => sum + s.balance, 0);
  const emergencyPot = state.savings.find(s => s.type === 'EMERGENCY');
  const otherPots = state.savings.filter(s => s.type !== 'EMERGENCY');

  // Savings Performance (Global context, not range filtered for totals)
  const monthlySavingsGoal = otherPots.reduce((sum, p) => sum + (p.target && p.target > p.balance ? (p.target - p.balance)/12 : 0), 0); // Crude "monthly need" metric if we wanted
  
  // --- 2. Timeline Logic (TIMELINE Tab) ---
  const inRange = (dateStr: string) => isWithinInterval(parseISO(dateStr), { start: parseISO(range.start), end: parseISO(range.end) });

  // Filter Data
  const expensesInRange = state.expenses.filter(e => inRange(e.date));
  const spentInRange = expensesInRange.reduce((sum, e) => sum + e.amount, 0);
  
  const savingsInRange = state.savingsTransactions.filter(t => t.type === 'DEPOSIT' && inRange(t.date));
  const savedInRange = savingsInRange.reduce((sum, t) => sum + t.amount, 0);

  // Comparative Logic
  const getPreviousRangeData = () => {
      let startPrev, endPrev;
      const startCurrent = parseISO(range.start);

      if (range.preset === 'MONTH') {
          startPrev = startOfMonth(subMonths(startCurrent, 1));
          endPrev = endOfMonth(subMonths(startCurrent, 1));
      } else if (range.preset === 'WEEK') {
          startPrev = startOfWeek(subWeeks(startCurrent, 1), { weekStartsOn: 1 });
          endPrev = endOfWeek(subWeeks(startCurrent, 1), { weekStartsOn: 1 });
      } else {
          // Fallback
          endPrev = parseISO(format(subMonths(startCurrent, 0), 'yyyy-MM-dd')); 
          startPrev = startCurrent; 
          return { spent: 0 }; 
      }

      const prevExpenses = state.expenses.filter(e => isWithinInterval(parseISO(e.date), { start: startPrev, end: endPrev }));
      return {
          spent: prevExpenses.reduce((sum, e) => sum + e.amount, 0)
      };
  };

  const prevData = useMemo(() => getPreviousRangeData(), [range, state.expenses]);
  
  // Headline
  let headline = { title: "", subtitle: "", color: "bg-slate-900" };
  const spendDiff = spentInRange - prevData.spent;

  if (savedInRange > spentInRange * 0.2 && spentInRange > 0) {
      headline = { 
          title: `You're balancing nicely.`, 
          subtitle: `You saved ${state.settings.mainCurrency}${savedInRange.toLocaleString()} while keeping spending under control.`,
          color: "bg-emerald-900"
      };
  } else if (range.preset !== 'ALL' && range.preset !== 'CUSTOM' && prevData.spent > 0) {
      if (spendDiff > 0) {
          headline = { 
              title: `Spending is up ${state.settings.mainCurrency}${Math.abs(spendDiff).toLocaleString()}.`, 
              subtitle: `You spent ${state.settings.mainCurrency}${prevData.spent.toLocaleString()} this time last period.`,
              color: "bg-slate-900"
          };
      } else {
          headline = { 
              title: `Spending is down ${state.settings.mainCurrency}${Math.abs(spendDiff).toLocaleString()}.`, 
              subtitle: `Great job! You're spending less than last period.`,
              color: "bg-blue-900"
          };
      }
  } else {
      headline = { 
          title: `Total spend: ${state.settings.mainCurrency}${spentInRange.toLocaleString()}`, 
          subtitle: `${expensesInRange.length} transactions recorded in this period.`,
          color: "bg-slate-900"
      };
  }

  // Category Breakdown
  const expenseStats = useMemo(() => {
    const stats: {[key: string]: number} = {};
    expensesInRange.forEach(e => {
        stats[e.category] = (stats[e.category] || 0) + e.amount;
    });
    return Object.entries(stats)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);
  }, [expensesInRange]);
  
  const topCategory = expenseStats[0];

  // Grouped Timeline
  const groupedTimeline = useMemo(() => {
      const filtered = state.expenses.filter(e => inRange(e.date));
      const sorted = filtered.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const groups: Record<string, { items: Expense[], total: number }> = {};
      let maxDaily = 0;

      sorted.forEach(e => {
          const d = e.date; 
          if (!groups[d]) groups[d] = { items: [], total: 0 };
          groups[d].items.push(e);
          groups[d].total += e.amount;
          if(groups[d].total > maxDaily) maxDaily = groups[d].total;
      });
      return { groups, maxDaily };
  }, [state.expenses, range]);

  // --- 3. Forms & Handlers ---
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    amount: 0, category: 'Food', date: format(today, 'yyyy-MM-dd'), note: '', merchant: '', isRecurring: false
  });
  const [newPot, setNewPot] = useState<Partial<SavingsAccount>>({ name: '', type: 'REGULAR', balance: 0, target: 0 });
  const [txAmount, setTxAmount] = useState<number | ''>('');

  const handleSaveExpense = () => {
      if(!newExpense.amount) return;
      const payload: Expense = {
          id: editingExpenseId || generateId(),
          amount: Number(newExpense.amount),
          category: newExpense.category || 'Other',
          date: newExpense.date || format(new Date(), 'yyyy-MM-dd'),
          accountId: state.accounts[0]?.id, // Default hidden account
          currency: state.settings.mainCurrency,
          note: newExpense.note,
          merchant: newExpense.merchant,
          isRecurring: newExpense.isRecurring || false
      };
      if (editingExpenseId) dispatch({ type: 'EDIT_EXPENSE', payload });
      else dispatch({ type: 'ADD_EXPENSE', payload });
      closeExpenseModal();
  };

  const handleDeleteExpense = (id: string) => {
      if(window.confirm("Delete this transaction?")) {
          dispatch({ type: 'DELETE_EXPENSE', payload: id });
          closeExpenseModal();
      }
  };

  const closeExpenseModal = () => {
      setShowAddExpense(false);
      setEditingExpenseId(null);
      setNewExpense({ amount: 0, category: 'Food', date: format(today, 'yyyy-MM-dd'), note: '', merchant: '', isRecurring: false });
  };

  const openEditExpense = (expense: Expense) => {
      setEditingExpenseId(expense.id);
      setNewExpense(expense);
      setShowAddExpense(true);
  };

  const handleSavePot = () => {
      if(!newPot.name) return;
      const payload = { ...newPot, id: editingPot?.id || generateId(), balance: Number(newPot.balance), target: Number(newPot.target) } as SavingsAccount;
      if (editingPot) dispatch({ type: 'EDIT_SAVINGS_ACCOUNT', payload });
      else dispatch({ type: 'ADD_SAVINGS_ACCOUNT', payload });
      setShowAddPot(false);
  };

  const handlePotTx = () => {
      if(!showPotTx || !txAmount) return;
      const payload: SavingsTransaction = {
          id: generateId(),
          savingsAccountId: showPotTx.potId,
          date: format(new Date(), 'yyyy-MM-dd'),
          type: showPotTx.type,
          amount: Number(txAmount),
          note: 'Manual Update'
      };
      dispatch({ type: 'ADD_SAVINGS_TX', payload });
      setShowPotTx(null);
      setTxAmount('');
  };

  return (
    <Container>
      {/* Header */}
      <div className="mb-2 flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Cash & Goals</h2>
            <div className="flex items-center gap-2 mt-1">
                 <Calendar size={14} className="text-slate-400" />
                 <p className="text-slate-500 font-medium text-sm">Wealth Building</p>
            </div>
        </div>
        {activeTab === 'TIMELINE' ? (
             <button onClick={() => setShowAddExpense(true)} className="bg-slate-900 text-white p-3 rounded-xl shadow-lg shadow-slate-900/20 active:scale-95 transition-transform">
                <Plus size={24} />
             </button>
        ) : (
             <button onClick={() => { setEditingPot(null); setNewPot({ name: '', type: 'REGULAR', balance: 0, target: 0 }); setShowAddPot(true); }} className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-transform">
                <Plus size={24} />
             </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200">
        <button 
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === 'GOALS' ? 'bg-white text-emerald-700 shadow-md shadow-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('GOALS')}
        >
            Goals
        </button>
        <button 
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === 'TIMELINE' ? 'bg-white text-slate-900 shadow-md shadow-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('TIMELINE')}
        >
            Spending
        </button>
      </div>

      {activeTab === 'GOALS' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* 1. Total Savings Hero */}
            <div className="text-center py-4">
                <div className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Total Savings</div>
                <div className="text-5xl font-black text-slate-900 tracking-tighter">
                    <span className="text-3xl text-slate-300 mr-2 font-bold">{state.settings.mainCurrency}</span>
                    {totalSavings.toLocaleString()}
                </div>
            </div>

            {/* 2. Emergency Fund - Safety Net */}
            <div>
                 <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Safety Net</h3>
                 {emergencyPot ? (
                    <Card 
                        className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl shadow-slate-900/20 relative overflow-hidden"
                        onClick={() => { setEditingPot(emergencyPot); setNewPot(emergencyPot); setShowAddPot(true); }}
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={80} /></div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <ShieldCheck size={18} className="text-emerald-400" />
                                        <span className="font-bold text-lg">{emergencyPot.name}</span>
                                    </div>
                                    <div className="text-slate-400 text-xs">Your financial airbag</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{state.settings.mainCurrency} {emergencyPot.balance.toLocaleString()}</div>
                                </div>
                            </div>
                            
                            {emergencyPot.target ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium text-slate-300">
                                        <span>Target: {state.settings.mainCurrency} {emergencyPot.target.toLocaleString()}</span>
                                        <span>{Math.min(Math.round((emergencyPot.balance/emergencyPot.target)*100), 100)}%</span>
                                    </div>
                                    <ProgressBar value={emergencyPot.balance} max={emergencyPot.target} color="bg-emerald-500" className="bg-white/10" />
                                    <div className="text-right text-[10px] text-slate-400 mt-1">
                                        {Math.max(emergencyPot.target - emergencyPot.balance, 0).toLocaleString()} left to goal
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-400 italic">No target set</div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <Button 
                                    size="sm" 
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm"
                                    onClick={(e) => { e.stopPropagation(); setShowPotTx({ isOpen: true, type: 'DEPOSIT', potId: emergencyPot.id }); }}
                                >
                                    <ArrowUpRight size={16} /> Add Money
                                </Button>
                                <Button 
                                    size="sm" 
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm"
                                    onClick={(e) => { e.stopPropagation(); setShowPotTx({ isOpen: true, type: 'WITHDRAW', potId: emergencyPot.id }); }}
                                >
                                    <ArrowDownRight size={16} /> Withdraw
                                </Button>
                            </div>
                        </div>
                    </Card>
                 ) : (
                    <div 
                        onClick={() => { setEditingPot(null); setNewPot({ name: 'Emergency Fund', type: 'EMERGENCY', balance: 0, target: 10000 }); setShowAddPot(true); }}
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all"
                    >
                        <ShieldCheck size={32} className="text-slate-300 mb-2" />
                        <div className="font-bold text-slate-700">Set up Safety Net</div>
                        <div className="text-xs text-slate-400">Create an emergency fund</div>
                    </div>
                 )}
            </div>

            {/* 3. Goals */}
            <div className="pb-20">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Active Goals</h3>
                <div className="grid grid-cols-1 gap-3">
                    {otherPots.map(pot => {
                         const progress = pot.target ? Math.min((pot.balance / pot.target) * 100, 100) : 0;
                         const left = pot.target ? Math.max(pot.target - pot.balance, 0) : 0;
                         return (
                            <Card 
                                key={pot.id} 
                                className="hover:border-blue-200 transition-all"
                                onClick={() => { setEditingPot(pot); setNewPot(pot); setShowAddPot(true); }}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <Target size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{pot.name}</div>
                                            <div className="text-xs text-slate-500 font-medium">
                                                {pot.target ? `Goal: ${state.settings.mainCurrency} ${pot.target.toLocaleString()}` : 'No Goal Set'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-lg text-slate-900">{state.settings.mainCurrency} {pot.balance.toLocaleString()}</div>
                                        {pot.target ? (
                                            <div className="text-[10px] text-slate-400 font-bold uppercase">{Math.round(progress)}% Complete</div>
                                        ) : null}
                                    </div>
                                </div>
                                
                                {pot.target ? (
                                    <>
                                        <ProgressBar value={pot.balance} max={pot.target} color="bg-blue-500" className="h-2" />
                                        {left > 0 ? (
                                            <div className="text-right text-[10px] text-slate-400 mt-1">
                                                {state.settings.mainCurrency} {left.toLocaleString()} left to goal
                                            </div>
                                        ) : (
                                            <div className="text-right text-[10px] text-emerald-500 font-bold mt-1">
                                                Goal Reached!
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 rounded-lg">Tap to set a target amount</div>
                                )}
                                
                                <div className="flex gap-2 mt-4 pt-3 border-t border-slate-50">
                                    <button 
                                        className="flex-1 text-xs font-bold text-emerald-600 py-2 bg-emerald-50 rounded-lg hover:bg-emerald-100"
                                        onClick={(e) => { e.stopPropagation(); setShowPotTx({ isOpen: true, type: 'DEPOSIT', potId: pot.id }); }}
                                    >
                                        + Add Money
                                    </button>
                                    <button 
                                        className="flex-1 text-xs font-bold text-slate-500 py-2 bg-slate-50 rounded-lg hover:bg-slate-100"
                                        onClick={(e) => { e.stopPropagation(); setShowPotTx({ isOpen: true, type: 'WITHDRAW', potId: pot.id }); }}
                                    >
                                        - Withdraw
                                    </button>
                                </div>
                            </Card>
                         );
                    })}
                    {otherPots.length === 0 && (
                        <div 
                            onClick={() => { setEditingPot(null); setNewPot({ name: 'Holiday Fund', type: 'REGULAR', balance: 0, target: 5000 }); setShowAddPot(true); }}
                            className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 cursor-pointer hover:bg-slate-100"
                        >
                            <Plus className="mx-auto mb-2 opacity-50" />
                            <div>Tap to create a Savings Goal</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Timeline View (Spending) */}
            <TimeRangeSelector range={range} onChange={setRange} />
            
            {/* Narrative Summary */}
            <Card className={`${headline.color} text-white border-none shadow-xl shadow-slate-900/10 relative overflow-hidden`}>
                <div className="relative z-10">
                    <div className="text-2xl font-bold tracking-tight mb-2 leading-tight">
                        {headline.title}
                    </div>
                    <div className="text-blue-100/80 font-medium text-sm leading-relaxed max-w-xs">
                        {headline.subtitle}
                    </div>
                    
                    {/* Embedded Category Insight */}
                    {topCategory && (
                        <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-4">
                            <div className="h-10 w-10 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={expenseStats} dataKey="value" innerRadius={0} outerRadius={20} stroke="none">
                                            {expenseStats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-blue-200/70">Top Category</div>
                                <div className="text-sm font-bold text-white">
                                    {topCategory.name} <span className="text-blue-200/70 font-normal">({Math.round((topCategory.value / spentInRange) * 100)}%)</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Transactions List */}
            <div className="pb-20">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-1">Spending Timeline</h3>
                <div className="space-y-8 relative">
                    {/* Vertical Line Connector */}
                    <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100 -z-10" />

                    {Object.keys(groupedTimeline.groups).length === 0 && (
                        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                             <div className="mb-2"><Sparkles className="mx-auto opacity-50" /></div>
                             No spending recorded for this period.
                        </div>
                    )}
                    
                    {Object.keys(groupedTimeline.groups)
                        .sort((a, b) => b.localeCompare(a)) 
                        .map(dateKey => {
                        const group = groupedTimeline.groups[dateKey];
                        const isToday = dateKey === format(today, 'yyyy-MM-dd');
                        const intensity = groupedTimeline.maxDaily > 0 ? (group.total / groupedTimeline.maxDaily) : 0;
                        const isHighSpend = intensity > 0.7;

                        return (
                            <div key={dateKey} className="relative">
                                {/* Date Header */}
                                <div className="flex items-center gap-3 mb-3 bg-slate-50/80 backdrop-blur-sm p-2 rounded-lg sticky top-0 z-10 border border-slate-100">
                                    <div className={`w-2 h-8 rounded-full ${isHighSpend ? 'bg-rose-500' : 'bg-slate-300'}`} />
                                    <div className="flex-1 flex justify-between items-baseline">
                                        <span className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-700'}`}>
                                            {isToday ? 'Today' : format(parseISO(dateKey), 'EEEE, MMM d')}
                                        </span>
                                        <span className="text-sm font-bold text-slate-900">
                                            {state.settings.mainCurrency}{group.total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Transactions */}
                                <div className="space-y-3 pl-4">
                                    {group.items.map(exp => (
                                        <div key={exp.id} onClick={() => openEditExpense(exp)} className="bg-white p-3 rounded-xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex justify-between items-center active:scale-[0.99] transition-transform cursor-pointer relative z-0">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                                    {exp.isRecurring ? <RefreshCw size={14} /> : (exp.category === 'Food' ? <Layers size={14} /> : <Wallet size={14} />)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">{exp.merchant || exp.category}</div>
                                                    <div className="text-[10px] text-slate-400 font-medium">
                                                        {exp.category}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-slate-900 text-sm">-{state.settings.mainCurrency}{exp.amount}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showAddExpense} onClose={closeExpenseModal} title={editingExpenseId ? "Edit Transaction" : "Log Expense"}>
         <div className="space-y-6">
            <Input 
                type="number" 
                label="Amount" 
                autoFocus
                placeholder="0.00"
                className="text-4xl font-black p-4 text-center text-slate-900 placeholder:text-slate-200"
                value={newExpense.amount || ''} 
                onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} 
            />
            
            <Input 
                label="Merchant / Note" 
                placeholder="e.g. Starbucks, Groceries"
                value={newExpense.merchant || ''} 
                onChange={e => setNewExpense({...newExpense, merchant: e.target.value})} 
            />

            <Select 
                label="Category"
                options={EXPENSE_CATEGORIES.map(c => ({ label: c, value: c }))}
                value={newExpense.category}
                onChange={e => setNewExpense({...newExpense, category: e.target.value})}
            />

            <Input 
                label="Date" 
                type="date" 
                value={newExpense.date} 
                onChange={e => setNewExpense({...newExpense, date: e.target.value})} 
            />

            <div 
                onClick={() => setNewExpense({...newExpense, isRecurring: !newExpense.isRecurring})}
                className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${newExpense.isRecurring ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}
            >
                <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${newExpense.isRecurring ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300'}`}>
                    {newExpense.isRecurring && <Check size={12} strokeWidth={3} />}
                </div>
                <div className="flex-1">
                    <div className={`text-sm font-bold ${newExpense.isRecurring ? 'text-blue-700' : 'text-slate-700'}`}>Recurring Payment</div>
                    <div className="text-xs text-slate-400">Repeats monthly</div>
                </div>
            </div>
            
            <Button className="w-full" size="lg" onClick={handleSaveExpense}>{editingExpenseId ? 'Update' : 'Confirm Spend'}</Button>
            {editingExpenseId && <Button variant="ghost" className="w-full text-red-500" onClick={() => handleDeleteExpense(editingExpenseId)}>Delete Transaction</Button>}
         </div>
      </Modal>

      <Modal isOpen={showAddPot} onClose={() => setShowAddPot(false)} title={editingPot ? "Edit Pot" : "New Savings Goal"}>
         <div className="space-y-5">
            <Input label="Goal Name" placeholder="e.g. Holiday, New Laptop" value={newPot.name} onChange={e => setNewPot({...newPot, name: e.target.value})} autoFocus />
            <Select label="Type" options={[{label: 'Regular Savings', value: 'REGULAR'}, {label: 'Emergency Fund', value: 'EMERGENCY'}]} value={newPot.type} onChange={e => setNewPot({...newPot, type: e.target.value as any})} />
            
            <Input 
                label={`Target Amount (${state.settings.mainCurrency})`} 
                type="number" 
                placeholder="e.g. 5000" 
                className="font-bold text-lg"
                value={newPot.target || ''} 
                onChange={e => setNewPot({...newPot, target: Number(e.target.value)})} 
            />
            <p className="text-xs text-slate-400 -mt-3 mb-2">Setting a target helps you track progress.</p>
            
            {/* If creating new, allow balance set. If editing, typically we use Deposit/Withdraw flow, but user might want to fix a wrong balance. */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                <Input label="Current Balance" type="number" placeholder="0.00" value={newPot.balance || ''} onChange={e => setNewPot({...newPot, balance: Number(e.target.value)})} className="bg-white" />
            </div>
            
            <Button className="w-full" size="lg" onClick={handleSavePot}>Save Goal</Button>
         </div>
      </Modal>
      
      {/* Deposit/Withdraw Modal */}
      <Modal isOpen={!!showPotTx} onClose={() => setShowPotTx(null)} title={showPotTx?.type === 'DEPOSIT' ? 'Add Money' : 'Withdraw'}>
          <div className="space-y-6">
             <Input 
                type="number" 
                label={`Amount to ${showPotTx?.type === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}`}
                autoFocus
                placeholder="0.00"
                className="text-3xl font-bold p-4 text-center text-slate-900"
                value={txAmount || ''} 
                onChange={e => setTxAmount(Number(e.target.value))} 
             />
             <Button className="w-full" size="lg" onClick={handlePotTx}>Confirm</Button>
          </div>
      </Modal>

    </Container>
  );
};