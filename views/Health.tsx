
import React, { useState, useMemo } from 'react';
import { useStore, generateId } from '../store';
import { Card, Button, Container, Modal, Input, ProgressBar, TimeRangeSelector } from '../components/UI';
import { 
    Flame, Footprints, Dumbbell, 
    Check, Scale, Zap,
    Plus, Minus
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, subDays, isSameDay, getISOWeek, isSameYear } from 'date-fns';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { DateRange } from '../types';

export const Health = ({ range: ignoredRange }: { range: DateRange }) => {
  const { state, dispatch } = useStore();
  
  // --- 1. Today's State (Quick Actions) ---
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  
  const todayCalories = state.calorieEntries.filter(e => e.date === todayDate).reduce((sum, e) => sum + e.calories, 0);
  const todaySteps = state.stepEntries.filter(e => e.date === todayDate).reduce((sum, e) => sum + e.count, 0);
  const todayTraining = state.trainingEntries.find(e => e.date === todayDate);
  
  // Latest Weight Logic
  const allWeights = useMemo(() => [...state.weightEntries].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [state.weightEntries]);
  const currentWeight = allWeights.length > 0 ? allWeights[0].weight : (state.settings.startWeightKg || 0);
  const startWeight = state.settings.startWeightKg || currentWeight;
  const weightGoal = state.settings.goalWeightKg;
  const totalChange = currentWeight - startWeight;

  const [quickLog, setQuickLog] = useState<{ type: 'CALORIES' | 'STEPS' | 'WEIGHT', currentVal: number } | null>(null);
  const [logValue, setLogValue] = useState<string>('');

  // --- STREAK LOGIC ---
  const streaks = useMemo(() => {
      // 1. Daily Streaks (Calories & Steps)
      let calorieStreak = 0;
      let stepStreak = 0;
      let checkDate = new Date(); // Start checking from today
      
      // If today is empty, we don't break the streak yet (user might log later), 
      // but the streak only counts completed days. If today IS done, it counts.
      // Logic: Iterate backwards.
      
      const maxLookback = 365;
      
      // Calorie Streak
      for (let i = 0; i < maxLookback; i++) {
          const dStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
          const cals = state.calorieEntries.filter(e => e.date === dStr).reduce((sum, e) => sum + e.calories, 0);
          
          if (cals >= 1) { // Assuming any log counts, or change to >= target
              calorieStreak++;
          } else if (i === 0) {
              // If today is 0, ignore and continue to yesterday
              continue;
          } else {
              break;
          }
      }

      // Step Streak (Use target hit as streak requirement? Let's say > 500 steps for now as "activity")
      for (let i = 0; i < maxLookback; i++) {
          const dStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
          const steps = state.stepEntries.filter(e => e.date === dStr).reduce((sum, e) => sum + e.count, 0);
          
          if (steps >= state.settings.dailyStepTarget) { 
              stepStreak++;
          } else if (i === 0) {
              continue;
          } else {
              break;
          }
      }

      // Workout Streak (Weekly)
      // Count consecutive weeks with at least 1 workout
      let workoutStreak = 0;
      let currentWeek = getISOWeek(new Date());
      let currentYear = new Date().getFullYear();
      
      // Map entries to "Year-Week"
      const workoutWeeks = new Set(state.trainingEntries.map(e => {
          const d = parseISO(e.date);
          return `${d.getFullYear()}-${getISOWeek(d)}`;
      }));

      // Check backwards
      for (let i = 0; i < 52; i++) {
          const check = `${currentYear}-${currentWeek}`;
          if (workoutWeeks.has(check)) {
              workoutStreak++;
          } else if (i === 0) {
              // If current week not done, check previous
          } else {
              break;
          }
          
          // Decrement week logic roughly (simplified)
          currentWeek--;
          if (currentWeek === 0) { currentWeek = 52; currentYear--; }
      }

      return { calories: calorieStreak, steps: stepStreak, workouts: workoutStreak };
  }, [state.calorieEntries, state.stepEntries, state.trainingEntries, state.settings.dailyStepTarget]);


  const handleQuickLog = () => {
      if (!quickLog || !logValue) return;
      const val = Number(logValue);
      if (val === 0 && quickLog.type !== 'WEIGHT') return;

      if (quickLog.type === 'CALORIES') {
           dispatch({ type: 'ADD_CALORIES', payload: { id: generateId(), date: todayDate, calories: val }});
      } else if (quickLog.type === 'STEPS') {
           dispatch({ type: 'ADD_STEPS', payload: { id: generateId(), date: todayDate, count: val }});
      } else if (quickLog.type === 'WEIGHT') {
           dispatch({ type: 'ADD_WEIGHT', payload: { id: generateId(), date: todayDate, weight: val }});
      }
      setQuickLog(null);
      setLogValue('');
  };

  const toggleTraining = () => {
      if (todayTraining) {
          if(window.confirm("Remove today's workout?")) {
            dispatch({ type: 'DELETE_TRAINING', payload: todayTraining.id });
          }
      } else {
          dispatch({ 
              type: 'ADD_TRAINING', 
              payload: { 
                  id: generateId(), 
                  date: todayDate, 
                  type: 'Workout', 
                  durationMinutes: 45, 
                  intensity: 'MEDIUM' 
              } 
          });
      }
  };

  // --- 2. Progress State (Analysis) ---
  const [range, setRange] = useState<DateRange>({
      preset: 'MONTH',
      start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
      label: 'This Month'
  });

  const [chartMode, setChartMode] = useState<'WEIGHT' | 'ACTIVITY'>('WEIGHT');

  // Metrics Calculation
  const timelineData = useMemo(() => {
      const days = eachDayOfInterval({ start: parseISO(range.start), end: parseISO(range.end) });
      return days.map(day => {
          const d = format(day, 'yyyy-MM-dd');
          const w = state.weightEntries.filter(e => e.date === d).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).pop()?.weight;
          const s = state.stepEntries.filter(e => e.date === d).reduce((acc, e) => acc + e.count, 0);
          const c = state.calorieEntries.filter(e => e.date === d).reduce((acc, e) => acc + e.calories, 0);
          
          return {
              date: d,
              displayDate: format(day, 'd MMM'),
              weight: w || null, 
              steps: s,
              calories: c
          };
      });
  }, [state, range]);

  const weightChartData = useMemo(() => {
      return timelineData.filter(d => d.weight !== null).map(d => ({ ...d, val: d.weight }));
  }, [timelineData]);

  return (
    <Container className="space-y-8">
      
      {/* SECTION 1: TODAY (Actions & Streaks) */}
      <section>
          <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-extrabold text-slate-900">Today</h2>
               {/* Streaks Mini-Bar */}
               <div className="flex gap-3">
                   {streaks.calories > 1 && (
                       <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-bold">
                           <Flame size={12} fill="currentColor" /> {streaks.calories}d
                       </div>
                   )}
                   {streaks.steps > 1 && (
                       <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                           <Footprints size={12} fill="currentColor" /> {streaks.steps}d
                       </div>
                   )}
                   {streaks.workouts > 1 && (
                       <div className="flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-xs font-bold">
                           <Dumbbell size={12} fill="currentColor" /> {streaks.workouts}w
                       </div>
                   )}
               </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Calories */}
              <Card 
                  className="bg-orange-50/50 border-orange-100 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
                  onClick={() => { setLogValue(''); setQuickLog({ type: 'CALORIES', currentVal: todayCalories }); }}
              >
                  <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2 text-orange-600">
                          <Flame size={18} fill="currentColor" className="opacity-20" />
                          <span className="text-xs font-bold uppercase tracking-wider">Calories</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 mb-1">{todayCalories}</div>
                      <div className="text-xs font-medium text-slate-400 mb-3">Target: {state.settings.dailyCalorieTarget}</div>
                      <ProgressBar value={todayCalories} max={state.settings.dailyCalorieTarget} color="bg-orange-500" className="h-2" />
                  </div>
              </Card>

              {/* Steps */}
              <Card 
                  className="bg-blue-50/50 border-blue-100 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
                  onClick={() => { setLogValue(''); setQuickLog({ type: 'STEPS', currentVal: todaySteps }); }}
              >
                  <div className="relative z-10">
                       <div className="flex items-center gap-2 mb-2 text-blue-600">
                          <Footprints size={18} fill="currentColor" className="opacity-20" />
                          <span className="text-xs font-bold uppercase tracking-wider">Steps</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 mb-1">{todaySteps > 1000 ? (todaySteps/1000).toFixed(1) + 'k' : todaySteps}</div>
                      <div className="text-xs font-medium text-slate-400 mb-3">Target: {state.settings.dailyStepTarget > 1000 ? (state.settings.dailyStepTarget/1000) + 'k' : state.settings.dailyStepTarget}</div>
                      <ProgressBar value={todaySteps} max={state.settings.dailyStepTarget} color="bg-blue-500" className="h-2" />
                  </div>
              </Card>

              {/* Weight Card */}
              <Card 
                  className="bg-purple-50/50 border-purple-100 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
                  onClick={() => { setLogValue(String(currentWeight)); setQuickLog({ type: 'WEIGHT', currentVal: currentWeight }); }}
              >
                  <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2 text-purple-600">
                          <Scale size={18} fill="currentColor" className="opacity-20" />
                          <span className="text-xs font-bold uppercase tracking-wider">Weight</span>
                      </div>
                      <div className="text-3xl font-black text-slate-900 mb-1">{currentWeight} <span className="text-sm font-bold text-slate-400">kg</span></div>
                      
                      <div className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1">
                          {totalChange > 0 ? '+' : ''}{totalChange.toFixed(1)} kg
                          <span className="font-medium text-slate-400 text-[10px] uppercase">Since Start</span>
                      </div>

                      <div className="text-xs font-medium text-slate-400">
                          {weightGoal ? `Goal: ${weightGoal} kg` : 'No goal set'}
                      </div>
                  </div>
              </Card>

              {/* Training Toggle */}
              <button 
                  onClick={toggleTraining}
                  className={`flex flex-col justify-center p-4 rounded-2xl transition-all duration-300 shadow-sm border text-left h-full ${
                      todayTraining 
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-200' 
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  }`}
              >
                  <div className="flex justify-between items-start w-full mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${todayTraining ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                          {todayTraining ? <Check size={16} strokeWidth={3} /> : <Dumbbell size={16} />}
                      </div>
                      {streaks.workouts > 1 && (
                         <div className="flex items-center gap-1 bg-white/20 text-white px-2 py-0.5 rounded-md text-[10px] font-bold">
                             <Zap size={10} fill="currentColor" /> {streaks.workouts} wk streak
                         </div>
                      )}
                  </div>
                  <div>
                      <div className={`font-bold text-lg leading-tight ${todayTraining ? 'text-white' : 'text-slate-900'}`}>
                          {todayTraining ? 'Workout Done' : 'Log Workout'}
                      </div>
                  </div>
              </button>
          </div>
      </section>

      {/* SECTION 2: PROGRESS */}
      <section>
          <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-extrabold text-slate-900">Trends</h2>
          </div>
          
          <div className="mb-6">
            <TimeRangeSelector range={range} onChange={setRange} />
          </div>

          <Card className="p-0 overflow-hidden">
              <div className="flex border-b border-slate-100">
                  <button 
                    onClick={() => setChartMode('WEIGHT')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${chartMode === 'WEIGHT' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                      Weight
                  </button>
                  <div className="w-px bg-slate-100"></div>
                  <button 
                    onClick={() => setChartMode('ACTIVITY')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${chartMode === 'ACTIVITY' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
                  >
                      Activity
                  </button>
              </div>

              <div className="h-64 w-full p-4">
                  {chartMode === 'WEIGHT' ? (
                      weightChartData.length > 1 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={weightChartData}>
                                  <defs>
                                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                      </linearGradient>
                                  </defs>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} minTickGap={30} />
                                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                                  <Area type="monotone" dataKey="val" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                              </AreaChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400">
                              <Scale size={32} className="mb-2 opacity-20" />
                              <span className="text-xs font-medium">Log weight to see trends</span>
                          </div>
                      )
                  ) : (
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={timelineData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} minTickGap={30} />
                              <Tooltip cursor={{fill: '#f8fafc'}} />
                              <Bar dataKey="steps" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={40} />
                          </BarChart>
                      </ResponsiveContainer>
                  )}
              </div>
          </Card>
      </section>

      {/* Quick Log Modal */}
      <Modal 
        isOpen={!!quickLog} 
        onClose={() => setQuickLog(null)} 
        title={quickLog?.type === 'CALORIES' ? 'Log Calories' : (quickLog?.type === 'STEPS' ? 'Log Steps' : 'Update Weight')}
      >
          <div className="space-y-6">
              {quickLog?.type !== 'WEIGHT' && (
                  <div className="text-center">
                      <div className="text-sm text-slate-500 mb-1">Today so far</div>
                      <div className="text-3xl font-black text-slate-900">
                          {quickLog?.currentVal.toLocaleString()}
                      </div>
                  </div>
              )}
              
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                      {quickLog?.type === 'WEIGHT' ? 'Current Weight (kg)' : 'Add Amount'}
                  </label>
                  <div className="flex gap-2">
                      {quickLog?.type !== 'WEIGHT' && <Button variant="secondary" onClick={() => setLogValue(prev => String(Number(prev) - 100))}><Minus size={20} /></Button>}
                      <Input 
                        type="number" 
                        value={logValue} 
                        onChange={e => setLogValue(e.target.value)} 
                        autoFocus 
                        placeholder={quickLog?.type === 'WEIGHT' ? "e.g. 75.5" : "0"}
                        className="text-center font-bold text-xl"
                      />
                      {quickLog?.type !== 'WEIGHT' && <Button variant="secondary" onClick={() => setLogValue(prev => String(Number(prev) + 100))}><Plus size={20} /></Button>}
                  </div>
              </div>

              <Button 
                className={`w-full ${
                    quickLog?.type === 'CALORIES' ? 'bg-orange-500 hover:bg-orange-600' : 
                    quickLog?.type === 'WEIGHT' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-500 hover:bg-blue-600'
                }`} 
                size="lg" 
                onClick={handleQuickLog}
              >
                  {quickLog?.type === 'WEIGHT' ? 'Update Weight' : 'Add to Total'}
              </Button>
          </div>
      </Modal>

    </Container>
  );
};
