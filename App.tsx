import React, { useState, useEffect } from 'react';
import { AppProvider, useStore } from './store';
import { Layout } from './components/Layout';
import { Section, DateRange, AppState } from './types';
import { 
    Download, Upload, History as HistoryIcon, AlertTriangle, Globe, Activity, Save, AlertOctagon, Cpu, HardDrive, Check
} from 'lucide-react';
import { format, startOfDay, endOfDay, differenceInDays, parseISO, startOfMonth } from 'date-fns';

// Views
import { Dashboard } from './views/Dashboard';
import { Cash } from './views/Cash';
import { Invest } from './views/Invest';
import { Health } from './views/Health';
import { History } from './views/History';
import { Button, Container, Card, Input, Modal, Badge, ProgressBar } from './components/UI';

const SettingsView = ({ onOpenHistory, range }: { onOpenHistory: () => void, range: DateRange }) => {
    const { state, dispatch } = useStore();
    const [form, setForm] = useState(state.settings);
    const [importModal, setImportModal] = useState<{ isOpen: boolean; data: AppState | null; summary: any | null } | null>(null);

    useEffect(() => { setForm(state.settings); }, [state.settings]);

    const handleSave = () => {
        dispatch({type: 'UPDATE_SETTINGS', payload: form});
        alert("System settings updated.");
    };
    
    const handleReset = () => {
        if(window.confirm("WARNING: This will permanently delete ALL data. There is no undo.")) {
            if(window.prompt("Type 'DELETE' to confirm full system wipe.") === 'DELETE') {
                dispatch({ type: 'RESET_DATA' });
                alert("System reset complete.");
            }
        }
    };

    const handleExport = () => {
        const now = new Date().toISOString();
        const stateToExport = { ...state, settings: { ...state.settings, lastBackupDate: now } };
        dispatch({ type: 'UPDATE_SETTINGS', payload: { lastBackupDate: now } });
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stateToExport, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `life_dashboard_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string) as AppState;
                if (!json.settings || !json.accounts) { alert("Invalid system file."); return; }
                const summary = {
                    transactions: json.expenses.length,
                    accounts: json.accounts.length,
                    holdings: json.holdings.length,
                    healthLogs: json.weightEntries.length + json.calorieEntries.length + json.stepEntries.length,
                };
                setImportModal({ isOpen: true, data: json, summary });
            } catch (err) { alert("Failed to parse system file."); }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const confirmImport = (mode: 'MERGE' | 'REPLACE') => {
        if (!importModal?.data) return;
        if (mode === 'REPLACE' && !window.confirm("Overwrite current system?")) return;
        dispatch({ type: mode === 'REPLACE' ? 'LOAD_STATE' : 'MERGE_STATE', payload: importModal.data });
        setImportModal(null);
    };

    // System Status Logic
    const backupDays = state.settings.lastBackupDate ? differenceInDays(new Date(), parseISO(state.settings.lastBackupDate)) : 999;
    const missingTargets = state.savings.filter(s => !s.target || s.target === 0).length;
    const profileComplete = !!(state.settings.name && state.settings.goalWeightKg && state.settings.dailyCalorieTarget);

    return (
        <Container className="space-y-8">
            <div className="flex items-center gap-3 mb-2">
                <Cpu className="text-slate-400" />
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Control Center</h2>
            </div>

            {/* System Status */}
            <Card className="bg-slate-900 text-white border-none shadow-xl">
                 <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">System Status</div>
                 <div className="space-y-3">
                     <div className="flex justify-between items-center">
                         <span className="text-sm font-medium text-slate-300">Profile Configuration</span>
                         {profileComplete ? <span className="text-emerald-400 flex items-center gap-1 text-xs font-bold"><Check size={14} /> Complete</span> : <span className="text-amber-400 text-xs font-bold">Incomplete</span>}
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-sm font-medium text-slate-300">Data Backup</span>
                         {backupDays < 7 
                            ? <span className="text-emerald-400 flex items-center gap-1 text-xs font-bold"><Check size={14} /> Current</span> 
                            : <span className="text-rose-400 text-xs font-bold">{backupDays > 30 ? 'Overdue' : 'Needs Update'}</span>}
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-sm font-medium text-slate-300">Goal Tracking</span>
                         {missingTargets === 0 
                            ? <span className="text-emerald-400 flex items-center gap-1 text-xs font-bold"><Check size={14} /> Optimized</span> 
                            : <span className="text-slate-400 text-xs font-bold">{missingTargets} missing targets</span>}
                     </div>
                 </div>
            </Card>

            {/* Settings Forms */}
            <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <Globe size={18} className="text-blue-600" />
                    <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Global Rules</h3>
                </div>
                <Card className="border-blue-100 bg-blue-50/20 grid grid-cols-2 gap-4">
                        <Input label="Main Currency" value={form.mainCurrency} onChange={e => setForm({...form, mainCurrency: e.target.value})} className="font-mono font-bold uppercase" />
                        <Input label="Inv. Currency" value={form.investmentCurrency} onChange={e => setForm({...form, investmentCurrency: e.target.value})} className="font-mono font-bold uppercase" />
                        <Input type="number" step="0.01" label="Exchange Rate" value={form.exchangeRate} onChange={e => setForm({...form, exchangeRate: Number(e.target.value)})} className="col-span-2 font-bold" />
                </Card>
            </section>

            <section className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                    <Activity size={18} className="text-orange-600" />
                    <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Bio-System</h3>
                </div>
                <Card className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            <Input type="number" label="Start Weight" value={form.startWeightKg} onChange={e => setForm({...form, startWeightKg: Number(e.target.value)})} />
                            <Input type="number" label="Goal Weight" value={form.goalWeightKg || ''} onChange={e => setForm({...form, goalWeightKg: Number(e.target.value)})} />
                            <Input type="date" label="Goal Date" value={form.goalDate || ''} onChange={e => setForm({...form, goalDate: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                            <Input type="number" label="Calorie Target" value={form.dailyCalorieTarget} onChange={e => setForm({...form, dailyCalorieTarget: Number(e.target.value)})} className="text-orange-600 font-bold" />
                            <Input type="number" label="Step Target" value={form.dailyStepTarget} onChange={e => setForm({...form, dailyStepTarget: Number(e.target.value)})} className="text-blue-600 font-bold" />
                        </div>
                </Card>
            </section>

             <Button size="lg" className="w-full shadow-xl" onClick={handleSave}><Save size={18} /> Apply Configuration</Button>

            <section className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 px-1">
                    <HardDrive size={18} className="text-slate-600" />
                    <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">Data Vault</h3>
                </div>
                <Card className="bg-slate-50 border-slate-200">
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={handleExport} className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-400 transition-all group">
                            <Download size={24} className="text-slate-400 group-hover:text-blue-600 mb-2 transition-colors" />
                            <span className="font-bold text-sm text-slate-700">Backup</span>
                        </button>
                        <div className="relative">
                            <input type="file" accept=".json" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                            <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 rounded-xl h-full hover:border-blue-400 transition-all">
                                <Upload size={24} className="text-slate-400 mb-2" />
                                <span className="font-bold text-sm text-slate-700">Restore</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <Button variant="ghost" className="w-full justify-between border border-slate-200 bg-white" onClick={onOpenHistory}>
                            <span className="flex items-center gap-2 text-slate-600"><HistoryIcon size={16} /> Audit Logs</span>
                            <Badge color="slate">{range.label}</Badge>
                        </Button>
                    </div>
                </Card>
            </section>

            <section className="pt-8 pb-8 text-center">
                 <button onClick={handleReset} className="text-xs font-bold text-rose-400 hover:text-rose-600 flex items-center justify-center gap-2 mx-auto">
                    <AlertOctagon size={14} /> Factory Reset System
                </button>
            </section>

            <Modal isOpen={!!importModal} onClose={() => setImportModal(null)} title="System Restore">
                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm space-y-2">
                         <div className="flex justify-between"><span>Transactions</span> <span className="font-bold">{importModal?.summary?.transactions}</span></div>
                         <div className="flex justify-between"><span>Accounts</span> <span className="font-bold">{importModal?.summary?.accounts}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button variant="outline" onClick={() => confirmImport('MERGE')}>Merge Data</Button>
                        <Button variant="primary" onClick={() => confirmImport('REPLACE')} className="bg-rose-600 hover:bg-rose-700">Replace System</Button>
                    </div>
                </div>
            </Modal>
        </Container>
    );
};

const Main = () => {
  const [activeTab, setActiveTab] = useState<Section>(Section.DASHBOARD);
  const [viewHistory, setViewHistory] = useState(false);
  const now = new Date();
  const [dateRange, setDateRange] = useState<DateRange>({
      preset: 'TODAY',
      start: format(startOfDay(now), 'yyyy-MM-dd'),
      end: format(endOfDay(now), 'yyyy-MM-dd'),
      label: 'Today'
  });

  const renderContent = () => {
    if (viewHistory) return <History range={{...dateRange, preset: 'MONTH', start: format(startOfMonth(now), 'yyyy-MM-dd'), end: format(endOfDay(now), 'yyyy-MM-dd'), label: 'Monthly Summary' }} onBack={() => setViewHistory(false)} />;
    switch (activeTab) {
      case Section.DASHBOARD: return <Dashboard onChangeTab={setActiveTab} range={dateRange} />;
      case Section.CASH: return <Cash range={dateRange} />;
      case Section.INVEST: return <Invest />;
      case Section.HEALTH: return <Health range={dateRange} />;
      case Section.SETTINGS: return <SettingsView onOpenHistory={() => setViewHistory(true)} range={dateRange} />;
      default: return <Dashboard onChangeTab={setActiveTab} range={dateRange} />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={(t) => { setActiveTab(t); setViewHistory(false); }}>
      <div className="animate-in fade-in duration-300">{renderContent()}</div>
    </Layout>
  );
};

export default function App() {
  return <AppProvider><Main /></AppProvider>;
}