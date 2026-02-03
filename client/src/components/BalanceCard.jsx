import React from 'react';
import GlassCard from './GlassCard';

const BalanceCard = ({ user }) => {
    const isOwed = parseFloat(user.balance) > 0;
    const isDebt = parseFloat(user.balance) < 0;
    const amount = Math.abs(parseFloat(user.balance)).toFixed(2);

    return (
        <GlassCard className="transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-3">
                    {/* Conditional rendering for avatar or initial */}
                    {user.avatar ? (
                        <img src={`/src/assets/avatars/${user.avatar}`} className="w-10 h-10 rounded-full shadow-md" alt={user.name} />
                    ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md ${isOwed ? 'bg-emerald-500 shadow-emerald-200' : isDebt ? 'bg-rose-500 shadow-rose-200' : 'bg-slate-400'}`}>
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg">{user.name}</h3>
                        <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className={`text-lg font-extrabold ${isOwed ? 'text-emerald-600' : isDebt ? 'text-rose-600' : 'text-slate-400'}`}>
                        {isOwed ? '+' : isDebt ? '-' : ''}${amount}
                    </p>
                    <p className="text-[10px] uppercase font-bold tracking-wide text-slate-400">
                        {isOwed ? 'is owed' : isDebt ? 'owes' : 'settled'}
                    </p>
                </div>
            </div>
        </GlassCard>
    );
};

export default BalanceCard;
