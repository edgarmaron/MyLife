import React, { useState, useMemo } from 'react';
import { useStore, generateId } from '../store';
import { Card, Button, Container, Modal, Input, Badge, Select } from '../components/UI';
import { 
    Plus, TrendingUp, TrendingDown, Briefcase, Calendar, 
    ArrowUpRight, ArrowDownRight, ArrowRight, History, Edit2, AlertCircle,
    DollarSign, RefreshCw, ChevronRight, Activity
} from 'lucide-react';
import { Holding, InvestmentAction, DateRange, InvestmentTransaction } from '../types';
import { isWithinInterval, parseISO, format, startOfMonth, endOfMonth, subMonths, isSameMonth, eachMonthOfInterval, addMonths } from 'date-fns';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// Helper types for our internal logic
interface MonthlySnapshot {
    month: string; // YYYY-MM
    startingValue: number;
    moneyAdded: number;
    moneyRemoved: number;
    endingValue: number;
    hasUpdate: boolean; // True if endingValue was manually set for this month
    profitLoss: number;
}

interface AssetCardProps {
    asset: any;
    currency: string;
    onAddMoney: () => void;
    onUpdateValue: () => void;
}

// Sub-component for individual Asset Card with Graph
const AssetCard: React.FC<AssetCardProps> = ({ 
    asset, 
    currency, 
    onAddMoney, 
    onUpdateValue 
}) => {
    const [hoverData, setHoverData] = useState<any>(null);

    // Prepare Chart Data (Chronological: Oldest -> Newest)
    const chartData = useMemo(() => {
        // Snapshots come in Newest->Oldest from logic, so reverse them
        const chronological = [...asset.snapshots].reverse();
        
        // Calculate cumulative "Net Invested" over time
        let runningInvested = 0;
        
        return chronological.map(s => {
            const flow = s.moneyAdded - s.moneyRemoved;
            runningInvested += flow;
            
            return {
                date: s.month,
                timestamp: new Date(s.month).getTime(),
                displayDate: format(parseISO(s.month + '-01'), 'MMM yyyy'),
                value: s.endingValue,
                netInvested: runningInvested,
                pl: s.endingValue - runningInvested
            };
        });
    }, [asset.snapshots]);

    // Determine what to show: Hover data OR Current Live data
    const displayData = hoverData || {
        value: asset.currentValue,
        netInvested: asset.netInvested,
        pl: asset.lifetimePL,
        displayDate: 'Current Value'
    };
    
    // Color logic for the graph line (Green if profitable, Red if loss)
    const isProfitable = asset.lifetimePL >= 0;
    const color = isProfitable ? '#10b981' : '#f43f5e'; // Emerald-500 or Rose-500

    return (
        <Card className="group overflow-hidden relative">
            {/* Header Content */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white shadow-md transition-transform duration-300 ${hoverData ? 'scale-90 opacity-80' : ''} ${asset.isCrypto ? 'bg-gradient-to-br from-orange-500 to-amber-500' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                        {asset.symbol.substring(0, 1)}
                    </div>
                    <div>
                        <div className="font-bold text-lg text-slate-900 leading-tight">{asset.name}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider transition-colors duration-200" style={{ color: hoverData ? '#64748b' : '' }}>
                            {displayData.displayDate}
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-black text-xl text-slate-900 tracking-tight transition-all duration-200">
                        {currency} {displayData.value.toLocaleString()}
                    </div>
                    <div className={`text-xs font-bold inline-flex items-center gap-1 transition-colors duration-200 ${displayData.pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {displayData.pl >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {displayData.pl >= 0 ? '+' : ''}{Math.abs(displayData.pl).toLocaleString()} 
                        <span className="opacity-60 font-medium ml-0.5 text-[10px] uppercase text-slate-400/80">
                            {hoverData ? 'At date' : 'Total'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Interactive Graph Area */}
            {chartData.length > 1 ? (
                <div className="h-32 -mx-6 mb-4 relative cursor-crosshair">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart 
                            data={chartData} 
                            onMouseMove={(e) => {
                                if (e.activePayload && e.activePayload[0]) {
                                    setHoverData(e.activePayload[0].payload);
                                }
                            }}
                            onMouseLeave={() => setHoverData(null)}
                            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id={`gradient-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <Tooltip cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} content={<></>} />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke={color} 
                                strokeWidth={2} 
                                fill={`url(#gradient-${asset.id})`} 
                                isAnimationActive={false}
                            />
                        </AreaChart>
                     </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-24 -mx-6 mb-4 flex items-center justify-center bg-slate-50/50">
                    <span className="text-xs text-slate-400 font-medium">Add more history to see trends</span>
                </div>
            )}

            {/* Stats Grid - Updates on Hover */}
            <div className="grid grid-cols-2 gap-4 mb-5 bg-slate-50/80 p-3 rounded-xl border border-slate-100/80 backdrop-blur-sm transition-colors duration-200">
                <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase transition-colors">Net Invested</div>
                    <div className="font-bold text-slate-700 transition-all duration-200">{currency} {displayData.netInvested.toLocaleString()}</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase transition-colors">
                        {hoverData ? 'Profit Margin' : 'Total Return'}
                    </div>
                    <div className={`font-bold transition-all duration-200 ${displayData.pl >= 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                         {displayData.netInvested > 0 ? ((displayData.pl / displayData.netInvested) * 100).toFixed(1) : '0.0'}%
                    </div>
                </div>
            </div>

            {/* Actions (Hidden when hovering graph for clearer view) */}
            <div className={`flex gap-2 transition-opacity duration-200 ${hoverData ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <Button 
                size="sm" 
                className="flex-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-none font-bold"
                onClick={onAddMoney}
                >
                    <Plus size={14} /> Add Money
                </Button>
                <Button 
                size="sm" 
                variant="outline"
                className="flex-1 font-bold"
                onClick={onUpdateValue}
                >
                    <RefreshCw size={14} /> Update Value
                </Button>
            </div>
        </Card>
    );
};

export const Invest = ({ range }: { range: DateRange }) => {
  const { state, dispatch } = useStore();
  const [activeTab, setActiveTab] = useState<'STOCK' | 'CRYPTO'>('STOCK');
  
  // Modals
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [contributionModal, setContributionModal] = useState<{ isOpen: boolean; holdingId: string } | null>(null);
  const [valueModal, setValueModal] = useState<{ isOpen: boolean; holdingId: string; currentVal: number } | null>(null);
  
  // Forms
  const [newHolding, setNewHolding] = useState<{ symbol: string; name: string; currency: string; initialValue: number }>({ 
      symbol: '', 
      name: '', 
      currency: state.settings.investmentCurrency,
      initialValue: 0 
  });
  
  // Simple Action Forms
  const [actionAmount, setActionAmount] = useState<number | ''>('');
  const [actionDate, setActionDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isWithdrawal, setIsWithdrawal] = useState(false);

  const isCrypto = activeTab === 'CRYPTO';
  const currency = state.settings.investmentCurrency;
  const holdings = state.holdings.filter(h => isCrypto ? h.type === 'CRYPTO' : h.type !== 'CRYPTO');

  // --- CORE LOGIC: Monthly Snapshots ---

  const getMonthlySnapshots = (holdingId: string): MonthlySnapshot[] => {
      const txs = state.investmentTransactions.filter(t => t.holdingId === holdingId);
      
      const maxDate = new Date(); 
      let minDate = startOfMonth(maxDate); 

      if (txs.length > 0) {
          const dates = txs.map(t => new Date(t.date));
          minDate = new Date(Math.min(...dates.map(d => d.getTime())));
      }
      
      // Ensure we go back at least a few months for visual context if new
      if (txs.length === 0) {
          minDate = subMonths(maxDate, 5); 
      }
      
      const months = eachMonthOfInterval({ start: startOfMonth(minDate), end: endOfMonth(maxDate) });
      
      let snapshots: MonthlySnapshot[] = [];
      let previousEndingValue = 0;

      months.forEach(monthDate => {
          const monthKey = format(monthDate, 'yyyy-MM');
          const monthTxs = txs.filter(t => isSameMonth(parseISO(t.date), monthDate));
          
          let added = 0;
          let removed = 0;
          let endingVal = 0;
          let hasUpdate = false;

          monthTxs.forEach(t => {
              const amount = t.totalAmount ?? ((t.quantity || 0) * (t.pricePerUnit || 0));
              if (t.type === InvestmentAction.DEPOSIT || t.type === InvestmentAction.BUY) added += amount;
              else if (t.type === InvestmentAction.WITHDRAW || t.type === InvestmentAction.SELL) removed += amount;
              else if (t.type === InvestmentAction.UPDATE_PRICE) {
                  endingVal = t.pricePerUnit || 0; 
                  hasUpdate = true;
              }
          });

          // Sort txs to find the LAST snapshot if multiple exist
          const snapshotsInMonth = monthTxs.filter(t => t.type === InvestmentAction.UPDATE_PRICE).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          if (snapshotsInMonth.length > 0) {
              endingVal = snapshotsInMonth[snapshotsInMonth.length - 1].pricePerUnit || 0;
              hasUpdate = true;
          } else {
              endingVal = previousEndingValue + (added - removed);
          }

          const pl = endingVal - previousEndingValue - (added - removed);

          snapshots.push({
              month: monthKey,
              startingValue: previousEndingValue,
              moneyAdded: added,
              moneyRemoved: removed,
              endingValue: endingVal,
              hasUpdate,
              profitLoss: pl
          });

          previousEndingValue = endingVal;
      });

      return snapshots.reverse(); // Newest first
  };

  // --- Derived Metrics ---

  const assetMetrics = useMemo(() => {
      return holdings.map(h => {
          const snapshots = getMonthlySnapshots(h.id);
          const latest = snapshots[0]; 
          
          const totalAdded = snapshots.reduce((sum, s) => sum + s.moneyAdded, 0);
          const totalRemoved = snapshots.reduce((sum, s) => sum + s.moneyRemoved, 0);
          const netInvested = totalAdded - totalRemoved;
          
          const currentValue = h.currentPrice || latest?.endingValue || 0;
          const lifetimePL = currentValue - netInvested;
          
          // Period stats just for the summary card - respects global range if needed,
          // but charts handle full history.
          const inRangeSnapshots = snapshots.filter(s => isWithinInterval(parseISO(`${s.month}-01`), { start: parseISO(range.start), end: parseISO(range.end) }));
          const periodPL = inRangeSnapshots.reduce((sum, s) => sum + s.profitLoss, 0);
          
          return {
              ...h,
              snapshots,
              latest,
              currentValue,
              netInvested,
              lifetimePL,
              periodPL,
              isCrypto
          };
      });
  }, [holdings, state.investmentTransactions, range, isCrypto]);

  const portfolioStats = useMemo(() => {
      const totalValue = assetMetrics.reduce((sum, a) => sum + a.currentValue, 0);
      const totalNetInvested = assetMetrics.reduce((sum, a) => sum + a.netInvested, 0);
      const totalLifetimePL = totalValue - totalNetInvested;
      const periodPL = assetMetrics.reduce((sum, a) => sum + a.periodPL, 0);
      
      let periodAdded = 0;
      assetMetrics.forEach(a => {
          const inRange = a.snapshots.filter(s => isWithinInterval(parseISO(`${s.month}-01`), { start: parseISO(range.start), end: parseISO(range.end) }));
          periodAdded += inRange.reduce((sum, s) => sum + s.moneyAdded, 0);
      });

      return { totalValue, totalNetInvested, totalLifetimePL, periodPL, periodAdded };
  }, [assetMetrics, range]);


  // --- Actions ---

  const handleAddHolding = () => {
    if (!newHolding.symbol) return;
    const id = generateId();
    const cleanSymbol = newHolding.symbol.toUpperCase();
    dispatch({
        type: 'ADD_HOLDING',
        payload: {
            id,
            symbol: cleanSymbol,
            name: cleanSymbol, // Default name to symbol since we removed the input
            type: activeTab === 'CRYPTO' ? 'CRYPTO' : 'STOCK',
            currency: newHolding.currency,
            currentPrice: newHolding.initialValue || 0,
            lastPriceUpdate: new Date().toISOString()
        }
    });

    if (newHolding.initialValue > 0) {
        const date = format(new Date(), 'yyyy-MM-dd');
        dispatch({ type: 'ADD_INVESTMENT_TX', payload: { id: generateId(), holdingId: id, date, type: InvestmentAction.DEPOSIT, totalAmount: newHolding.initialValue, quantity: 0, pricePerUnit: 0, note: 'Initial Investment' }});
        dispatch({ type: 'ADD_INVESTMENT_TX', payload: { id: generateId(), holdingId: id, date, type: InvestmentAction.UPDATE_PRICE as any, pricePerUnit: newHolding.initialValue, totalAmount: newHolding.initialValue, quantity: 1, note: 'Initial Snapshot' }});
    }

    setShowAddHolding(false);
    setNewHolding({ symbol: '', name: '', currency: state.settings.investmentCurrency, initialValue: 0 });
  };

  const handleSaveContribution = () => {
      if(!contributionModal || !actionAmount) return;
      
      const amount = Number(actionAmount);
      const holdingId = contributionModal.holdingId;
      
      dispatch({ type: 'ADD_INVESTMENT_TX', payload: { id: generateId(), holdingId, date: actionDate, type: isWithdrawal ? InvestmentAction.WITHDRAW : InvestmentAction.DEPOSIT, totalAmount: amount, quantity: 0, pricePerUnit: 0, note: isWithdrawal ? 'Withdrawal' : 'Contribution' }});

      const currentAsset = assetMetrics.find(h => h.id === holdingId);
      if (currentAsset) {
          const newVal = isWithdrawal ? currentAsset.currentValue - amount : currentAsset.currentValue + amount;
          dispatch({ type: 'UPDATE_HOLDING_PRICE', payload: { id: holdingId, price: newVal } });
      }
      closeModals();
  };

  const handleSaveValueUpdate = () => {
      if(!valueModal || actionAmount === '') return;
      const newVal = Number(actionAmount);
      dispatch({ type: 'ADD_INVESTMENT_TX', payload: { id: generateId(), holdingId: valueModal.holdingId, date: actionDate, type: InvestmentAction.UPDATE_PRICE as any, pricePerUnit: newVal, totalAmount: newVal, quantity: 1, note: 'Manual Value Update' }});
      dispatch({ type: 'UPDATE_HOLDING_PRICE', payload: { id: valueModal.holdingId, price: newVal } });
      closeModals();
  };

  const closeModals = () => {
      setContributionModal(null);
      setValueModal(null);
      setActionAmount('');
      setActionDate(format(new Date(), 'yyyy-MM-dd'));
      setIsWithdrawal(false);
  };

  const openContribution = (id: string) => {
      setContributionModal({ isOpen: true, holdingId: id });
      setActionDate(format(new Date(), 'yyyy-MM-dd'));
      setActionAmount('');
      setIsWithdrawal(false);
  };

  const openValueUpdate = (id: string, currentVal: number) => {
      setValueModal({ isOpen: true, holdingId: id, currentVal });
      setActionDate(format(new Date(), 'yyyy-MM-dd'));
      setActionAmount('');
  };

  return (
    <Container className="space-y-8">
      
      {/* 1. Header */}
      <div className="flex justify-between items-end">
        <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Portfolio</h2>
            {/* Range label removed intentionally as graph replaces filters */}
        </div>
        <Button size="sm" variant="secondary" onClick={() => setShowAddHolding(true)}><Plus size={16} /> Add Asset</Button>
      </div>

       {/* Tabs */}
       <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button 
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === 'STOCK' ? 'bg-white text-slate-900 shadow-md shadow-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('STOCK')}
        >
            Stocks & ETFs
        </button>
        <button 
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${activeTab === 'CRYPTO' ? 'bg-white text-slate-900 shadow-md shadow-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab('CRYPTO')}
        >
            Crypto
        </button>
      </div>

      {assetMetrics.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                <div className="bg-slate-50 p-4 rounded-full mb-4">
                    <Briefcase className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-1">No Assets</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-xs text-center">Track your monthly progress simply.</p>
                <Button size="lg" onClick={() => setShowAddHolding(true)}>Add First Asset</Button>
          </div>
      ) : (
      <>
        {/* 2. Portfolio Summary */}
        <Card className="bg-slate-900 text-white border-none shadow-xl shadow-slate-900/20">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Total Portfolio Value</div>
                    <div className="text-4xl font-black tracking-tight flex items-baseline gap-2">
                        <span>{currency} {portfolioStats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                </div>
                <div className="text-right">
                     <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Lifetime P&L</div>
                     <div className={`text-xl font-bold flex items-center justify-end gap-1 ${portfolioStats.totalLifetimePL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {portfolioStats.totalLifetimePL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        {portfolioStats.totalLifetimePL >= 0 ? '+' : ''}{currency} {Math.abs(portfolioStats.totalLifetimePL).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                     </div>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-px bg-white/10 rounded-xl overflow-hidden border border-white/10">
                <div className="bg-slate-900/50 p-3 backdrop-blur-sm">
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1 flex items-center gap-1"><ArrowDownRight size={12} /> Net Invested</div>
                    <div className="font-bold text-emerald-400">{currency} {portfolioStats.totalNetInvested.toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/50 p-3 backdrop-blur-sm">
                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Active Assets</div>
                    <div className="font-bold text-white">
                        {assetMetrics.length}
                    </div>
                </div>
            </div>
        </Card>

        {/* 3. Asset Cards (Interactive Timeline) */}
        <div className="space-y-4">
             {assetMetrics.map(h => (
                 <AssetCard 
                    key={h.id} 
                    asset={h} 
                    currency={currency} 
                    onAddMoney={() => openContribution(h.id)}
                    onUpdateValue={() => openValueUpdate(h.id, h.currentValue)}
                 />
             ))}
        </div>
      </>
      )}

      {/* Add Holding Modal */}
      <Modal isOpen={showAddHolding} onClose={() => setShowAddHolding(false)} title={isCrypto ? "Add Crypto Asset" : "Add Stock or ETF"}>
         <div className="space-y-6">
            <Input 
                label={isCrypto ? "Coin Symbol" : "Ticker Symbol"} 
                placeholder={isCrypto ? "e.g. BTC" : "e.g. SPY"} 
                value={newHolding.symbol} 
                onChange={e => setNewHolding({...newHolding, symbol: e.target.value})} 
                autoFocus 
            />
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <Input 
                    label={`Initial Value (${currency})`}
                    type="number" 
                    placeholder="0.00"
                    className="bg-white font-bold"
                    value={newHolding.initialValue || ''} 
                    onChange={e => setNewHolding({...newHolding, initialValue: Number(e.target.value)})} 
                />
                <p className="text-xs text-slate-500 mt-2">
                    Start with a value? This will be set as your money added and current value for this month.
                </p>
            </div>

            <Button className="w-full" size="lg" onClick={handleAddHolding}>Create Asset</Button>
         </div>
      </Modal>

      {/* Add Contribution Modal */}
      <Modal isOpen={!!contributionModal} onClose={closeModals} title={isWithdrawal ? "Withdraw Money" : "Add Contribution"}>
          <div className="space-y-6">
            
            <Input 
                label={`Amount ${isWithdrawal ? 'Removed' : 'Added'} (${currency})`}
                type="number" 
                autoFocus
                placeholder="0.00"
                className={`text-3xl font-bold p-4 text-center ${isWithdrawal ? 'text-rose-600' : 'text-emerald-600'}`}
                value={actionAmount} 
                onChange={e => setActionAmount(Number(e.target.value))} 
            />
            
            <Input 
                type="date"
                label="Date"
                value={actionDate}
                onChange={e => setActionDate(e.target.value)}
            />

            <div className="flex justify-center">
                <button 
                    onClick={() => setIsWithdrawal(!isWithdrawal)}
                    className="text-xs font-bold text-slate-400 uppercase hover:text-slate-600 transition-colors"
                >
                    {isWithdrawal ? "Switch to Deposit" : "Switch to Withdrawal"}
                </button>
            </div>

            <Button className={`w-full ${isWithdrawal ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'}`} size="lg" onClick={handleSaveContribution}>
                {isWithdrawal ? "Confirm Withdrawal" : "Confirm Deposit"}
            </Button>
          </div>
      </Modal>

      {/* Update Value Modal */}
      <Modal isOpen={!!valueModal} onClose={closeModals} title="Update Current Value">
          <div className="space-y-6">
             <div className="text-center text-sm text-slate-500 mb-2">
                 Previous: <span className="font-bold text-slate-900">{currency} {valueModal?.currentVal.toLocaleString()}</span>
             </div>

             <Input 
                label={`Current Total Value (${currency})`}
                type="number" 
                autoFocus
                placeholder="0.00"
                className="text-3xl font-bold p-4 text-center text-slate-900"
                value={actionAmount} 
                onChange={e => setActionAmount(Number(e.target.value))} 
             />
             
             <Input 
                type="date"
                label="Date of Check-in"
                value={actionDate}
                onChange={e => setActionDate(e.target.value)}
            />

             <Button className="w-full" size="lg" onClick={handleSaveValueUpdate}>Save Update</Button>
          </div>
      </Modal>

    </Container>
  );
};