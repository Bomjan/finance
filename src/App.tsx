import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Wallet, Plus, Download, Eye, EyeOff, Trash2, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import html2pdf from 'html2pdf.js';

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

const CATEGORIES = ['Needs', 'Wants', 'Savings'] as const;
const COLORS = ['#2563eb', '#f59e0b', '#10b981']; // Blue, Amber, Emerald

const DEFAULT_SPLIT: Split = { needs: 50, wants: 30, savings: 20 };

export default function App() {
  // State
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

  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Expense Form State
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<'Needs' | 'Wants' | 'Savings'>('Needs');

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

  const chartData = [
    { name: 'Needs', value: allocated.Needs - spent.Needs > 0 ? allocated.Needs - spent.Needs : 0 },
    { name: 'Wants', value: allocated.Wants - spent.Wants > 0 ? allocated.Wants - spent.Wants : 0 },
    { name: 'Savings', value: allocated.Savings - spent.Savings > 0 ? allocated.Savings - spent.Savings : 0 },
    { name: 'Spent (Needs)', value: spent.Needs },
    { name: 'Spent (Wants)', value: spent.Wants },
    { name: 'Spent (Savings)', value: spent.Savings },
  ];

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
      id: crypto.randomUUID(),
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

  const setPresetSplit = (needs: number, wants: number, savings: number) => {
    setSplit({ needs, wants, savings });
  };

  const exportPDF = () => {
    if (!reportRef.current) return;
    setIsPrivacyMode(false); // Ensure numbers are visible in export
    
    setTimeout(() => {
      const element = reportRef.current;
      const opt = {
        margin:       10,
        filename:     `Budget_Report_${new Date().toISOString().split('T')[0]}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).html2pdf().set(opt).from(element).save();
    }, 100);
  };

  const formatCurrency = (amount: number) => {
    if (isPrivacyMode) return '****';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const calculateProgress = (spentAmt: number, allocatedAmt: number) => {
    if (allocatedAmt === 0) return 0;
    return Math.min((spentAmt / allocatedAmt) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans py-6 sm:py-8 flex flex-col selection:bg-blue-200">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600 inline sm:hidden" />
            Finance<span className="text-blue-600">Flow</span>
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

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-6 flex-grow" ref={reportRef}>
        
        {/* Top Section: Salary & Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="glass-card p-6 rounded-2xl lg:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end mb-6 gap-4">
              <div className="w-full sm:w-1/2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Monthly Salary</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 font-bold">$</span>
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
                   onChange={(e) => {
                     const val = Number(e.target.value);
                     const diff = val - split.needs;
                     setSplit({ needs: val, wants: Math.max(0, split.wants - diff/2), savings: Math.max(0, split.savings - diff/2) });
                   }}
                   className="w-full accent-blue-600" />
               </div>

               <div className="flex flex-col gap-1">
                 <div className="flex justify-between text-xs font-medium">
                   <span className="text-amber-500 font-bold">Wants ({split.wants.toFixed(0)}%)</span>
                   <span className="text-slate-600 font-bold hover:blur-none transition-all">{formatCurrency(allocated.Wants)}</span>
                 </div>
                 <input type="range" min="0" max="100" value={split.wants} 
                   onChange={(e) => {
                     const val = Number(e.target.value);
                     const diff = val - split.wants;
                     setSplit({ ...split, wants: val, savings: Math.max(0, 100 - split.needs - val) });
                   }}
                   className="w-full accent-amber-500" />
               </div>

               <div className="flex flex-col gap-1">
                 <div className="flex justify-between text-xs font-medium">
                   <span className="text-emerald-500 font-bold">Savings ({split.savings.toFixed(0)}%)</span>
                   <span className="text-slate-600 font-bold hover:blur-none transition-all">{formatCurrency(allocated.Savings)}</span>
                 </div>
                 <input type="range" min="0" max="100" value={split.savings} 
                   onChange={(e) => {
                     const val = Number(e.target.value);
                     setSplit({ ...split, savings: val, wants: Math.max(0, 100 - split.needs - val) });
                   }}
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

        {/* Bottom Section: Add Expense & List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Add Expense Form */}
          <section className="glass-card p-6 rounded-2xl h-[fit-content]" data-html2canvas-ignore="true">
             <h3 className="text-sm font-bold text-slate-800 mb-4">Add Expense</h3>
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
                      <span className="text-slate-400 font-bold">$</span>
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
      </main>

      {/* Global styles for custom scrollbar within this component just for safety */}
      <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(226, 232, 240, 1);
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
        .privacy-blur {
          filter: blur(8px);
          transition: filter 0.3s ease;
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
