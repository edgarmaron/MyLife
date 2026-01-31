import React, { useState } from 'react';
import { useStore, generateId } from '../store';
import { Card, Button, Container, StatRow, Modal, Input, Select } from '../components/UI';
import { Plus } from 'lucide-react';
import { SavingsAccount, SavingsTransaction } from '../types';

export const Savings = () => {
  const { state, dispatch } = useStore();
  const [showAddPot, setShowAddPot] = useState(false);
  const [txModal, setTxModal] = useState<{ isOpen: boolean; type: 'DEPOSIT'|'WITHDRAW'; potId: string } | null>(null);
  
  const [newPot, setNewPot] = useState<Partial<SavingsAccount>>({ name: '', type: 'REGULAR', balance: 0, target: 0 });
  const [amount, setAmount] = useState<number>(0);

  const handleAddPot = () => {
    if(!newPot.name) return;
    dispatch({
      type: 'ADD_SAVINGS_ACCOUNT',
      payload: {
        id: generateId(),
        name: newPot.name,
        type: newPot.type as any,
        balance: Number(newPot.balance),
        target: Number(newPot.target),
        currency: state.settings.mainCurrency
      }
    });
    setShowAddPot(false);
  };

  const handleTx = () => {
    if(!txModal || !amount) return;
    dispatch({
      type: 'ADD_SAVINGS_TX',
      payload: {
        id: generateId(),
        savingsAccountId: txModal.potId,
        date: new Date().toISOString(),
        type: txModal.type,
        amount: Number(amount),
        note: 'Manual entry'
      }
    });
    setTxModal(null);
    setAmount(0);
  };

  return (
    <Container>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Savings</h2>
        <Button size="sm" onClick={() => setShowAddPot(true)}><Plus size={16} /> New Pot</Button>
      </div>

      <div className="space-y-4">
        {state.savings.map(pot => (
          <Card key={pot.id} className="relative overflow-hidden">
             {pot.type === 'EMERGENCY' && <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">EMERGENCY</div>}
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="font-bold text-lg">{pot.name}</h3>
                   <p className="text-2xl font-bold mt-1">{pot.currency} {pot.balance.toLocaleString()}</p>
                   {pot.target ? <p className="text-xs text-slate-500">Target: {pot.target.toLocaleString()}</p> : null}
                </div>
             </div>
             
             {/* Progress Bar */}
             {pot.target ? (
               <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Progress</span>
                    <span>{Math.min(Math.round((pot.balance / pot.target) * 100), 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${Math.min((pot.balance / pot.target) * 100, 100)}%` }}></div>
                  </div>
               </div>
             ) : null}

             <div className="flex gap-2 border-t pt-3">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setTxModal({ isOpen: true, type: 'DEPOSIT', potId: pot.id })}>Deposit</Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setTxModal({ isOpen: true, type: 'WITHDRAW', potId: pot.id })}>Withdraw</Button>
             </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showAddPot} onClose={() => setShowAddPot(false)} title="Create Savings Pot">
         <div className="space-y-4">
            <Input label="Name" value={newPot.name} onChange={e => setNewPot({...newPot, name: e.target.value})} autoFocus />
            <Select label="Type" options={[{label: 'Regular', value: 'REGULAR'}, {label: 'Emergency Fund', value: 'EMERGENCY'}]} value={newPot.type} onChange={e => setNewPot({...newPot, type: e.target.value as any})} />
            <Input label="Initial Balance" type="number" value={newPot.balance || ''} onChange={e => setNewPot({...newPot, balance: Number(e.target.value)})} />
            <Input label="Target Amount (Optional)" type="number" value={newPot.target || ''} onChange={e => setNewPot({...newPot, target: Number(e.target.value)})} />
            <Button className="w-full" onClick={handleAddPot}>Create</Button>
         </div>
      </Modal>

      <Modal isOpen={!!txModal} onClose={() => setTxModal(null)} title={txModal?.type === 'DEPOSIT' ? 'Deposit to Savings' : 'Withdraw from Savings'}>
         <div className="space-y-4">
            <Input label="Amount" type="number" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} autoFocus />
            <Button className="w-full" onClick={handleTx}>Confirm</Button>
         </div>
      </Modal>
    </Container>
  );
};
