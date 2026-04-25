import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Wallet, Plus, Download, Eye, EyeOff, Trash2, TrendingUp, TrendingDown, DollarSign, Home, List as ListIcon, Settings as SettingsIcon, Upload, FileJson, Gift } from 'lucide-react';
import html2pdf from 'html2pdf.js';

type Tab = 'dashboard' | 'transactions' | 'wishlist' | 'settings';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: 'Needs' | 'Wants' | 'Savings';
  date: string;
}

interface Split {
  needs: number;
  wants: number;
  savings: number;
}

interface WishlistItem {
  id: string;
  title: string;
  targetAmount: number;
  targetDate: string;
}

const CATEGORIES = ['Needs', 'Wants', 'Savings'] as const;
const COLORS = ['#2563eb', '#f59e0b', '#10b981']; // Blue, Amber, Emerald

const DEFAULT_SPLIT: Split = { needs: 50, wants: 30, savings: 20 };

export default function App() {
  // State
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  
  const [salary, setSalary] = useState<number>(() => {
    const saved = localStorage.getItem('budget_salary');
    return saved ? parseFloat(saved) : 0;
  });
  
  const [split, setSplit] = useState<Split>(() => {
    const saved = localStorage.getItem('budget_split');
    return saved ? JSON.parse(saved) : DEFAULT_SPLIT;
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem('budget_expenses');
    return saved ? JSON.parse(saved) : [];
  });

  const [wishlist, setWishlist] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('budget_wishlist');
    return saved ? JSON.parse(saved) : [];
  });

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expense Form State
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'Needs' | 'Wants' | 'Savings'>('Needs');

  // Wishlist Form State
  const [wishlistTitle, setWishlistTitle] = useState('');
  const [wishlistAmount, setWishlistAmount] = useState('');
  const [wishlistDate, setWishlistDate] = useState('');

  // Side Effects
  useEffect(() => {
    localStorage.setItem('budget_salary', salary.toString());
  }, [salary]);

  useEffect(() => {
    localStorage.setItem('budget_split', JSON.stringify(split));
  }, [split]);

  useEffect(() => {
    localStorage.setItem('budget_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('budget_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Derived State
  const allocated = useMemo(() => ({
    Needs: (salary * split.needs) / 100,
    Wants: (salary * split.wants) / 100,
    Savings: (salary * split.savings) / 100,
  }), [salary, split]);

  const spent = useMemo(() => {
    const sp = { Needs: 0, Wants: 0, Savings: 0 };
    expenses.forEach(e => {
      sp[e.category] += e.amount;
    });
    return sp;
  }, [expenses]);

  const totalSpent = spent.Needs + spent.Wants + spent.Savings;

  const simpleChartData = [
    { name: 'Needs', value: allocated.Needs },
    { name: 'Wants', value: allocated.Wants },
    { name: 'Savings', value: allocated.Savings },
  ];

  // Actions
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount || isNaN(Number(expenseAmount))) return;
    
    const newExpense: Expense = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      title: expenseTitle,
      amount: parseFloat(expenseAmount),
      category: expenseCategory,
      date: new Date().toISOString(),
    };

    setExpenses(prev => [newExpense, ...prev]);
    setExpenseTitle('');
    setExpenseAmount('');
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleAddWishlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishlistTitle.trim() || !wishlistAmount || isNaN(Number(wishlistAmount)) || !wishlistDate) return;
    
    const newItem: WishlistItem = {
      id: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Date.now().toString(36),
      title: wishlistTitle,
      targetAmount: parseFloat(wishlistAmount),
      targetDate: wishlistDate,
    };

    setWishlist(prev => [...prev, newItem]);
    setWishlistTitle('');
    setWishlistAmount('');
    setWishlistDate('');
  };

  const handleDeleteWishlist = (id: string) => {
    setWishlist(prev => prev.filter(e => e.id !== id));
  };

  const setPresetSplit = (needs: number, wants: number, savings: number) => {
    setSplit({ needs, wants, savings });
  };

  const handleSplitChange = (category: 'needs' | 'wants' | 'savings', value: number) => {
    const val = Math.min(100, Math.max(0, value));
    const remaining = 100 - val;
    
    if (category === 'needs') {
      const othersTotal = split.wants + split.savings;
      const w = othersTotal === 0 ? Math.round(remaining / 2) : Math.round((split.wants / othersTotal) * remaining);
      const s = remaining - w;
      setSplit({ needs: val, wants: w, savings: s });
    } else if (category === 'wants') {
      const othersTotal = split.needs + split.savings;
      const n = othersTotal === 0 ? Math.round(remaining / 2) : Math.round((split.needs / othersTotal) * remaining);
      const s = remaining - n;
      setSplit({ needs: n, wants: val, savings: s });
    } else {
      const othersTotal = split.needs + split.wants;
      const n = othersTotal === 0 ? Math.round(remaining / 2) : Math.round((split.needs / othersTotal) * remaining);
      const w = remaining - n;
      setSplit({ needs: n, wants: w, savings: val });
    }
  };

  const exportPDF = () => {
    if (!reportRef.current) return;
    setIsPrivacyMode(false); // Ensure numbers are visible in export
    setIsPrinting(true);
    
    setTimeout(() => {
      if (!reportRef.current) {
        setIsPrinting(false);
        return;
      }
      const element = reportRef.current;
      const opt = {
        margin:       10,
        filename:     `VaultFlow_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };
      html2pdf().set(opt).from(element).save().then(() => setIsPrinting(false)).catch((e: any) => {
        console.error("PDF Export failed", e);
        setIsPrinting(false);
      });
    }, 800); // 800ms gives enough time for DOM to re-render and animations to stop
  };

  const exportJSON = () => {
    const data = { salary, split, expenses, wishlist };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `VaultFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.salary !== undefined) setSalary(data.salary);
        if (data.split) setSplit(data.split);
        if (data.expenses) setExpenses(data.expenses);
        if (data.wishlist) setWishlist(data.wishlist);
        alert('Data import successful!');
      } catch (err) {
        alert('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatCurrency = (amount: number) => {
    if (isPrivacyMode) return '****';
    return `Nu. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateProgress = (spentAmt: number, allocatedAmt: number) => {
    if (allocatedAmt === 0) return 0;
    return Math.min((spentAmt / allocatedAmt) * 100, 100);
  };

  const calculateMonthsUntil = (targetDateStr: string) => {
    const [year, month] = targetDateStr.split('-').map(Number);
    const now = new Date();
    const months = (year - now.getFullYear()) * 12 + ((month - 1) - now.getMonth());
    return Math.max(1, months); // At least 1 month
  };

  const formatMonthYear = (targetDateStr: string) => {
    const [year, month] = targetDateStr.split('-').map(Number);
    const date = new Date(year, month - 1);
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 font-sans py-6 sm:py-8 flex flex-col selection:bg-blue-200">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600 inline sm:hidden" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-emerald-500">VaultFlow</span>
          </h1>
          <p className="text-sm text-slate-500 font-medium">Monthly Budget Breakdown</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => setIsPrivacyMode(!isPrivacyMode)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
            title="Toggle Privacy Mode"
          >
            {isPrivacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">Privacy Mode</span>
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm whitespace-nowrap"
          >
            <Download className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">Export PDF Report</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </header>

      <main className={`max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6 flex-grow pb-24 sm:pb-8 ${isPrinting ? 'print-mode' : ''}`} ref={reportRef}>
        
        {/* Print Header */}
        <div className={`${isPrinting ? 'block' : 'hidden'} mb-8 text-center text-slate-800`}>
           <h1 className="text-2xl font-bold flex justify-center items-center gap-2"><Wallet className="w-6 h-6 text-blue-600" /> VaultFlow Report</h1>
           <p className="text-sm text-slate-500 mt-2">Generated on {new Date().toLocaleDateString()}</p>
        </div>

        {/* Dashboard Tab */}
        <div className={`${isPrinting || activeTab === 'dashboard' ? 'block' : 'hidden'} sm:block space-y-6`}>
          {/* Top Section: Salary & Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="glass-card p-6 rounded-2xl lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 gap-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Salary</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold text-xs uppercase pt-1">Nu.</span>
                  </div>
                  <input
                    type="number"
                    value={salary || ''}
                    onChange={(e) => setSalary(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-slate-100 border-none rounded-xl text-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2 w-full sm:w-1/2 mt-4 sm:mt-0">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Split Strategy</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setPresetSplit(50, 30, 20)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${split.needs === 50 && split.wants === 30 ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    50/30/20
                  </button>
                  <button 
                    onClick={() => setPresetSplit(70, 20, 10)}
                    className={`py-2 px-4 rounded-lg text-xs font-bold transition-all ${split.needs === 70 && split.wants === 20 ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    70/20/10
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Sliders for Split */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
               <div className="flex flex-col gap-1">
                 <div className="flex justify-between text-xs font-medium">
                   <span className="text-blue-600 font-bold">Needs ({split.needs}%)</span>
                   <span className="text-slate-600 font-bold hover:blur-none transition-all">{formatCurrency(allocated.Needs)}</span>
                 </div>
                 <input type="range" min="0" max="100" value={split.needs} 
                   onChange={(e) => handleSplitChange('needs', Number(e.target.value))}
                   className="w-full accent-blue-600" />
               </div>

               <div className="flex flex-col gap-1">
                 <div className="flex justify-between text-xs font-medium">
                   <span className="text-amber-500 font-bold">Wants ({split.wants.toFixed(0)}%)</span>
                   <span className="text-slate-600 font-bold hover:blur-none transition-all">{formatCurrency(allocated.Wants)}</span>
                 </div>
                 <input type="range" min="0" max="100" value={split.wants} 
                   onChange={(e) => handleSplitChange('wants', Number(e.target.value))}
                   className="w-full accent-amber-500" />
               </div>

               <div className="flex flex-col gap-1">
                 <div className="flex justify-between text-xs font-medium">
                   <span className="text-emerald-500 font-bold">Savings ({split.savings.toFixed(0)}%)</span>
                   <span className="text-slate-600 font-bold hover:blur-none transition-all">{formatCurrency(allocated.Savings)}</span>
                 </div>
                 <input type="range" min="0" max="100" value={split.savings} 
                   onChange={(e) => handleSplitChange('savings', Number(e.target.value))}
                   className="w-full accent-emerald-500" />
               </div>
            </div>
            
            {/* Display total percentage validation if not 100 */}
            {(split.needs + split.wants + split.savings) !== 100 && (
              <div className="mt-4 text-xs text-red-500 text-center font-bold">
                Total split must equal 100% (Current: {Math.round(split.needs + split.wants + split.savings)}%)
              </div>
            )}
          </section>

          <section className="glass-card p-6 rounded-2xl flex flex-col justify-center items-center relative">
             <h3 className="absolute top-6 left-6 text-sm font-bold text-slate-800 tracking-wider text-left">Budget Allocation</h3>
             <div className="h-48 w-full max-w-[200px] mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={simpleChartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    isAnimationActive={!isPrinting}
                  >
                    {simpleChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
             </div>
             <div className="flex gap-4 mt-2 mb-2 w-full justify-center">
               <div className="text-center">
                 <div className="w-2 h-2 rounded-full bg-blue-600 mx-auto mb-1"></div>
                 <div className="text-[10px] font-bold text-slate-400">NEEDS</div>
               </div>
               <div className="text-center">
                 <div className="w-2 h-2 rounded-full bg-amber-500 mx-auto mb-1"></div>
                 <div className="text-[10px] font-bold text-slate-400">WANTS</div>
               </div>
               <div className="text-center">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto mb-1"></div>
                 <div className="text-[10px] font-bold text-slate-400">SAVINGS</div>
               </div>
             </div>
             <div className="w-full border-t border-slate-100 pt-4 mt-2">
                 <div className="flex justify-between text-xs font-bold mb-2">
                    <span className="text-slate-500 uppercase">Remaining Total:</span>
                    <span className="text-slate-800 tracking-tight hover:blur-none transition-all">{formatCurrency(salary - totalSpent)}</span>
                 </div>
             </div>
          </section>
        </div>

        {/* Middle Section: Progress Bars */}
        <section className="glass-card p-6 rounded-2xl flex flex-col justify-between">
           <h3 className="text-sm font-bold text-slate-800 tracking-wider mb-6">Category Progress</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-12">
             
             {/* Needs Progress */}
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold mb-2">
                   <span className="text-slate-500 uppercase">NEEDS</span>
                   <span className="text-slate-800 tracking-tight hover:blur-none transition-all">{formatCurrency(spent.Needs)} / {formatCurrency(allocated.Needs)}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`progress-bar-fill ${spent.Needs > allocated.Needs ? 'bg-red-500' : 'bg-blue-600'}`}
                    style={{ width: `${calculateProgress(spent.Needs, allocated.Needs)}%` }}
                  ></div>
                </div>
                {spent.Needs > allocated.Needs && (
                  <p className="text-xs text-red-500 mt-1 font-medium text-right">Over budget!</p>
                )}
             </div>

             {/* Wants Progress */}
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold mb-2">
                   <span className="text-slate-500 uppercase">WANTS</span>
                   <span className="text-slate-800 tracking-tight hover:blur-none transition-all">{formatCurrency(spent.Wants)} / {formatCurrency(allocated.Wants)}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`progress-bar-fill ${spent.Wants > allocated.Wants ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${calculateProgress(spent.Wants, allocated.Wants)}%` }}
                  ></div>
                </div>
                {spent.Wants > allocated.Wants && (
                  <p className="text-xs text-red-500 mt-1 font-medium text-right">Over budget!</p>
                )}
             </div>

             {/* Savings Progress */}
             <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold mb-2">
                   <span className="text-slate-500 uppercase">{spent.Savings >= allocated.Savings && allocated.Savings > 0 ? 'SAVINGS (GOAL REACHED)' : 'SAVINGS'}</span>
                   <span className={`tracking-tight hover:blur-none transition-all ${spent.Savings >= allocated.Savings && allocated.Savings > 0 ? 'text-emerald-600' : 'text-slate-800'}`}>{formatCurrency(spent.Savings)} / {formatCurrency(allocated.Savings)}</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`progress-bar-fill ${spent.Savings > allocated.Savings ? 'bg-emerald-600' : 'bg-emerald-500'}`}
                    style={{ width: `${calculateProgress(spent.Savings, allocated.Savings)}%` }}
                  ></div>
                </div>
             </div>

           </div>
        </section>
        </div> {/* End Dashboard Tab */}

        {/* Transactions Tab */}
        <div className={`${isPrinting || activeTab === 'transactions' ? 'block' : 'hidden'} sm:block space-y-6`}>
        {/* Bottom Section: Add Expense & List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add Expense Form */}
          <section className="glass-card p-6 rounded-2xl h-[fit-content]" data-html2canvas-ignore="true">
             <h3 className="text-sm font-bold text-slate-800 mb-4">Track Spending</h3>
             <form onSubmit={handleAddExpense} className="space-y-4">
                <div>
                  <input
                    type="text"
                    required
                    value={expenseTitle}
                    onChange={(e) => setExpenseTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                    placeholder="Expense title..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <div className="relative w-full sm:w-2/3">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400 font-bold text-xs">Nu.</span>
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      placeholder="0.00"
                    />
                  </div>
                  <select
                     value={expenseCategory}
                     onChange={(e) => setExpenseCategory(e.target.value as any)}
                     className="w-full sm:w-1/3 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors"
                >
                  Add Transaction
                </button>
             </form>
          </section>

          {/* Expense List */}
          <section className="glass-card rounded-2xl overflow-hidden flex flex-col lg:col-span-2">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm">
              <h3 className="text-sm font-bold text-slate-800">Recent Expenses</h3>
              <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold uppercase">{expenses.length} Transactions</span>
            </div>
            
            <div className="flex-grow overflow-auto min-h-[300px] max-h-[400px] custom-scrollbar bg-white/30">
              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Wallet className="w-12 h-12 mb-4 opacity-30" />
                  <p className="text-sm font-medium">No expenses yet. Start tracking!</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white/90 backdrop-blur z-10">
                    <tr>
                      <th className="px-4 sm:px-6 py-3">Title</th>
                      <th className="px-4 sm:px-6 py-3 hidden sm:table-cell">Category</th>
                      <th className="px-4 sm:px-6 py-3 hidden md:table-cell">Date</th>
                      <th className="px-4 sm:px-6 py-3 text-right">Amount</th>
                      <th className="px-2 py-3 w-10 sm:w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {expenses.map(expense => (
                      <tr key={expense.id} className="border-b border-slate-50 hover:bg-white/50 transition-colors group">
                        <td className="px-4 sm:px-6 py-3 font-semibold text-slate-800 max-w-[140px] truncate sm:max-w-none">
                          {expense.title}
                          <div className="block sm:hidden mt-0.5 text-[10px] text-slate-400">{expense.category}</div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 hidden sm:table-cell">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            expense.category === 'Needs' ? 'bg-blue-50 text-blue-600' :
                            expense.category === 'Wants' ? 'bg-amber-50 text-amber-600' :
                            'bg-emerald-50 text-emerald-600'
                          }`}>
                            {expense.category}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 text-slate-400 hidden md:table-cell">{new Date(expense.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric'})}</td>
                        <td className="px-4 sm:px-6 py-3 text-right font-bold text-slate-800 hover:blur-none transition-all whitespace-nowrap">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-2 py-3">
                           <button
                             onClick={() => handleDeleteExpense(expense.id)}
                             className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                             title="Delete expense"
                             data-html2canvas-ignore="true"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

        </div>
        </div>

        {/* Wishlist Tab */}
        <div className={`${!isPrinting && activeTab === 'wishlist' ? 'block' : 'hidden'} sm:block space-y-6`}>
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <section className="glass-card p-6 rounded-2xl h-[fit-content]" data-html2canvas-ignore="true">
               <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><Gift className="w-5 h-5 text-purple-500" /> New Wishlist Item</h3>
               <form onSubmit={handleAddWishlist} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      required
                      value={wishlistTitle}
                      onChange={(e) => setWishlistTitle(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                      placeholder="e.g. Vacation Fund"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <div className="relative w-full sm:w-1/2">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-400 font-bold text-xs">Nu.</span>
                      </div>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={wishlistAmount}
                        onChange={(e) => setWishlistAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="w-full sm:w-1/2">
                      <input
                        type="month"
                        required
                        value={wishlistDate}
                        onChange={(e) => setWishlistDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm cursor-pointer focus:ring-2 focus:ring-purple-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm font-bold hover:bg-purple-100 transition-colors"
                  >
                    Add to Wishlist
                  </button>
               </form>
             </section>

             <section className="glass-card p-6 rounded-2xl lg:col-span-2 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-800">Your Goals</h3>
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-bold uppercase">{wishlist.length} Items</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-max overflow-y-auto min-h-[300px] max-h-[400px] custom-scrollbar pr-2">
                   {wishlist.length === 0 ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-12 text-slate-400">
                        <Gift className="w-12 h-12 mb-4 opacity-30" />
                        <p className="text-sm font-medium">No wishes yet. Dream big!</p>
                      </div>
                   ) : (
                     wishlist.map(item => {
                       const monthsLeft = calculateMonthsUntil(item.targetDate);
                       const savePerMonth = item.targetAmount / monthsLeft;
                       return (
                         <div key={item.id} className="p-4 border border-slate-100 rounded-xl bg-white/50 hover:bg-white/80 transition-colors group relative">
                           <button
                              onClick={() => handleDeleteWishlist(item.id)}
                              className="absolute top-4 right-4 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 bg-white"
                              data-html2canvas-ignore="true"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                           <h4 className="font-bold text-slate-800 mb-1 pr-8">{item.title}</h4>
                           <div className="text-2xl font-bold tracking-tight text-purple-600 mb-4 hover:blur-none transition-all">{formatCurrency(item.targetAmount)}</div>
                           
                           <div className="space-y-2 text-xs font-medium border-t border-slate-100 pt-3 mt-3">
                             <div className="flex justify-between">
                               <span className="text-slate-500">Target Date:</span>
                               <span className="text-slate-700">{formatMonthYear(item.targetDate)}</span>
                             </div>
                             <div className="flex justify-between">
                               <span className="text-slate-500">Time Left:</span>
                               <span className="text-slate-700">{monthsLeft} month{monthsLeft !== 1 ? 's' : ''}</span>
                             </div>
                             <div className="flex justify-between bg-slate-100 p-2 rounded-lg mt-2">
                               <span className="text-slate-700 font-bold">Save per month:</span>
                               <span className="text-purple-700 font-bold tracking-tight">{formatCurrency(savePerMonth)}</span>
                             </div>
                           </div>
                         </div>
                       );
                     })
                   )}
                </div>
             </section>
           </div>
        </div>

        {/* Settings Tab (Mobile Only typically, but also available on desktop if active) */}
        <div className={`${!isPrinting && activeTab === 'settings' ? 'block' : 'hidden'} sm:hidden space-y-6`}>
          <section className="glass-card p-6 rounded-2xl flex flex-col gap-4">
             <h3 className="text-sm font-bold text-slate-800 mb-2">App Settings</h3>
             
             <button
               onClick={() => setIsPrivacyMode(!isPrivacyMode)}
               className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl"
             >
               <div className="flex items-center gap-3 text-slate-700">
                 {isPrivacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                 <span className="font-semibold text-sm">Privacy Mode</span>
               </div>
               <span className="text-xs text-slate-400 font-bold uppercase">{isPrivacyMode ? 'On' : 'Off'}</span>
             </button>

             <button
               onClick={exportPDF}
               className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm"
             >
               <Download className="w-5 h-5 text-blue-600" />
               Export PDF Report
             </button>

             <button
               onClick={exportJSON}
               className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm"
             >
               <FileJson className="w-5 h-5 text-emerald-600" />
               Backup Data (JSON)
             </button>

             <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold text-sm cursor-pointer">
               <Upload className="w-5 h-5 text-amber-600" />
               Restore Data (JSON)
               <input type="file" accept=".json" onChange={importJSON} className="hidden" ref={fileInputRef} />
             </label>
          </section>
        </div>
      </main>

      {/* Mobile Bottom Dock */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 px-2 py-3 flex justify-around items-center z-50 pb-safe shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)]">
        <button onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); setActiveTab('dashboard'); }} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400'}`}>
          <Home className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Home</span>
        </button>
        <button onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); setActiveTab('transactions'); }} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'transactions' ? 'text-blue-600' : 'text-slate-400'}`}>
          <ListIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Ledger</span>
        </button>
        <button onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); setActiveTab('wishlist'); }} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'wishlist' ? 'text-purple-600' : 'text-slate-400'}`}>
          <Gift className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Wishlist</span>
        </button>
        <button onClick={() => { window.scrollTo({top: 0, behavior: 'smooth'}); setActiveTab('settings'); }} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'}`}>
          <SettingsIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase">Menu</span>
        </button>
      </nav>

      {/* Global styles for custom scrollbar within this component just for safety */}
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 1);
          box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.03), 0 8px 10px -6px rgb(0 0 0 / 0.02);
        }
        .print-mode .glass-card {
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          background: #ffffff !important;
          box-shadow: none !important;
          border: 1px solid #e2e8f0 !important;
        }
        .print-mode .custom-scrollbar {
          overflow: visible !important;
          max-height: none !important;
        }
        .progress-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s ease;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
