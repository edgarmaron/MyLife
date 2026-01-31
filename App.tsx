import React, { useState, useEffect } from 'react';
import { AppProvider, useStore, generateId } from './store';
import { Layout } from './components/Layout';
import { Section, DateRange, DateRangePreset, AppState } from './types';
import { 
    Plus, Flame, Footprints, Dumbbell, Check, Download, Upload, 
    History as HistoryIcon, FileText, AlertTriangle, ShieldCheck, 
    Globe, Activity, Save, AlertOctagon, RotateCcw, Cpu, HardDrive
} from 'lucide-react';
import { format, startOfDay, endOfDay, differenceInDays, parseISO } from 'date-fns';

// Views
import { Dashboard } from './views/Dashboard';
import { Cash } from './views/Cash';
import { Invest } from './views/Invest';
import { Health } from './views/Health';
import { History } from './views/History';
import { Button, Container, Card, Input, Modal, Badge, TimeRangeSelector, ProgressBar } from './components/UI';

const SettingsView = ({ onOpenHistory, range }: { onOpenHistory: () => void, range: DateRange }) => {
    const { state, dispatch } = useStore();
    const [form, setForm] = useState(state.settings);
    const [importModal, setImportModal] = useState<{ isOpen: boolean; data: AppState | null; summary: any | null } | null>(null);

    // Sync form when global state changes
    useEffect(() => {
        setForm(state.settings);
    }, [state.settings]);

    const handleSave = () => {
        dispatch({type: 'UPDATE_SETTINGS', payload: form});
        alert("System settings updated.");
    };
    
    const handleReset = () => {
        const confirm1 = window.confirm("WARNING: This will permanently delete ALL data. There is no undo.");
        if(confirm1) {
            const confirm2 = window.prompt("Type 'DELETE' to confirm full system wipe.");
            if(confirm2 === 'DELETE') {
                dispatch({ type: 'RESET_DATA' });
                alert("System reset complete.");
            }
        }
    };

    // Export with timestamp update
    const handleExport = () => {
        const now = new Date().toISOString();
        
        // Update state first so the export includes the latest backup date
        const stateToExport = {
            ...state,
            settings: { ...state.settings, lastBackupDate: now }
        };
        
        // Dispatch update to store so UI reflects it immediately
        dispatch({ type: 'UPDATE_SETTINGS', payload: { lastBackupDate: now } });

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateToExport, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `life_dashboard_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    // Import Logic
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string) as AppState;
                if (!json.settings || !json.accounts) {
                    alert("Invalid system file.");
                    return;
                }
                const summary = {
                    transactions: json.expenses.length,
                    accounts: json.accounts.length,
                    holdings: json.holdings.length,
                    healthLogs: json.weightEntries.length + json.calorieEntries.length + json.stepEntries.length,
                };
                setImportModal({ isOpen: true, data: json, summary });
            } catch (err) {
                alert("Failed to parse system file.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const confirmImport = (mode: 'MERGE' | 'REPLACE') => {
        if (!importModal?.data) return;
        if (mode === 'REPLACE') {
            if (!window.confirm("Overwrite current system?")) return;
            dispatch({ type: 'LOAD_STATE', payload: importModal.data });
        } else {
            dispatch({ type: 'MERGE_STATE', payload: importModal.data });
        }
        setImportModal(null);
    };

    // --- Status Calculations ---
    const requiredFields = [state.settings.name, state.settings.exchangeRate, state.settings.dailyCalorieTarget];
    const filledFields = requiredFields.filter(Boolean).length;
    const profileHealth = Math.round((filledFields / requiredFields.length) * 100);
    
    const daysSinceBackup = state.settings.lastBackupDate 
        ? differenceInDays(new Date(), parseISO(state.settings.lastBackupDate))
        : 999;
    
    const backupStatus = daysSinceBackup < 7 ? 'GOOD' : (daysSinceBackup < 30 ? 'WARN' : 'CRITICAL');

    return (
        <Container className="space-y-8">
            <div className="flex items-center gap-3 mb-2">
                <Cpu className="text-slate-400" />
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Control Center</h2>
            </div>

            {/* 1. System Status */}
            <Card className="bg-slate-900 text-white border-none shadow-xl shadow-slate-900/10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">System Status</div>
                        <div className="text-2xl font-bold flex items-center gap-2">
                             {backupStatus === 'GOOD' ? (
                                <span className="text-emerald-400 flex items-center gap-2"><CheckCircle size={20} /> Operational</span>
                             ) : (
                                <span className="text-amber-400 flex items-center gap-2"><AlertTriangle size={20} /> Attention Needed</span>
                             )}
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Backup</div>
                        <div className={`font-mono text-sm ${backupStatus === 'CRITICAL' ? 'text-rose-400' : 'text-white'}`}>
                            {state.settings.lastBackupDate ? format(parseISO(state.settings.lastBackupDate), 'MMM d, yyyy') : 'Never'}
                        </div>
                    </div>
                </div>
                
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-400">
                        <span>Profile Completeness</span>
                        <span>{profileHealth}%</span>
                    </div>
                    <ProgressBar value={profileHealth} max={100} color="bg-blue-500" className="bg-white/10" />
                </div>
            </Card>

            {/* 2. Global Rules (Currency) */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <Globe size={18} className="text-blue-600" />
                    <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Global Rules</h3>
                </div>
                <Card className="border-blue-100 bg-blue-50/20">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <Input 
                            label="Main Currency (Cash)" 
                            value={form.mainCurrency} 
                            onChange={e => setForm({...form, mainCurrency: e.target.value})} 
                            className="font-mono font-bold uppercase"
                        />
                        <Input 
                            label="Investment Currency" 
                            value={form.investmentCurrency} 
                            onChange={e => setForm({...form, investmentCurrency: e.target.value})} 
                            className="font-mono font-bold uppercase"
                        />
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                        <Input 
                            type="number" 
                            step="0.01" 
                            label={`Exchange Rate (1 ${form.investmentCurrency} = ? ${form.mainCurrency})`} 
                            value={form.exchangeRate} 
                            onChange={e => setForm({...form, exchangeRate: Number(e.target.value)})} 
                            className="font-bold text-lg"
                        />
                        <div className="mt-2 text-xs text-slate-500 flex justify-between">
                            <span>Controls Net Worth calculation across all tabs.</span>
                            <span className="font-mono">100 {form.investmentCurrency} ≈ {(100 * form.exchangeRate).toLocaleString()} {form.mainCurrency}</span>
                        </div>
                    </div>
                </Card>
            </section>

            {/* 3. Bio-System (Health) */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <Activity size={18} className="text-orange-600" />
                    <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Bio-System Configuration</h3>
                </div>
                <Card className="space-y-6">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 border-b border-slate-100 pb-1">Body Specs</div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            <Input type="number" label="Height (cm)" value={form.heightCm} onChange={e => setForm({...form, heightCm: Number(e.target.value)})} />
                            <Input type="number" label="Start Weight (kg)" value={form.startWeightKg} onChange={e => setForm({...form, startWeightKg: Number(e.target.value)})} />
                            <Input type="number" label="Goal Weight (kg)" value={form.goalWeightKg || ''} onChange={e => setForm({...form, goalWeightKg: Number(e.target.value)})} />
                        </div>
                    </div>
                    
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 border-b border-slate-100 pb-1">Daily Targets</div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input type="number" label="Calorie Limit" value={form.dailyCalorieTarget} onChange={e => setForm({...form, dailyCalorieTarget: Number(e.target.value)})} className="text-orange-600 font-bold" />
                            <Input type="number" label="Step Goal" value={form.dailyStepTarget} onChange={e => setForm({...form, dailyStepTarget: Number(e.target.value)})} className="text-blue-600 font-bold" />
                        </div>
                    </div>
                </Card>
            </section>

             <Button size="lg" className="w-full shadow-xl shadow-blue-500/20" onClick={handleSave}>
                <Save size={18} /> Apply Configuration
            </Button>

            {/* 4. Data Vault */}
            <section className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 px-1">
                    <HardDrive size={18} className="text-slate-600" />
                    <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Data Vault</h3>
                </div>
                <Card className="bg-slate-50 border-slate-200">
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={handleExport}
                            className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group"
                        >
                            <Download size={24} className="text-slate-400 group-hover:text-blue-600 mb-2 transition-colors" />
                            <span className="font-bold text-sm text-slate-700">Create Backup</span>
                            <span className="text-[10px] text-slate-400">Save JSON file</span>
                        </button>

                        <div className="relative">
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={handleFileChange} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                            />
                            <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl h-full group-hover:border-blue-400 transition-all">
                                <Upload size={24} className="text-slate-400 mb-2" />
                                <span className="font-bold text-sm text-slate-700">Restore System</span>
                                <span className="text-[10px] text-slate-400">Load JSON file</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-4">
                        <Button variant="ghost" className="w-full justify-between border border-slate-200 bg-white" onClick={onOpenHistory}>
                            <span className="flex items-center gap-2 text-slate-600">
                                <HistoryIcon size={16} /> Audit Logs
                            </span>
                            <Badge color="slate">{range.label}</Badge>
                        </Button>
                    </div>
                </Card>
            </section>

            {/* 5. Danger Zone */}
            <section className="pt-8 pb-8">
                 <div className="flex items-center gap-2 px-1 mb-3">
                    <AlertOctagon size={18} className="text-rose-600" />
                    <h3 className="font-bold text-rose-700 uppercase text-sm tracking-wide">Danger Zone</h3>
                </div>
                <div className="border-2 border-rose-100 rounded-2xl p-6 bg-rose-50/30 flex flex-col items-center text-center">
                    <h4 className="font-bold text-rose-900 mb-1">Factory Reset</h4>
                    <p className="text-xs text-rose-700/70 mb-4 max-w-xs">
                        This will permanently erase all local data. This action cannot be undone.
                    </p>
                    <button 
                        onClick={handleReset}
                        className="bg-white border border-rose-200 text-rose-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all shadow-sm active:scale-95"
                    >
                        Reset System Data
                    </button>
                </div>
            </section>

            {/* Import Modal */}
            <Modal isOpen={!!importModal} onClose={() => setImportModal(null)} title="System Restore">
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                        <div className="font-bold text-slate-700 mb-2 uppercase tracking-wide text-xs">Backup Contents</div>
                        <div className="flex justify-between"><span>Transactions</span> <span className="font-mono font-bold">{importModal?.summary?.transactions}</span></div>
                        <div className="flex justify-between"><span>Accounts</span> <span className="font-mono font-bold">{importModal?.summary?.accounts}</span></div>
                        <div className="flex justify-between"><span>Health Logs</span> <span className="font-mono font-bold">{importModal?.summary?.healthLogs}</span></div>
                    </div>
                    
                    <div className="flex items-start gap-3 p-3 bg-amber-50 text-amber-800 rounded-xl text-xs">
                        <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                        <p><strong>Warning:</strong> Replacing data will wipe the current session. Merging may cause ID collisions if data overlaps.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button variant="outline" onClick={() => confirmImport('MERGE')}>Merge Data</Button>
                        <Button variant="primary" onClick={() => confirmImport('REPLACE')} className="bg-rose-600 hover:bg-rose-700 shadow-rose-600/20">Replace System</Button>
                    </div>
                </div>
            </Modal>
        </Container>
    );
};

// Internal CheckCircle component since it was missing in imports for the status card
const CheckCircle = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
);

const GlobalFab = ({ onOpen }: { onOpen: () => void }) => {
    return (
        <button 
            onClick={onOpen}
            className="fixed bottom-24 right-5 w-14 h-14 bg-slate-900 rounded-full shadow-2xl shadow-slate-900/40 flex items-center justify-center text-white active:scale-90 transition-transform z-30 hover:bg-slate-800"
        >
            <Plus size={28} strokeWidth={2.5} />
        </button>
    );
};

const QuickLogModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const { dispatch } = useStore();
    const [cals, setCals] = useState('');
    const [steps, setSteps] = useState('');
    const [trained, setTrained] = useState(false);
    
    const today = format(new Date(), 'yyyy-MM-dd');

    const handleAddCalories = () => {
        if (!cals) return;
        dispatch({
            type: 'ADD_CALORIES',
            payload: { id: generateId(), date: today, calories: Number(cals) }
        });
        setCals('');
    };

    const handleAddSteps = () => {
        if (!steps) return;
        dispatch({
            type: 'ADD_STEPS',
            payload: { id: generateId(), date: today, count: Number(steps) }
        });
        setSteps('');
    };

    const handleTrain = () => {
        dispatch({
            type: 'ADD_TRAINING',
            payload: { 
                id: generateId(), 
                date: today, 
                type: 'Workout', 
                durationMinutes: 45, 
                intensity: 'MEDIUM',
                note: 'Quick Log'
            }
        });
        setTrained(true);
        setTimeout(() => setTrained(false), 2000); // Reset after success
    };

    // Close and reset on full close
    const handleClose = () => {
        setCals('');
        setSteps('');
        setTrained(false);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Quick Health Log">
            <div className="space-y-6">
                
                {/* Calories */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Flame size={14} className="text-orange-500" /> Add Calories
                    </label>
                    <div className="flex gap-2">
                        <Input 
                            type="number" 
                            placeholder="e.g. 500" 
                            className="text-lg font-bold" 
                            value={cals} 
                            onChange={e => setCals(e.target.value)} 
                        />
                        <Button onClick={handleAddCalories} disabled={!cals} className="bg-orange-500 hover:bg-orange-600 shadow-orange-500/20">
                            <Plus size={20} />
                        </Button>
                    </div>
                </div>

                {/* Steps */}
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-2">
                        <Footprints size={14} className="text-blue-500" /> Add Steps
                    </label>
                    <div className="flex gap-2">
                        <Input 
                            type="number" 
                            placeholder="e.g. 2000" 
                            className="text-lg font-bold" 
                            value={steps} 
                            onChange={e => setSteps(e.target.value)} 
                        />
                        <Button onClick={handleAddSteps} disabled={!steps} className="bg-blue-500 hover:bg-blue-600 shadow-blue-500/20">
                            <Plus size={20} />
                        </Button>
                    </div>
                </div>

                {/* Training */}
                <div className="pt-2 border-t border-slate-100">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Dumbbell size={14} className="text-purple-500" /> Training
                    </label>
                    <button 
                        onClick={handleTrain}
                        disabled={trained}
                        className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg ${
                            trained 
                            ? 'bg-green-500 text-white shadow-green-500/30' 
                            : 'bg-white border-2 border-slate-100 text-slate-700 hover:border-purple-200 hover:text-purple-600'
                        }`}
                    >
                        {trained ? (
                            <>
                                <Check size={24} strokeWidth={3} />
                                Logged!
                            </>
                        ) : (
                            <>
                                Log Workout
                                <Badge color="slate">Today</Badge>
                            </>
                        )}
                    </button>
                    <p className="text-[10px] text-center text-slate-400 mt-2">Logs a standard session for today.</p>
                </div>

                <div className="pt-2">
                    <Button variant="ghost" className="w-full text-slate-400" onClick={handleClose}>Done</Button>
                </div>
            </div>
        </Modal>
    );
};

