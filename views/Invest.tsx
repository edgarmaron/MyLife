
import React, { useState, useMemo } from 'react';
import { useStore, generateId } from '../store';
import { Card, Button, Container, Modal, Input } from '../components/UI';
import { Plus, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { InvestmentAction } from '../types';
import { parseISO, format, startOfMonth, startOfYear, isAfter } from 'date-fns';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export const Invest = () => {
  const { state, dispatch } = useStore();
  const [activeTab, setActiveTab] = useState<'STOCK' | 'CRYPTO'>('STOCK');
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [newHolding, setNewHolding] = useState({ symbol: '', currency: state.settings.investmentCurrency, initialValue: 0 });
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; holdingId: string; type: 'DEPOSIT'|'WITHDRAW' } | null>(null);
  const [actionAmount, setActionAmount] = useState<number | ''>('');

  const currency = state.settings.investmentCurrency;
  const holdings = state.holdings.filter(h => activeTab === 'CRYPTO' ? h.type === 'CRYPTO' : h.type !== 'CRYPTO');

  // --- Asset Metrics ---
  const assetMetrics = useMemo(() => {
      const today = new Date();
      return holdings.map(h => {
          const txs = state.investmentTransactions.filter(t => t.holdingId === h.id);
          const currentVal = h.currentPrice;
          
          // Helper: Value at Date X
          // Simplification: We assume value changes linearly between updates. 
          // For "Month Start", we find the snapshot closest to start of month.
          const getValAt = (d: Date) => {
             // Find last price update before date d
             const priorUpdates = txs
                .filter(t => t.type === InvestmentAction.UPDATE_PRICE && !isAfter(parseISO(t.date), d))
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
             return priorUpdates.length > 0 ? (priorUpdates[0].pricePerUnit || 0) : 0;
          };

          const startMonthVal = getValAt(startOfMonth(today));
          const startYearVal = getValAt(startOfYear(today));

          const monthChange = startMonthVal > 0 ? currentVal - startMonthVal : 0;
          const yearChange = startYearVal > 0 ? currentVal - startYearVal : 0;
          
          return { ...h, currentVal, monthChange, yearChange };
      });
  }, [holdings, state.investmentTransactions]);

  const handleAddHolding = () => {
    if (!newHolding.symbol) return;
    const id = generateId();
    dispatch({ type: 'ADD_HOLDING', payload: {
            id,
            symbol: newHolding.symbol.toUpperCase(),
            name: newHolding.symbol.toUpperCase(),
            type: activeTab === 'CRYPTO' ? 'CRYPTO' : 'STOCK',
            currency: newHolding.currency,
            currentPrice: newHolding.initialValue || 0,
            lastPriceUpdate: new Date().toISOString()
    }});
    if (newHolding.initialValue > 0) {
        dispatch({ type: 'ADD_INVESTMENT_TX', payload: { id: generateId(), holdingId: id, date: format(new Date(), 'yyyy-MM-dd'), type: InvestmentAction.UPDATE_PRICE as any, pricePerUnit: newHolding.initialValue, totalAmount: newHolding.initialValue, quantity: 1 }});
    }
    setShowAddHolding(false);
  };
  
  const handleUpdateValue = () => {
      if(!actionModal || !actionAmount) return;
      // For simplicity, treating Deposit as "Update Value" in this prompt context to match typical manual tracking
      // But strictly, let's just use Update Price logic for value updates
      dispatch({ type: 'UPDATE_HOLDING_PRICE', payload: { id: actionModal.holdingId, price: Number(actionAmount) }});
      dispatch({ type: 'ADD_INVESTMENT_TX', payload: { id: generateId(), holdingId: actionModal.holdingId, date: format(new Date(), 'yyyy-MM-dd'), type: InvestmentAction.UPDATE_PRICE as any, pricePerUnit: Number(actionAmount), totalAmount: Number(actionAmount) }});
      setActionModal(null);
      setActionAmount('');
  };

  return (
    <Container>
       <div className="flex justify-between items-end mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Portfolio</h2>
        <Button size="sm" onClick={() => setShowAddHolding(true)}><Plus size={16} /> Add Asset</Button>
      </div>

      <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200">
        <button className={`flex-1 py-2 text-sm font-bold rounded-xl ${activeTab === 'STOCK' ? 'bg-white shadow' : 'text-slate-500'}`} onClick={() => setActiveTab('STOCK')}>Stocks</button>
        <button className={`flex-1 py-2 text-sm font-bold rounded-xl ${activeTab === 'CRYPTO' ? 'bg-white shadow' : 'text-slate-500'}`} onClick={() => setActiveTab('CRYPTO')}>Crypto</button>
      </div>

      <div className="space-y-4">
          {assetMetrics.map(asset => (
              <Card key={asset.id} className="relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${asset.type === 'CRYPTO' ? 'bg-orange-500' : 'bg-blue-600'}`}>
                              {asset.symbol.substring(0, 1)}
                          </div>
                          <div>
                              <div className="font-bold text-lg">{asset.symbol}</div>
                              <div className="text-xs text-slate-400 font-bold uppercase">Current Value</div>
                          </div>
                      </div>
                      <div className="text-right">
                          <div className="font-black text-xl">{currency} {asset.currentVal.toLocaleString()}</div>
                          <Button 
                            variant="ghost" size="sm" className="h-6 px-2 mt-1 text-xs bg-slate-100"
                            onClick={() => setActionModal({ isOpen: true, holdingId: asset.id, type: 'DEPOSIT' })}
                          >
                              <RefreshCw size={10} className="mr-1" /> Update
                          </Button>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">This Month</div>
                          <div className={`text-sm font-bold flex items-center gap-1 ${asset.monthChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {asset.monthChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {currency}{Math.abs(asset.monthChange).toLocaleString()}
                          </div>
                      </div>
                      <div>
                           <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">This Year</div>
                           <div className={`text-sm font-bold flex items-center gap-1 ${asset.yearChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {asset.yearChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                              {currency}{Math.abs(asset.yearChange).toLocaleString()}
                          </div>
                      </div>
                  </div>
              </Card>
          ))}
          {assetMetrics.length === 0 && (
              <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                  <div>Add your first investment to track performance.</div>
              </div>
          )}
      </div>

      <Modal isOpen={showAddHolding} onClose={() => setShowAddHolding(false)} title="Add Asset">
         <div className="space-y-4">
            <Input label="Symbol" value={newHolding.symbol} onChange={e => setNewHolding({...newHolding, symbol: e.target.value})} autoFocus />
            <Input label="Initial Value" type="number" value={newHolding.initialValue || ''} onChange={e => setNewHolding({...newHolding, initialValue: Number(e.target.value)})} />
            <Button className="w-full" onClick={handleAddHolding}>Add</Button>
         </div>
      </Modal>

      <Modal isOpen={!!actionModal} onClose={() => setActionModal(null)} title="Update Value">
         <div className="space-y-4">
            <Input label="New Total Value" type="number" value={actionAmount || ''} onChange={e => setActionAmount(Number(e.target.value))} autoFocus />
            <Button className="w-full" onClick={handleUpdateValue}>Save</Button>
         </div>
      </Modal>
    </Container>
  );
};
