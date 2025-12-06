
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Expense, User, Balance } from '../types';

interface ExpenseViewProps {
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  users: User[];
}

const ExpenseView: React.FC<ExpenseViewProps> = ({ expenses, setExpenses, users }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [payerId, setPayerId] = useState(users[0]?.id || '');
  const [currency, setCurrency] = useState<'TWD' | 'CNY'>('CNY');
  const [exchangeRate, setExchangeRate] = useState('4.45');
  const [inputForeignAmount, setInputForeignAmount] = useState('');

  // Swipe Logic
  const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
  const touchStartRef = useRef<number>(0);
  
  // Delete Confirmation State
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);

  // Close swipe when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.expense-item')) {
            setActiveSwipeId(null);
        }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleForeignAmountChange = (val: string) => {
    setInputForeignAmount(val);
    if (!val) { setNewAmount(''); return; }
    setNewAmount((parseFloat(val) * parseFloat(exchangeRate)).toFixed(0));
  };

  const balances: Balance[] = useMemo(() => {
    if (users.length === 0) return [];
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const perPersonShare = totalSpent / users.length;
    const paidMap: Record<string, number> = {};
    users.forEach(u => paidMap[u.id] = 0);
    expenses.forEach(e => paidMap[e.payerId] = (paidMap[e.payerId] || 0) + e.amount);
    return users.map(user => ({ userId: user.id, amount: paidMap[user.id] - perPersonShare })).sort((a, b) => b.amount - a.amount);
  }, [expenses, users]);

  const resetForm = () => {
    setNewDesc(''); 
    setNewAmount(''); 
    setInputForeignAmount(''); 
    setEditingId(null);
    setCurrency('CNY');
    setIsAdding(false);
    if (users.length > 0) setPayerId(users[0].id);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc || !newAmount) return;

    if (editingId) {
        // Update existing
        setExpenses(prev => prev.map(ex => ex.id === editingId ? {
            ...ex,
            description: newDesc,
            amount: parseFloat(newAmount),
            payerId: payerId,
            // Keep original date or update? Let's keep original for now unless logic changes
        } : ex));
    } else {
        // Create new
        setExpenses([{ id: `e${Date.now()}`, description: newDesc, amount: parseFloat(newAmount), payerId, date: new Date().toISOString().split('T')[0] }, ...expenses]);
    }
    resetForm();
  };

  const handleEditClick = (expense: Expense) => {
      setEditingId(expense.id);
      setNewDesc(expense.description);
      setNewAmount(expense.amount.toString());
      setPayerId(expense.payerId);
      setCurrency('TWD'); // Default to TWD for editing simplicity
      setIsAdding(true);
      setActiveSwipeId(null);
  };

  const handleDeleteClick = (id: string) => {
      setDeleteExpenseId(id);
      setActiveSwipeId(null);
  };

  const confirmDelete = () => {
      if (deleteExpenseId) {
          setExpenses(prev => prev.filter(e => e.id !== deleteExpenseId));
          setDeleteExpenseId(null);
      }
  };

  // Touch Handlers for Swipe
  const onTouchStart = (e: React.TouchEvent, id: string) => {
      touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent, id: string) => {
      const endX = e.changedTouches[0].clientX;
      const diff = touchStartRef.current - endX;
      
      if (diff > 50) { // Swipe Left
          setActiveSwipeId(id);
      } else if (diff < -50) { // Swipe Right
          setActiveSwipeId(null);
      }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-40 font-sans no-scrollbar">
      {/* Header Card */}
      <div className="mx-4 mt-2 bg-gradient-to-br from-[#00C6FF] to-[#0072FF] rounded-[2rem] p-6 shadow-2xl shadow-blue-200 text-white relative overflow-hidden shrink-0 z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        <div className="relative z-10">
            <h2 className="text-white/80 text-xs font-bold tracking-widest uppercase mb-1">旅行消費 (TWD)</h2>
            <div className="flex justify-between items-end">
                <p className="text-5xl font-mono font-black tracking-tighter text-white drop-shadow-sm">
                    <span className="text-2xl opacity-70 mr-1">$</span>
                    {expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
                </p>
                <button onClick={() => { resetForm(); setIsAdding(true); }} className="bg-white/90 backdrop-blur text-blue-600 px-5 py-2.5 rounded-full font-bold shadow-lg active:scale-95 transition-all text-sm flex items-center gap-2">
                    <i className="fa-solid fa-plus"></i> 記帳
                </button>
            </div>
        </div>
      </div>

      <div className="px-4 space-y-6 mt-6 pb-32">
        {/* Balances Section */}
        <div className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100">
          <h3 className="text-gray-400 font-bold mb-4 text-xs uppercase tracking-wider flex items-center gap-2"><i className="fa-solid fa-scale-balanced"></i> 分帳狀態</h3>
          <div className="space-y-4">
            {balances.map(b => {
              const user = users.find(u => u.id === b.userId);
              const isOwed = b.amount >= 0;
              return (
                <div key={b.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={user?.avatar} alt={user?.name} className="w-10 h-10 rounded-full border border-gray-100 bg-gray-100" />
                    <span className="font-bold text-gray-800">{user?.name}</span>
                  </div>
                  <div className="text-right">
                     <span className={`block font-mono font-black text-lg ${isOwed ? 'text-green-500' : 'text-red-500'}`}>{isOwed ? '+' : ''}{b.amount.toFixed(0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expenses List */}
        <div>
          <h3 className="text-gray-400 font-bold mb-3 text-xs uppercase tracking-wider px-2">最近消費</h3>
          <div className="space-y-3">
            {expenses.map(expense => {
              const payer = users.find(u => u.id === expense.payerId);
              const isSwiped = activeSwipeId === expense.id;

              return (
                <div 
                    key={expense.id} 
                    className="relative group expense-item h-20 w-full bg-white rounded-2xl shadow-sm border border-gray-50 overflow-hidden"
                    onTouchStart={(e) => onTouchStart(e, expense.id)}
                    onTouchEnd={(e) => onTouchEnd(e, expense.id)}
                    onClick={() => { if(!isSwiped) setActiveSwipeId(expense.id); else setActiveSwipeId(null); }}
                >
                  {/* Left Side: Fixed Content (Icon + Desc + Avatar) */}
                  <div className="absolute left-4 top-0 bottom-0 flex items-center gap-4 z-20 pointer-events-none">
                      <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
                          <i className="fa-solid fa-receipt"></i>
                      </div>
                      <div className="min-w-0 max-w-[140px] sm:max-w-[200px]">
                        <p className="font-bold text-black text-sm truncate">{expense.description}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5 flex items-center gap-1">
                            <img src={payer?.avatar} className="w-3 h-3 rounded-full" alt=""/>
                            {payer?.name}
                        </p>
                      </div>
                  </div>

                  {/* Right Side: Sliding Content (Amount + Date) */}
                  <div className={`absolute right-4 top-0 bottom-0 flex flex-col justify-center text-right z-20 transition-transform duration-300 ease-out pointer-events-none ${isSwiped ? '-translate-x-28' : 'translate-x-0'}`}>
                      <p className="font-black text-black font-mono text-lg">${expense.amount}</p>
                      <p className="text-[10px] text-gray-300">{expense.date.slice(5)}</p>
                  </div>

                  {/* Actions Layer: Slide In from Right */}
                  <div className={`absolute top-0 right-0 bottom-0 w-28 bg-gray-100 flex items-center justify-center gap-3 transition-transform duration-300 ease-out z-30 ${isSwiped ? 'translate-x-0' : 'translate-x-full'}`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditClick(expense); }}
                        className="w-10 h-10 rounded-full bg-white text-gray-600 flex items-center justify-center shadow-sm active:scale-90 transition-transform hover:text-blue-600"
                      >
                          <i className="fa-solid fa-pen"></i>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(expense.id); }}
                        className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform hover:bg-red-600"
                      >
                          <i className="fa-solid fa-trash-can"></i>
                      </button>
                  </div>

                  {/* Visual Hint for Desktop Hover */}
                  <div className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center md:flex hidden pointer-events-none z-40`}>
                       <i className="fa-solid fa-chevron-left text-gray-300 text-[10px]"></i>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm animate-fade-in">
          <form onSubmit={handleSaveExpense} className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl p-8 animate-slide-up shadow-2xl">
            <h3 className="text-2xl font-black mb-6 text-black">{editingId ? '編輯消費' : '記一筆'}</h3>
            <div className="space-y-6">
              <div className="flex bg-gray-100 p-1 rounded-2xl">
                 <button type="button" onClick={() => setCurrency('TWD')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${currency === 'TWD' ? 'bg-white shadow text-black' : 'text-gray-400'}`}>TWD</button>
                 <button type="button" onClick={() => setCurrency('CNY')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${currency === 'CNY' ? 'bg-white shadow text-black' : 'text-gray-400'}`}>CNY</button>
              </div>
              {currency === 'CNY' ? (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-2xl"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">人民幣</label><div className="flex items-baseline"><span className="text-lg text-gray-400 font-bold mr-1">¥</span><input type="number" value={inputForeignAmount} onChange={e => handleForeignAmountChange(e.target.value)} className="w-full text-2xl font-bold bg-transparent outline-none text-black font-mono" placeholder="0" autoFocus={!editingId} /></div></div>
                    <div className="bg-gray-50 p-3 rounded-2xl"><label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">匯率</label><input type="number" step="0.01" value={exchangeRate} onChange={e => setExchangeRate(e.target.value)} className="w-full text-xl font-bold bg-transparent outline-none text-gray-600 font-mono" /></div>
                    <div className="col-span-2 bg-blue-50 p-4 rounded-2xl flex justify-between items-center"><span className="text-xs text-blue-500 font-bold">折合台幣</span><span className="text-2xl font-mono font-black text-blue-600">${newAmount || 0}</span></div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-2xl"><label className="block text-xs font-bold text-gray-400 uppercase mb-1">金額 (TWD)</label><div className="flex items-baseline"><span className="text-2xl text-gray-400 font-bold mr-2">$</span><input type="number" step="1" required value={newAmount} onChange={e => setNewAmount(e.target.value)} className="w-full text-4xl font-black bg-transparent outline-none text-black placeholder-gray-200 font-mono" placeholder="0" autoFocus={!editingId} /></div></div>
              )}
              <div className="bg-gray-50 p-4 rounded-2xl"><label className="block text-xs font-bold text-gray-400 uppercase mb-2">消費項目</label><input type="text" required value={newDesc} onChange={e => setNewDesc(e.target.value)} className="w-full bg-transparent outline-none text-lg font-bold text-black placeholder-gray-300" placeholder="例如：晚餐..." /></div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-3 px-1">誰付的錢？</label>
                {/* Fixed clipping issue by adding padding instead of bottom-only padding */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar p-2">
                  {users.map(user => (
                    <button key={user.id} type="button" onClick={() => setPayerId(user.id)} className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all w-20 shrink-0 ${payerId === user.id ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md transform scale-105' : 'bg-white border-transparent text-gray-400 opacity-60 grayscale'}`}><img src={user.avatar} className="w-8 h-8 rounded-full bg-gray-100" alt="" /><span className="text-[10px] font-bold truncate w-full text-center">{user.name}</span></button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
               <button type="button" onClick={resetForm} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold text-gray-500 hover:bg-gray-200">取消</button>
              <button type="submit" className="flex-1 py-4 bg-black rounded-2xl font-bold text-white shadow-xl hover:bg-gray-800">{editingId ? '更新' : '確認新增'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteExpenseId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-2xl max-w-xs w-full text-center border border-white/50 animate-scale-up">
                <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i className="fa-solid fa-triangle-exclamation text-xl"></i>
                </div>
                <h3 className="text-lg font-black text-black mb-2">確認刪除？</h3>
                <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">此動作無法復原，您確定要刪除這筆消費嗎？</p>
                <div className="flex gap-3">
                   <button 
                       onClick={() => setDeleteExpenseId(null)} 
                       className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold text-gray-600 transition-colors"
                    >
                       取消
                   </button>
                   <button 
                       onClick={confirmDelete} 
                       className="flex-1 py-3 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-white shadow-lg shadow-red-200 transition-colors"
                    >
                       刪除
                   </button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};
export default ExpenseView;