const Main = () => {
  const [activeTab, setActiveTab] = useState<Section>(Section.DASHBOARD);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [viewHistory, setViewHistory] = useState(false);
  
  // Global Time Filter State (UI removed, but state kept for view props)
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
      preset: 'TODAY',
      start: format(startOfDay(now), 'yyyy-MM-dd'),
      end: format(endOfDay(now), 'yyyy-MM-dd'),
      label: 'Today'
  });

  const renderContent = () => {
    if (viewHistory) return <History range={dateRange} onBack={() => setViewHistory(false)} />;

    switch (activeTab) {
      case Section.DASHBOARD: return <Dashboard onChangeTab={setActiveTab} range={dateRange} />;
      case Section.CASH: return <Cash range={dateRange} />;
      case Section.INVEST: return <Invest range={dateRange} />;
      case Section.HEALTH: return <Health range={dateRange} />;
      case Section.SETTINGS: return <SettingsView onOpenHistory={() => setViewHistory(true)} range={dateRange} />;
      default: return <Dashboard onChangeTab={setActiveTab} range={dateRange} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={(t) => { setActiveTab(t); setViewHistory(false); }}>
      <div className="animate-in fade-in duration-300">
        {renderContent()}
      </div>
      
      {/* Global Floating Action Button - Hide when viewing history */}
      {!viewHistory && dateRange.preset === 'TODAY' && <GlobalFab onOpen={() => setShowQuickLog(true)} />}
      
      {/* Quick Log Modal */}
      <QuickLogModal isOpen={showQuickLog} onClose={() => setShowQuickLog(false)} />
    </Layout>
  );
};

export default function App() {
  return (
    <AppProvider>
      <Main />
    </AppProvider>
  );
}