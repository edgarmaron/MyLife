import React, { useState, useMemo } from 'react';
import { useStore, generateId } from '../store';
import { Card, Button, Container, Modal, Input, ProgressBar, TimeRangeSelector, Badge } from '../components/UI';
import { 
    Flame, Footprints, Dumbbell, 
    TrendingUp, Activity, Check, Scale,
    ChevronDown, ChevronUp, Plus, Minus
} from 'lucide-react';
import { format, differenceInDays, isWithinInterval, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, YAxis, CartesianGrid } from 'recharts';
import { DateRange } from '../types';

export const Health = ({ range: ignoredRange }: { range: DateRange }) => {
  const { state, dispatch } = useStore();
  
  // --- 1. Today's State (Quick Actions) ---
  const todayDate = format(new Date(), 'yyyy-MM-dd');
  
  const todayCalories = state.calorieEntries.filter(e => e.date === todayDate).reduce((sum, e) => sum + e.calories, 0);
  const todaySteps = state.stepEntries.filter(e => e.date === todayDate).reduce((sum, e) => sum + e.count, 0);
  const todayTraining = state.trainingEntries.find(e => e.date === todayDate);

  const [quickLog, setQuickLog] = useState<{ type: 'CALORIES' | 'STEPS', currentVal: number } | null>(null);
  const [logValue, setLogValue] = useState<string>('');

  const handleQuickLog = () => {
      if (!quickLog || !logValue) return;
      const val = Number(logValue);
      if (val === 0) return;

      if (quickLog.type === 'CALORIES') {
           dispatch({ type: 'ADD_CALORIES', payload: { id: generateId(), date: todayDate, calories: val }});
      } else {
           dispatch({ type: 'ADD_STEPS', payload: { id: generateId(), date: todayDate, count: val }});
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
          const t = state.trainingEntries.filter(e => e.date === d).length;
          
          return {
              date: d,
              displayDate: format(day, 'd MMM'),
              weight: w || null, // null for gaps
              steps: s,
              calories: c,
              training: t
          };
      });
  }, [state, range]);

  const averages = useMemo(() => {
      const dayCount = timelineData.length || 1;
      const totalSteps = timelineData.reduce((sum, d) => sum + d.steps, 0);
      const totalCals = timelineData.reduce((sum, d) => sum + d.calories, 0);
      const totalTraining = timelineData.reduce((sum, d) => sum + d.training, 0);
      const weeks = Math.max(dayCount / 7, 1);

      return {
          steps: Math.round(totalSteps / dayCount),
          calories: Math.round(totalCals / dayCount),
          workoutsPerWeek: (totalTraining / weeks).toFixed(1)
      };
  }, [timelineData]);

  // Chart Logic
  // Filter out null weights for the line chart to connect points nicely
  const weightChartData = useMemo(() => {
      return timelineData.filter(d => d.weight !== null).map(d => ({ ...d, val: d.weight }));
  }, [timelineData]);

  return (
    <Container className="space-y-10">
      
      {/* SECTION 1: TODAY (Actions) */}
      <section>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-6">Today</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Calories */}
              <Card 
                  className="bg-orange-50/50 border-orange-100 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
                  onClick={() => setQuickLog({ type: 'CALORIES', currentVal: todayCalories })}
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
                  onClick={() => setQuickLog({ type: 'STEPS', currentVal: todaySteps })}
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
          </div>

          {/* Training Toggle */}
          <button 
              onClick={toggleTraining}
              className={`w-full p-5 rounded-2xl flex items-center justify-between transition-all duration-300 shadow-sm border ${
                  todayTraining 
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-200' 
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
          >
              <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${todayTraining ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {todayTraining ? <Check size={24} strokeWidth={3} /> : <Dumbbell size={24} />}
                  </div>
                  <div className="text-left">
                      <div className={`font-bold text-lg ${todayTraining ? 'text-white' : 'text-slate-900'}`}>
                          {todayTraining ? 'Workout Complete' : 'Log Workout'}
                      </div>
                      <div className={`text-xs font-medium ${todayTraining ? 'text-emerald-100' : 'text-slate-400'}`}>
                          {todayTraining ? 'Good job!' : 'Mark as done'}
                      </div>
                  </div>
              </div>
              {!todayTraining && <Plus size={20} className="text-slate-300" />}
          </button>
      </section>

      {/* SECTION 2: PROGRESS (Trends) */}
      <section>
          <div className="flex justify-between items-end mb-6">
              <h2 className="text-2xl font-extrabold text-slate-900">Progress</h2>
          </div>
          
          <div className="mb-8">
            <TimeRangeSelector range={range} onChange={setRange} />
          </div>

          {/* Averages */}
          <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Avg Cals</div>
                  <div className="text-lg font-black text-slate-900">{averages.calories}</div>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Avg Steps</div>
                  <div className="text-lg font-black text-slate-900">{averages.steps > 1000 ? (averages.steps/1000).toFixed(1) + 'k' : averages.steps}</div>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-100 text-center shadow-sm">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Workouts</div>
                  <div className="text-lg font-black text-slate-900">{averages.workoutsPerWeek}<span className="text-[10px] text-slate-400 font-medium ml-0.5">/wk</span></div>
              </div>
          </div>

          {/* Main Chart Card */}
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
                                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} width={30} />
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
                              <Tooltip 
                                cursor={{fill: '#f8fafc'}}
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-xs">
                                            <div className="font-bold text-slate-900 mb-1">{payload[0].payload.displayDate}</div>
                                            <div className="text-blue-600 font-medium">Steps: {payload[0].payload.steps}</div>
                                            <div className="text-orange-500 font-medium">Cals: {payload[0].payload.calories}</div>
                                        </div>
                                    );
                                    }
                                    return null;
                                }}
                              />
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
        title={quickLog?.type === 'CALORIES' ? 'Log Calories' : 'Log Steps'}
      >
          <div className="space-y-6">
              <div className="text-center">
                  <div className="text-sm text-slate-500 mb-1">Today so far</div>
                  <div className="text-3xl font-black text-slate-900">
                      {quickLog?.currentVal.toLocaleString()}
                  </div>
              </div>
              
              <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Add Amount</label>
                  <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setLogValue(prev => String(Number(prev) - 100))}><Minus size={20} /></Button>
                      <Input 
                        type="number" 
                        value={logValue} 
                        onChange={e => setLogValue(e.target.value)} 
                        autoFocus 
                        placeholder="0"
                        className="text-center font-bold text-xl"
                      />
                      <Button variant="secondary" onClick={() => setLogValue(prev => String(Number(prev) + 100))}><Plus size={20} /></Button>
                  </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                  {[100, 250, 500].map(val => (
                      <button 
                        key={val}
                        onClick={() => setLogValue(String(val))}
                        className="py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition-colors"
                      >
                          +{val}
                      </button>
                  ))}
              </div>

              <Button className={`w-full ${quickLog?.type === 'CALORIES' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`} size="lg" onClick={handleQuickLog}>
                  Add to Total
              </Button>
          </div>
      </Modal>

    </Container>
  );
};