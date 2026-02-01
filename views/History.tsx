
import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Container, Card, Select } from '../components/UI';
import { format, isWithinInterval, parseISO, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { Section, DateRange } from '../types';

export const History = ({ range, onBack }: { range: DateRange; onBack?: () => void }) => {
  const { state } = useStore();
  const [filter, setFilter] = useState<string>('ALL');

  const inRange = (dateStr: string) => isWithinInterval(parseISO(dateStr), { start: parseISO(range.start), end: parseISO(range.end) });

  const logs = state.auditLog
    .filter(l => filter === 'ALL' || l.section === filter)
    .filter(l => inRange(l.timestamp));

  // --- Monthly Summary Logic ---
  // Only show if range is mostly within one month or we just pick the start date's month
  const summaryDate = parseISO(range.start);
  const monthName = format(summaryDate, 'MMMM yyyy');
  
  const monthlyStats = useMemo(() => {
      const expenses = state.expenses.filter(e => isSameMonth(parseISO(e.date), summaryDate)).reduce((sum, e) => sum + e.amount, 0);
      const saved = state.savingsTransactions.filter(t => t.type === 'DEPOSIT' && isSameMonth(parseISO(t.date), summaryDate)).reduce((sum, t) => sum + t.amount, 0);
      
      const weights = state.weightEntries.filter(w => isSameMonth(parseISO(w.date), summaryDate)).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const weightChange = weights.length > 1 ? weights[weights.length - 1].weight - weights[0].weight : 0;

      return { expenses, saved, weightChange };
  }, [state.expenses, state.savingsTransactions, state.weightEntries, summaryDate]);

  return (
    <Container>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            {onBack && (
                <button onClick={onBack} className="text-slate-500 hover:text-slate-800 font-bold text-sm">
                    ← Back
                </button>
            )}
            <h2 className="text-2xl font-bold">History</h2>
        </div>
        <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
            {range.label}
        </div>
      </div>

      {/* Monthly Summary Block */}
      {range.preset === 'MONTH' && (
          <Card className="bg-slate-900 text-white mb-6 border-none">
              <div className="text-xs font-bold text-slate-400 uppercase mb-4">{monthName} Summary</div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <div className="text-xs text-slate-400">Total Spent</div>
                      <div className="font-bold text-lg">{state.settings.mainCurrency}{monthlyStats.expenses.toLocaleString()}</div>
                  </div>
                  <div>
                      <div className="text-xs text-slate-400">Total Saved</div>
                      <div className="font-bold text-lg text-emerald-400">+{state.settings.mainCurrency}{monthlyStats.saved.toLocaleString()}</div>
                  </div>
                  <div>
                      <div className="text-xs text-slate-400">Weight Change</div>
                      <div className={`font-bold text-lg ${monthlyStats.weightChange <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {monthlyStats.weightChange > 0 ? '+' : ''}{monthlyStats.weightChange.toFixed(1)} kg
                      </div>
                  </div>
              </div>
          </Card>
      )}

      <div className="mb-4">
        <Select 
            options={[{label: 'All Sections', value: 'ALL'}, ...Object.values(Section).map(s => ({label: s, value: s}))]} 
            value={filter}
            onChange={e => setFilter(e.target.value)}
        />
      </div>

      <div className="space-y-3">
        {logs.map(log => (
            <Card key={log.id} className="flex gap-3 items-start py-3">
                <div className="min-w-[50px] text-xs text-slate-500 pt-1">
                    {format(new Date(log.timestamp), 'MMM d')}
                    <br/>
                    {format(new Date(log.timestamp), 'HH:mm')}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                         <span className="font-bold text-sm text-slate-800">{log.description}</span>
                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 ${
                             log.actionType === 'ADD' ? 'bg-green-100 text-green-700' :
                             log.actionType === 'DELETE' ? 'bg-red-100 text-red-700' :
                             'bg-blue-100 text-blue-700'
                         }`}>{log.actionType}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{log.section}</div>
                </div>
            </Card>
        ))}
        {logs.length === 0 && <div className="text-center text-slate-400 py-8">No history found in this period.</div>}
      </div>
    </Container>
  );
};
