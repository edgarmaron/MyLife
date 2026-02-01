
import React, { useMemo } from 'react';
import { useStore } from '../store';
import { Card, Container, ProgressBar, Badge, Button } from '../components/UI';
import { 
    Calendar, ArrowRight, Pin, Heart, Wallet, TrendingUp, 
    Target, Scale, Footprints, PiggyBank, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Section, DateRange } from '../types';
import { format, differenceInDays, parseISO, startOfMonth, subMonths, isSameMonth } from 'date-fns';

export const Dashboard = ({ onChangeTab, range }: { onChangeTab: (t: Section) => void, range: DateRange }) => {
  const { state, dispatch } = useStore();
  
  // --- Global Helpers ---
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const isHistoryMode = range.preset !== 'TODAY';

  // --- 1. HEALTH SECTION LOGIC ---
  const latestWeightEntry = useMemo(() => [...state.weightEntries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0], [state.weightEntries]);
  const currentWeight = latestWeightEntry?.weight || state.settings.startWeightKg || 0;
  const goalWeight = state.settings.goalWeightKg || currentWeight;
  const weightDiff = currentWeight - goalWeight; // Positive means we need to lose
  
  // Estimate weight goal time
  const weightEntriesLast30 = state.weightEntries.filter(w => differenceInDays(today, parseISO(w.date)) <= 30).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const weightLossRate = weightEntriesLast30.length > 1 
    ? (weightEntriesLast30[0].weight - weightEntriesLast30[weightEntriesLast30.length -1].weight) 
    : 0; // Kg lost in last period found
  const weeksToGoal = (weightLossRate > 0 && weightDiff > 0) ? Math.round(weightDiff / (weightLossRate / 4)) : 0;

  const caloriesToday = state.calorieEntries.filter(c => c.date === todayStr).reduce((sum, c) => sum + c.calories, 0);
  const stepsToday = state.stepEntries.filter(s => s.date === todayStr).reduce((sum, s) => sum + s.count, 0);

  // --- 2. MONEY SECTION LOGIC ---
  // Goals
  const activeGoal = state.savings.filter(s => s.target && s.target > 0).sort((a,b) => (b.target || 0) - (a.target || 0))[0]; // Biggest goal
  const goalProgress = activeGoal && activeGoal.target ? (activeGoal.balance / activeGoal.target) * 100 : 0;
  
  // Estimate savings goal time
  const savingsLast30 = state.savingsTransactions
    .filter(t => t.type === 'DEPOSIT' && t.savingsAccountId === activeGoal?.id && differenceInDays(today, parseISO(t.date)) <= 30)
    .reduce((sum, t) => sum + t.amount, 0);
  const monthsToSave = (activeGoal && savingsLast30 > 0 && activeGoal.target) 
    ? Math.round((activeGoal.target - activeGoal.balance) / savingsLast30) 
    : 0;

  // Monthly Budget (Detail Card)
  const expensesThisMonth = state.expenses.filter(e => isSameMonth(parseISO(e.date), today)).reduce((sum, e) => sum + e.amount, 0);
  const expensesLastMonth = state.expenses.filter(e => isSameMonth(parseISO(e.date), subMonths(today, 1))).reduce((sum, e) => sum + e.amount, 0);
  const spendStatus = expensesThisMonth < expensesLastMonth ? 'GOOD' : 'WARN';

  // --- 3. INVEST SECTION LOGIC ---
  const totalInvested = state.holdings.reduce((sum, h) => {
      // Normalize to Main Currency
      const val = h.currency === state.settings.mainCurrency ? h.currentPrice : h.currentPrice * state.settings.exchangeRate;
      return sum + val;
  }, 0);
  
  // Find top mover (Detail)
  // Simple check: Last price update vs Cost Basis? Or just lifetime PL.
  // Let's use lifetime PL for simplicity in dashboard
  const topAsset = [...state.holdings].sort((a,b) => {
      // Logic from Invest tab simplified
       // This is a rough approximation for dashboard speed
      return 0; 
  })[0]; // Placeholder for sort

  // --- RENDER SECTIONS ---

  const renderHealth = () => (
      <section className="space-y-3">
          <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><Heart size={16} /></div>
                  <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Health & Body</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => dispatch({type: 'UPDATE_SETTINGS', payload: { pinnedDashboardSection: 'HEALTH' }})}>
                   <Pin size={16} className={state.settings.pinnedDashboardSection === 'HEALTH' ? 'fill-slate-900 text-slate-900' : 'text-slate-300'} />
              </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
              {/* Main Card: Weight Goal */}
              <Card className="col-span-2 bg-orange-50/50 border-orange-100" onClick={() => onChangeTab(Section.HEALTH)}>
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Weight Goal</div>
                          <div className="text-2xl font-black text-slate-900 mt-1">{currentWeight} <span className="text-sm font-bold text-slate-400">/ {goalWeight} kg</span></div>
                      </div>
                      <Scale size={20} className="text-orange-300" />
                  </div>
                  
                  {state.settings.goalWeightKg ? (
                    <>
                        <ProgressBar value={Math.max(0, currentWeight - weightDiff)} max={currentWeight} color="bg-orange-500" className="h-2 mb-2" />
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                            {weeksToGoal > 0 ? (
                                <>
                                    <Clock size={12} className="text-orange-600" />
                                    <span className="text-orange-700">~{weeksToGoal} weeks to go</span>
                                </>
                            ) : (
                                <span className="text-slate-400">Keep pushing!</span>
                            )}
                        </div>
                    </>
                  ) : (
                      <div className="text-xs text-orange-600 font-bold">Set a goal in settings</div>
                  )}
              </Card>

              {/* Detail Card: Activity Ring */}
              <Card className="col-span-1 flex flex-col justify-center items-center text-center p-2" onClick={() => onChangeTab(Section.HEALTH)}>
                  <div className="relative w-12 h-12 mb-2">
                      <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
                          <circle cx="24" cy="24" r="20" stroke="#3b82f6" strokeWidth="4" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 - (Math.min(stepsToday/state.settings.dailyStepTarget, 1) * 125.6)} className="transition-all duration-1000" />
                      </svg>
                      <Footprints size={16} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500" />
                  </div>
                  <div className="text-xs font-bold text-slate-900">{Math.round((stepsToday/state.settings.dailyStepTarget)*100)}%</div>
                  <div className="text-[10px] text-slate-400 uppercase">Steps</div>
              </Card>
          </div>
      </section>
  );

  const renderMoney = () => (
      <section className="space-y-3">
           <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Wallet size={16} /></div>
                  <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Cash & Goals</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => dispatch({type: 'UPDATE_SETTINGS', payload: { pinnedDashboardSection: 'MONEY' }})}>
                   <Pin size={16} className={state.settings.pinnedDashboardSection === 'MONEY' ? 'fill-slate-900 text-slate-900' : 'text-slate-300'} />
              </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
              {/* Main Card: Top Goal */}
              <Card className="col-span-2 bg-emerald-50/50 border-emerald-100" onClick={() => onChangeTab(Section.CASH)}>
                  {activeGoal ? (
                      <>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Focus Goal</div>
                                <div className="text-lg font-black text-slate-900 mt-1 truncate max-w-[120px]">{activeGoal.name}</div>
                            </div>
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${goalProgress >= 100 ? 'bg-emerald-200 text-emerald-800' : (goalProgress > 50 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}`}>
                                {goalProgress >= 100 ? 'Done' : (monthsToSave > 0 ? `${monthsToSave} mo left` : 'In Progress')}
                            </div>
                        </div>
                        <ProgressBar value={activeGoal.balance} max={activeGoal.target || 1} color="bg-emerald-500" className="h-2 mb-2" />
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-900 font-bold">{Math.round(goalProgress)}%</span>
                            <span className="text-slate-400">{state.settings.mainCurrency} {activeGoal.target?.toLocaleString()}</span>
                        </div>
                      </>
                  ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center py-4">
                          <Target className="text-emerald-300 mb-1" />
                          <div className="text-xs font-bold text-emerald-700">No active goals</div>
                      </div>
                  )}
              </Card>

              {/* Detail Card: Monthly Burn */}
              <Card className="col-span-1 flex flex-col justify-center p-3" onClick={() => onChangeTab(Section.CASH)}>
                   <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mo. Spend</div>
                   <div className="text-sm font-black text-slate-900 mb-1">{state.settings.mainCurrency}{expensesThisMonth.toLocaleString(undefined, { notation: 'compact' })}</div>
                   <div className={`text-[10px] font-bold flex items-center gap-1 ${spendStatus === 'GOOD' ? 'text-emerald-600' : 'text-rose-600'}`}>
                       {spendStatus === 'GOOD' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                       {spendStatus === 'GOOD' ? 'Under' : 'Over'}
                   </div>
              </Card>
          </div>
      </section>
  );

  const renderInvest = () => (
      <section className="space-y-3">
           <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={16} /></div>
                  <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Investments</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => dispatch({type: 'UPDATE_SETTINGS', payload: { pinnedDashboardSection: 'INVEST' }})}>
                   <Pin size={16} className={state.settings.pinnedDashboardSection === 'INVEST' ? 'fill-slate-900 text-slate-900' : 'text-slate-300'} />
              </Button>
          </div>

          <div className="grid grid-cols-3 gap-3">
               {/* Main Card: Total Value */}
              <Card className="col-span-2 bg-blue-50/50 border-blue-100" onClick={() => onChangeTab(Section.INVEST)}>
                  <div className="flex justify-between items-start mb-3">
                      <div>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Net Worth</div>
                          <div className="text-xl font-black text-slate-900 mt-1">
                              {state.settings.mainCurrency} {totalInvested.toLocaleString(undefined, { notation: 'compact' })}
                          </div>
                      </div>
                      <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                          <TrendingUp size={16} />
                      </div>
                  </div>
                  <div className="text-xs font-medium text-slate-500">
                      Across {state.holdings.length} assets
                  </div>
              </Card>

              {/* Detail Card: Quick Action */}
              <Card 
                className="col-span-1 flex flex-col items-center justify-center text-center p-2 border-dashed border-blue-200 hover:border-blue-400 bg-white"
                onClick={() => onChangeTab(Section.INVEST)}
              >
                  <div className="bg-blue-50 rounded-full p-2 mb-1 text-blue-600">
                      <TrendingUp size={16} />
                  </div>
                  <div className="text-[10px] font-bold text-blue-700">Check<br/>Performance</div>
              </Card>
          </div>
      </section>
  );

  const renderContent = () => {
      const { pinnedDashboardSection } = state.settings;
      const order = [
          { id: 'HEALTH', render: renderHealth },
          { id: 'MONEY', render: renderMoney },
          { id: 'INVEST', render: renderInvest }
      ];

      // Sort: Pinned first, then default order
      const sorted = order.sort((a,b) => {
          if (a.id === pinnedDashboardSection) return -1;
          if (b.id === pinnedDashboardSection) return 1;
          return 0;
      });

      return (
          <div className="space-y-8">
              {sorted.map(s => <React.Fragment key={s.id}>{s.render()}</React.Fragment>)}
          </div>
      );
  };

  return (
    <Container className="space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
            <div className="flex items-center gap-2 mt-1">
                <Calendar size={14} className="text-slate-400" />
                <p className="text-slate-500 font-medium text-sm">{format(new Date(), 'EEEE, d MMMM')}</p>
            </div>
        </div>
      </div>

      {renderContent()}

    </Container>
  );
};
