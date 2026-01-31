import React, { useState, useMemo } from 'react';
import { useStore, generateId } from '../store';
import { Card, Button, Container, Modal, Input, Select, ProgressBar, Badge } from '../components/UI';
import { 
    Plus, TrendingUp, TrendingDown, DollarSign, Activity, Wallet, 
    PiggyBank, Bitcoin, Dumbbell, ShieldCheck, Heart, Zap, ArrowRight,
    CheckCircle2, AlertCircle, RefreshCw, Calendar, Target, Briefcase, Landmark
} from 'lucide-react';
import { Section, Expense, DateRange } from '../types';
import { EXPENSE_CATEGORIES } from '../constants';
import { format, differenceInDays, startOfWeek, isSameWeek, subDays, isWithinInterval, parseISO } from 'date-fns';

export const Dashboard = ({ onChangeTab, range }: { onChangeTab: (t: Section) => void, range: DateRange }) => {
  const { state, dispatch } = useStore();
  const isHistoryMode = range.preset !== 'TODAY';

  // --- Calculations ---
  
  // Helpers
  const inRange = (dateStr: string) => isWithinInterval(parseISO(dateStr), { start: parseISO(range.start), end: parseISO(range.end) });

  const today = format(new Date(), 'yyyy-MM-dd');
  
  // 1. Net Worth Components - Unified Calculation
  
  // Cash & Savings (Normalized to Main Currency for Total, displayed in Main Currency)
  const totalLiquidCash = state.accounts.reduce((sum, a) => {
      if (a.currency === state.settings.investmentCurrency) return sum + (a.balance * state.settings.exchangeRate);
      return sum + a.balance;
  }, 0);

  const totalSavings = state.savings.reduce((sum, s) => {
      if (s.currency === state.settings.investmentCurrency) return sum + (s.balance * state.settings.exchangeRate);
      return sum + s.balance;
  }, 0);
  
  // Invested (Normalized to Main Currency for Total)
  const totalInvestedConverted = state.holdings.reduce((sum, h) => {
      if (h.currency === state.settings.mainCurrency) return sum + h.currentPrice;
      return sum + (h.currentPrice * state.settings.exchangeRate);
  }, 0);

  // Invested Native (For Display in "Invested" box - usually EUR)
  const totalInvestedNative = state.holdings.reduce((sum, h) => {
      if (h.currency === state.settings.investmentCurrency) return sum + h.currentPrice;
      return sum + (h.currentPrice / state.settings.exchangeRate);
  }, 0);

  const netWorth = totalLiquidCash + totalSavings + totalInvestedConverted;

  // 2. Range Data
  const expensesInRange = state.expenses.filter(e => inRange(e.date));
  const spentInRange = expensesInRange.reduce((sum, e) => sum + e.amount, 0);

  const savingsInRange = state.savingsTransactions.filter(t => t.type === 'DEPOSIT' && inRange(t.date));
  const savedInRange = savingsInRange.reduce((sum, t) => sum + t.amount, 0);

  // 3. Health Stats
  const weightEntriesInRange = state.weightEntries.filter(w => inRange(w.date)).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const startWeight = weightEntriesInRange[0]?.weight || state.settings.startWeightKg || 0;
  const endWeight = weightEntriesInRange[weightEntriesInRange.length - 1]?.weight || startWeight;
  const weightChangeInRange = endWeight - startWeight;

  const caloriesInRange = state.calorieEntries.filter(c => inRange(c.date));
  const stepsInRange = state.stepEntries.filter(s => inRange(s.date));
  const trainingInRange = state.trainingEntries.filter(t => inRange(t.date));

  // Avg Stats
  const daysInRange = Math.max(1, differenceInDays(parseISO(range.end), parseISO(range.start)) + 1);
  const avgSteps = Math.round(stepsInRange.reduce((sum, s) => sum + s.count, 0) / daysInRange);
  const totalTraining = trainingInRange.length;

  // Today specific (for Today view)
  const caloriesToday = state.calorieEntries.filter(c => c.date === today).reduce((sum, c) => sum + c.calories, 0);
  const stepsToday = state.stepEntries.filter(s => s.date === today).reduce((sum, s) => sum + s.count, 0);
  
  // 5. Savings Goals Focus
  const emergencyFund = state.savings.find(s => s.type === 'EMERGENCY');
  const activeGoals = state.savings.filter(s => s.target && s.target > 0);
  
  let nextAction = { label: "Log Calories", action: "HEALTH" };
  if (caloriesToday > 0 && stepsToday < 100) nextAction = { label: "Log Steps", action: "HEALTH" };
  else if (stepsToday > 0 && savedInRange === 0) nextAction = { label: "Add Savings", action: "SAVINGS" };

  return (
    <Container className="space-y-8">
      
      {/* 1. Header & Today Card */}
      <section>
          <div className="flex justify-between items-center mb-6">
            <div>
               <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
               <div className="flex items-center gap-2 mt-1">
                 <Calendar size={14} className="text-slate-400" />
                 <p className="text-slate-500 font-medium text-sm">{isHistoryMode ? range.label : format(new Date(), 'EEEE, d MMMM')}</p>
               </div>
            </div>
            {isHistoryMode && <Badge color="orange">Viewing History</Badge>}
          </div>

          {!isHistoryMode ? (
              <Card className="bg-white border-blue-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-2 mb-4">
                      <Badge color="blue">Today's Focus</Badge>
                  </div>
                  
                  <div className="space-y-5">
                      {/* Health Row */}
                      <div className="flex gap-6">
                          <div className="flex-1">
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Calories Left</div>
                              <div className="text-2xl font-bold text-slate-900">{Math.max(state.settings.dailyCalorieTarget - caloriesToday, 0)}</div>
                              <ProgressBar value={caloriesToday} max={state.settings.dailyCalorieTarget} color="bg-orange-400" className="mt-2" />
                          </div>
                          <div className="flex-1">
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Steps Left</div>
                              <div className="text-2xl font-bold text-slate-900">{Math.max(state.settings.dailyStepTarget - stepsToday, 0)}</div>
                              <ProgressBar value={stepsToday} max={state.settings.dailyStepTarget} color="bg-blue-400" className="mt-2" />
                          </div>
                      </div>
                  </div>
              </Card>
          ) : (
              <Card className="bg-slate-50 border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Period Summary</div>
                  <div className="grid grid-cols-2 gap-6">
                      <div>
                          <div className="text-slate-500 text-xs font-medium mb-1">Total Spent</div>
                          <div className="text-2xl font-bold text-rose-500">{state.settings.mainCurrency} {spentInRange.toLocaleString()}</div>
                      </div>
                      <div>
                          <div className="text-slate-500 text-xs font-medium mb-1">Total Saved</div>
                          <div className="text-2xl font-bold text-emerald-500">{state.settings.mainCurrency} {savedInRange.toLocaleString()}</div>
                      </div>
                      <div>
                          <div className="text-slate-500 text-xs font-medium mb-1">Weight Change</div>
                          <div className={`text-xl font-bold ${weightChangeInRange <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {weightChangeInRange > 0 ? '+' : ''}{weightChangeInRange.toFixed(1)} kg
                          </div>
                      </div>
                      <div>
                          <div className="text-slate-500 text-xs font-medium mb-1">Avg Steps</div>
                          <div className="text-xl font-bold text-blue-500">{avgSteps.toLocaleString()}</div>
                      </div>
                  </div>
              </Card>
          )}
      </section>

      {/* 2. Unified Net Worth */}
      <Card onClick={() => onChangeTab(Section.INVEST)} className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-xl shadow-slate-900/10 cursor-pointer group">
          <div className="flex justify-between items-start mb-2">
             <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Net Worth</div>
             <ArrowRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
          </div>
          <div className="text-4xl font-extrabold tracking-tight mb-6">
              <span className="text-slate-400 text-2xl font-normal mr-2">{state.settings.mainCurrency}</span>
              {netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
          
          <div className="grid grid-cols-3 gap-px bg-white/10 rounded-xl overflow-hidden border border-white/5">
              <div className="bg-slate-900/50 p-3 backdrop-blur-sm text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Cash</div>
                  <div className="font-bold text-white text-xs sm:text-sm">{state.settings.mainCurrency} {totalLiquidCash.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact' })}</div>
              </div>
              <div className="bg-slate-900/50 p-3 backdrop-blur-sm text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Savings</div>
                  <div className="font-bold text-white text-xs sm:text-sm">{state.settings.mainCurrency} {totalSavings.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact' })}</div>
              </div>
              <div className="bg-slate-900/50 p-3 backdrop-blur-sm text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Invested</div>
                  <div className="font-bold text-emerald-400 text-xs sm:text-sm">{state.settings.investmentCurrency} {totalInvestedNative.toLocaleString(undefined, { maximumFractionDigits: 0, notation: 'compact' })}</div>
              </div>
          </div>
      </Card>

      {/* 3. Savings Goals Progress */}
      <section>
          <div className="flex items-center gap-2 mb-3 px-1">
              <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><Target size={16} /></div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Savings Goals</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeGoals.length === 0 ? (
                  <Card className="col-span-2 py-8 flex flex-col items-center justify-center text-center border-dashed" onClick={() => onChangeTab(Section.CASH)}>
                      <PiggyBank size={32} className="text-slate-300 mb-2" />
                      <div className="font-bold text-slate-500">No active goals</div>
                      <div className="text-xs text-slate-400">Set a target in the Cash tab</div>
                  </Card>
              ) : (
                  activeGoals.slice(0, 4).map(goal => (
                      <Card key={goal.id} className="p-4" onClick={() => onChangeTab(Section.CASH)}>
                          <div className="flex justify-between items-start mb-2">
                              <span className="font-bold text-sm text-slate-800">{goal.name}</span>
                              <span className="text-xs font-bold text-emerald-600">
                                  {Math.round((goal.balance / (goal.target || 1)) * 100)}%
                              </span>
                          </div>
                          <ProgressBar value={goal.balance} max={goal.target || 1} color={goal.type === 'EMERGENCY' ? 'bg-rose-500' : 'bg-emerald-500'} className="h-2 mb-2" />
                          <div className="flex justify-between text-[10px] font-medium text-slate-400">
                              <span>{state.settings.mainCurrency} {goal.balance.toLocaleString()}</span>
                              <span>Target: {state.settings.mainCurrency} {goal.target?.toLocaleString()}</span>
                          </div>
                      </Card>
                  ))
              )}
          </div>
      </section>

      {/* 4. Health Section (Warm) */}
      <div className="bg-orange-50/50 rounded-3xl p-5 border border-orange-100/50 space-y-4">
          <div className="flex items-center gap-2 mb-2 px-1">
              <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><Heart size={16} /></div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Health Guide</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
               {/* Weight Card - Enhanced */}
              <Card onClick={() => onChangeTab(Section.HEALTH)} className="col-span-2 sm:col-span-1">
                  <div className="flex justify-between items-start mb-2">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">Current Weight</div>
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-1">{weightEntriesInRange[weightEntriesInRange.length-1]?.weight || state.settings.startWeightKg} <span className="text-sm text-slate-400">kg</span></div>
                  <div className={`text-xs font-bold mb-3 ${weightChangeInRange <= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {weightChangeInRange > 0 ? '+' : ''}{weightChangeInRange.toFixed(1)} kg {isHistoryMode ? 'in period' : 'total'}
                  </div>
              </Card>

              {/* Training Progress */}
              <Card className="col-span-2 sm:col-span-1 flex flex-col justify-center">
                  <div className="space-y-4">
                      <div>
                          <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                              <span>Training</span>
                              <span>{totalTraining} sesh</span>
                          </div>
                          <ProgressBar value={totalTraining} max={Math.max(totalTraining, 12)} color="bg-purple-500" />
                      </div>
                  </div>
              </Card>
          </div>
      </div>

      {!isHistoryMode && (
          <Button 
            size="lg" 
            className="w-full shadow-xl shadow-blue-600/20 py-5 text-lg flex items-center justify-between px-6"
            onClick={() => {
                if(nextAction.action === 'HEALTH') onChangeTab(Section.HEALTH);
                else if(nextAction.action === 'SAVINGS') onChangeTab(Section.CASH);
            }}
          >
              <span>{nextAction.label}</span>
              <ArrowRight size={20} />
          </Button>
      )}

    </Container>
  );
};