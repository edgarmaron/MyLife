import React, { useState } from 'react';
import { useStore, generateId } from '../store';
import { Card, Button, Container, StatRow, Modal, Input, Select } from '../components/UI';
import { Plus, Trash2 } from 'lucide-react';
import { Expense, Account } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';
import { format } from 'date-fns';

export const Expenses = () => {
  const { state, dispatch } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);

  // Derived
  const sortedExpenses = [...state.expenses].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    amount: 0, category: 'Food', date: format(new Date(), 'yyyy-MM-dd'), accountId: state.accounts[0]?.id
  });

  const [newAccount, setNewAccount] = useState<Partial<Account>>({
      name: '', type: 'CASH', currency: state.settings.mainCurrency, balance: 0
  });

  const handleSaveExpense = () => {
      if(!newExpense.amount || !newExpense.accountId) return;
      dispatch({
          type: 'ADD_EXPENSE',
          payload: {
              id: generateId(),
              amount: Number(newExpense.amount),
              category: newExpense.category || 'Other',
              date: newExpense.date || '',
              accountId: newExpense.accountId,
              currency: state.settings.mainCurrency,
              note: newExpense.note
          }
      });
      setShowAdd(false);
      setNewExpense({ amount: 0, category: 'Food', date: format(new Date(), 'yyyy-MM-dd'), accountId: state.accounts[0]?.id });
  };

  const handleSaveAccount = () => {
      if(!newAccount.name) return;
      dispatch({
          type: 'ADD_ACCOUNT',
          payload: {
              id: generateId(),
              name: newAccount.name,
              type: newAccount.type as any,
              currency: newAccount.currency || 'USD',
              balance: Number(newAccount.balance)
          }
      });
      setShowAddAccount(false);
  };

  return (
    <Container>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Expenses & Cash</h2>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus size={16} /> Add Expense</Button>
      </div>

      {/* Accounts Scroll */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-slate-700">Accounts</h3>
            <button onClick={() => setShowAddAccount(true)} className="text-blue-600 text-xs font-bold uppercase">New Account</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {state.accounts.map(acc => (
                <Card key={acc.id} className="min-w-[140px] flex-shrink-0 bg-blue-600 text-white border-none">
                    <div className="text-xs opacity-80 mb-1">{acc.type}</div>
                    <div className="font-bold truncate">{acc.name}</div>
                    <div className="text-lg font-bold mt-2">{acc.currency} {acc.balance.toLocaleString()}</div>
                </Card>
            ))}
        </div>
      </div>

      {/* Expenses List */}
      <h3 className="font-semibold text-slate-700 mb-3">Recent Transactions</h3>
      <div className="space-y-3">
        {sortedExpenses.length === 0 && <div className="text-center text-slate-400 py-10">No expenses yet.</div>}
        {sortedExpenses.map(exp => {
            const acc = state.accounts.find(a => a.id === exp.accountId);
            return (
                <Card key={exp.id} className="flex justify-between items-center py-3">
                    <div>
                        <div className="font-bold text-slate-800">{exp.category}</div>
                        <div className="text-xs text-slate-500">
                            {format(new Date(exp.date), 'MMM d')} • {acc?.name}
                            {exp.note && <span className="italic"> • {exp.note}</span>}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-bold text-slate-900">-{exp.amount}</div>
                        <button onClick={() => dispatch({type: 'DELETE_EXPENSE', payload: exp.id})} className="text-red-400 text-xs mt-1 hover:text-red-600 flex items-center justify-end gap-1">
                            <Trash2 size={10} /> Delete
                        </button>
                    </div>
                </Card>
            );
        })}
      </div>

      {/* Add Expense Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add Expense">
         <div className="space-y-4">
            <Input label="Amount" type="number" value={newExpense.amount || ''} onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})} autoFocus />
            <Input label="Date" type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
            <Select label="Category" options={EXPENSE_CATEGORIES.map(c => ({label: c, value: c}))} value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})} />
            <Select label="Account" options={state.accounts.map(a => ({label: a.name, value: a.id}))} value={newExpense.accountId} onChange={e => setNewExpense({...newExpense, accountId: e.target.value})} />
            <Input label="Note" value={newExpense.note || ''} onChange={e => setNewExpense({...newExpense, note: e.target.value})} />
            <Button className="w-full" onClick={handleSaveExpense}>Save</Button>
         </div>
      </Modal>

      {/* Add Account Modal */}
      <Modal isOpen={showAddAccount} onClose={() => setShowAddAccount(false)} title="New Account">
         <div className="space-y-4">
            <Input label="Account Name" value={newAccount.name} onChange={e => setNewAccount({...newAccount, name: e.target.value})} autoFocus />
            <Select label="Type" options={[{label: 'Cash', value: 'CASH'}, {label: 'Bank', value: 'BANK'}, {label: 'Card', value: 'CARD'}]} value={newAccount.type} onChange={e => setNewAccount({...newAccount, type: e.target.value as any})} />
            <Input label="Initial Balance" type="number" value={newAccount.balance || ''} onChange={e => setNewAccount({...newAccount, balance: Number(e.target.value)})} />
            <Button className="w-full" onClick={handleSaveAccount}>Create Account</Button>
         </div>
      </Modal>
    </Container>
  );
};
