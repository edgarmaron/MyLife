
import React, { useState, useMemo } from 'react';
import { useStore, generateId } from '../store';
import { Card, Button, Container, Modal, Input, Select, ProgressBar, TimeRangeSelector } from '../components/UI';
import { 
    Plus, Calendar, ShieldCheck, Target, ArrowUpRight, ArrowDownRight,
    CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { Expense, SavingsAccount, DateRange, SavingsTransaction } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';

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
  const [editingPot, setEditingPot] = useState<SavingsAccount | null>(null);
  
  // Data Logic
  const savingsStats = useMemo(() => {
     return state.savings.map(pot => {
         const txs = state.savingsTransactions.filter(t => t.savingsAccountId === pot.id);
         const lastTx = txs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
         const addedThisMonth = txs
            .filter(t => t.type === 'DEPOSIT' && isSameMonth(parseISO(t.date), today))
            .reduce((sum, t) => sum + t.amount, 0);
            
         return {
             ...pot,
             lastAddedDate: lastTx && lastTx.type === 'DEPOSIT' ? lastTx.date : null,
             addedThisMonth
         };
     });
  }, [state.savings, state.savingsTransactions]);

  const otherPots = savingsStats.filter(s => s.type !== 'EMERGENCY');
  const emergencyPot = savingsStats.find(s => s.type === 'EMERGENCY');

  // --- 3. Forms & Handlers ---
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    amount: 0, category: 'Food', date: format(today, 'yyyy-MM-dd'), note: '', merchant: '', isRecurring: false
  });
  const [newPot, setNewPot] = useState<Partial<SavingsAccount>>({ name: '', type: 'REGULAR', balance: 0, target: 0 });
  const [txAmount, setTxAmount] = useState<number | ''>('');

  const handleSaveExpense = () => {
      if(!newExpense.amount) return;
      dispatch({ 
          type: 'ADD_EXPENSE', 
          payload: {
              id: generateId(),
              amount: Number(newExpense.amount),
              category: newExpense.category || 'Other',
              date: newExpense.date || format(new Date(), 'yyyy-MM-dd'),
              accountId: state.accounts[0]?.id,
              currency: state.settings.mainCurrency,
              note: newExpense.note,
              merchant: newExpense.merchant,
              isRecurring: newExpense.isRecurring
          }
      });
      setShowAddExpense(false);
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
      dispatch({ type: 'ADD_SAVINGS_TX', payload: {
          id: generateId(),
          savingsAccountId: showPotTx.potId,
          date: format(new Date(), 'yyyy-MM-dd'),
          type: showPotTx.type,
          amount: Number(txAmount),
          note: 'Manual Update'
      }});
      setShowPotTx(null);
      setTxAmount('');
  };

  return (
    <Container>
      {/* Header */}
      <div className="mb-2 flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Cash & Goals</h2>
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
            
            {/* 1. Emergency Fund */}
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
                                    <div className="text-slate-400 text-xs">
                                        {emergencyPot.lastAddedDate ? `Last add: ${format(parseISO(emergencyPot.lastAddedDate), 'MMM d')}` : 'No activity yet'}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold">{state.settings.mainCurrency} {emergencyPot.balance.toLocaleString()}</div>
                                    {emergencyPot.addedThisMonth > 0 && (
                                        <div className="text-emerald-400 text-xs font-bold">+{state.settings.mainCurrency}{emergencyPot.addedThisMonth} this month</div>
                                    )}
                                </div>
                            </div>
                            
                            {emergencyPot.target ? (
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs font-medium text-slate-300">
                                        <span>Target: {state.settings.mainCurrency} {emergencyPot.target.toLocaleString()}</span>
                                        <span>{Math.min(Math.round((emergencyPot.balance/emergencyPot.target)*100), 100)}%</span>
                                    </div>
                                    <ProgressBar value={emergencyPot.balance} max={emergencyPot.target} color="bg-emerald-500" className="bg-white/10" />
                                </div>
                            ) : null}

                            <div className="flex gap-3 mt-6">
                                <Button 
                                    size="sm" 
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white border-none backdrop-blur-sm"
                                    onClick={(e) => { e.stopPropagation(); setShowPotTx({ isOpen: true, type: 'DEPOSIT', potId: emergencyPot.id }); }}
                                >
                                    <ArrowUpRight size={16} /> Add Money
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
                    </div>
                 )}
            </div>

            {/* 3. Goals */}
            <div className="pb-20">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Active Goals</h3>
                <div className="grid grid-cols-1 gap-3">
                    {otherPots.map(pot => {
                         const progress = pot.target ? Math.min((pot.balance / pot.target) * 100, 100) : 0;
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
                                            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                                {pot.lastAddedDate && (
                                                    <span className="flex items-center gap-1"><Clock size={10} /> {format(parseISO(pot.lastAddedDate), 'MMM d')}</span>
                                                )}
                                                {pot.addedThisMonth > 0 && <span className="text-emerald-600 font-bold">+{state.settings.mainCurrency}{pot.addedThisMonth} in {format(today, 'MMM')}</span>}
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
                                </div>
                            </Card>
                         );
                    })}
                </div>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
            <TimeRangeSelector range={range} onChange={setRange} />
             {/* Simple list of expenses for this view for brevity */}
             <div className="space-y-3">
                 {state.expenses
                    .filter(e => isWithinInterval(parseISO(e.date), { start: parseISO(range.start), end: parseISO(range.end) }))
                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map(exp => (
                        <div key={exp.id} className="bg-white p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                            <div>
                                <div className="font-bold text-sm text-slate-900">{exp.merchant || exp.category}</div>
                                <div className="text-xs text-slate-400">{format(parseISO(exp.date), 'MMM d')} • {exp.category}</div>
                            </div>
                            <div className="font-bold text-sm text-slate-900">-{state.settings.mainCurrency}{exp.amount}</div>
                        </div>
                    ))
                 }
             </div>
        </div>
      )}

      {/* Modals */}
      <Modal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} title="Log Expense">
         <div className="space-y-6">
            <Input type="number" label="Amount" autoFocus placeholder="0.00" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} />
            <Input label="Merchant / Note" value={newExpense.merchant || ''} onChange={e => setNewExpense({...newExpense, merchant: e.target.value})} />
            <Select label="Category" options={EXPENSE_CATEGORIES.map(c => ({ label: c, value: c }))} value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} />
            <Button className="w-full" size="lg" onClick={handleSaveExpense}>Confirm Spend</Button>
         </div>
      </Modal>

      <Modal isOpen={showAddPot} onClose={() => setShowAddPot(false)} title={editingPot ? "Edit Pot" : "New Savings Goal"}>
         <div className="space-y-5">
            <Input label="Goal Name" value={newPot.name} onChange={e => setNewPot({...newPot, name: e.target.value})} autoFocus />
            <Select label="Type" options={[{label: 'Regular Savings', value: 'REGULAR'}, {label: 'Emergency Fund', value: 'EMERGENCY'}]} value={newPot.type} onChange={e => setNewPot({...newPot, type: e.target.value as any})} />
            <Input label="Target Amount" type="number" value={newPot.target || ''} onChange={e => setNewPot({...newPot, target: Number(e.target.value)})} />
            <Button className="w-full" size="lg" onClick={handleSavePot}>Save Goal</Button>
         </div>
      </Modal>
      
      <Modal isOpen={!!showPotTx} onClose={() => setShowPotTx(null)} title={showPotTx?.type === 'DEPOSIT' ? 'Add Money' : 'Withdraw'}>
          <div className="space-y-6">
             <Input type="number" label="Amount" autoFocus placeholder="0.00" value={txAmount || ''} onChange={e => setTxAmount(Number(e.target.value))} />
             <Button className="w-full" size="lg" onClick={handlePotTx}>Confirm</Button>
          </div>
      </Modal>
    </Container>
  );
};
