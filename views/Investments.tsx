import React, { useState } from 'react';
import { useStore, generateId } from '../store';
import { Card, Button, Container, StatRow, Modal, Input, Select } from '../components/UI';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { Holding, InvestmentAction } from '../types';
import { format } from 'date-fns';

export const Investments = ({ type }: { type: 'STOCK' | 'CRYPTO' }) => {
  const { state, dispatch } = useStore();
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [actionModal, setActionModal] = useState<{ isOpen: boolean; holdingId: string; type: 'BUY'|'SELL' } | null>(null);
  
  const isCrypto = type === 'CRYPTO';
  const holdings = state.holdings.filter(h => isCrypto ? h.type === 'CRYPTO' : h.type !== 'CRYPTO');
  const currency = state.settings.investmentCurrency;

  // Form States
  const [newHolding, setNewHolding] = useState<Partial<Holding>>({ symbol: '', name: '', type: isCrypto ? 'CRYPTO' : 'STOCK', currentPrice: 0 });
  const [txForm, setTxForm] = useState({ quantity: 0, price: 0 });

  // Helpers
  const getHoldingStats = (id: string) => {
     const txs = state.investmentTransactions.filter(t => t.holdingId === id);
     let shares = 0;
     let costBasis = 0;

     txs.forEach(t => {
         if (t.type === 'BUY') {
             shares += (t.quantity || 0);
             costBasis += (t.quantity || 0) * (t.pricePerUnit || 0) + (t.fees || 0);
         } else if (t.type === 'SELL') {
             shares -= (t.quantity || 0);
             const avgCost = costBasis / (shares + (t.quantity || 0));
             costBasis -= (t.quantity || 0) * avgCost;
         }
     });
     return { shares, costBasis };
  };

  const handleAddHolding = () => {
    if (!newHolding.symbol) return;
    dispatch({
        type: 'ADD_HOLDING',
        payload: {
            id: generateId(),
            symbol: newHolding.symbol.toUpperCase(),
            name: newHolding.name || newHolding.symbol,
            type: newHolding.type as any,
            currency: currency,
            currentPrice: Number(newHolding.currentPrice),
            lastPriceUpdate: new Date().toISOString()
        }
    });
    setShowAddHolding(false);
    setNewHolding({ symbol: '', name: '', type: isCrypto ? 'CRYPTO' : 'STOCK', currentPrice: 0 });
  };

  const handleTx = () => {
    if(!actionModal) return;
    dispatch({
        type: 'ADD_INVESTMENT_TX',
        payload: {
            id: generateId(),
            holdingId: actionModal.holdingId,
            date: new Date().toISOString(),
            type: actionModal.type === 'BUY' ? InvestmentAction.BUY : InvestmentAction.SELL,
            quantity: Number(txForm.quantity),
            pricePerUnit: Number(txForm.price),
            note: 'Manual trade'
        }
    });
    setActionModal(null);
    setTxForm({ quantity: 0, price: 0 });
  };

  return (
    <Container>
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{isCrypto ? 'Crypto Assets' : 'Stock Portfolio'}</h2>
        <Button size="sm" onClick={() => setShowAddHolding(true)}><Plus size={16} /> Add Asset</Button>
      </div>

      <div className="space-y-4">
        {holdings.length === 0 && <div className="text-slate-400 text-center py-10">No assets tracked yet.</div>}
        {holdings.map(h => {
            const stats = getHoldingStats(h.id);
            const value = stats.shares * h.currentPrice;
            const pl = value - stats.costBasis;
            const plPercent = stats.costBasis > 0 ? (pl / stats.costBasis) * 100 : 0;

            return (
                <Card key={h.id}>
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isCrypto ? 'bg-orange-500' : 'bg-blue-600'}`}>
                                {h.symbol.substring(0, 1)}
                            </div>
                            <div>
                                <div className="font-bold text-lg">{h.symbol}</div>
                                <div className="text-xs text-slate-500">{h.name}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-lg">{currency} {value.toLocaleString()}</div>
                            <div className={`text-xs font-bold ${pl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {pl >= 0 ? '+' : ''}{pl.toFixed(2)} ({plPercent.toFixed(1)}%)
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-4 bg-slate-50 p-2 rounded">
                        <div>
                            <span className="block text-xs text-slate-400">Holdings</span>
                            <span className="font-medium">{stats.shares} {isCrypto ? 'Coins' : 'Shares'}</span>
                        </div>
                        <div className="text-right">
                             <span className="block text-xs text-slate-400">Current Price</span>
                             <span className="font-medium">{h.currentPrice}</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => setActionModal({ isOpen: true, holdingId: h.id, type: 'BUY' })}>Buy</Button>
                        <Button size="sm" className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => setActionModal({ isOpen: true, holdingId: h.id, type: 'SELL' })}>Sell</Button>
                        <Button size="sm" variant="outline" onClick={() => {
                            const newPrice = prompt("Enter new current price:", h.currentPrice.toString());
                            if(newPrice) dispatch({ type: 'UPDATE_HOLDING_PRICE', payload: { id: h.id, price: Number(newPrice) } });
                        }}>Price</Button>
                    </div>
                </Card>
            )
        })}
      </div>

      {/* Add Holding Modal */}
      <Modal isOpen={showAddHolding} onClose={() => setShowAddHolding(false)} title={isCrypto ? "Add Crypto" : "Add Stock"}>
         <div className="space-y-4">
            <Input label="Symbol (e.g. AAPL, BTC)" value={newHolding.symbol} onChange={e => setNewHolding({...newHolding, symbol: e.target.value})} autoFocus />
            <Input label="Name" value={newHolding.name} onChange={e => setNewHolding({...newHolding, name: e.target.value})} />
            <Input label="Current Market Price" type="number" value={newHolding.currentPrice || ''} onChange={e => setNewHolding({...newHolding, currentPrice: Number(e.target.value)})} />
            <Button className="w-full" onClick={handleAddHolding}>Add Asset</Button>
         </div>
      </Modal>

      {/* Transaction Modal */}
      <Modal isOpen={!!actionModal} onClose={() => setActionModal(null)} title={`${actionModal?.type} Asset`}>
          <div className="space-y-4">
            <Input label="Quantity" type="number" value={txForm.quantity || ''} onChange={e => setTxForm({...txForm, quantity: Number(e.target.value)})} autoFocus />
            <Input label="Price per unit" type="number" value={txForm.price || ''} onChange={e => setTxForm({...txForm, price: Number(e.target.value)})} />
            <Button className="w-full" onClick={handleTx}>Confirm Trade</Button>
          </div>
      </Modal>
    </Container>
  );
};
