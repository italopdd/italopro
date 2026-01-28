
import React from 'react';
import { useNavigate } from 'react-router-dom';

const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

  return (
    <div className="min-h-screen bg-[#050806] text-white p-6 pb-24">
        {/* Header (Sem Seta) */}
        <div className="flex justify-between items-center mb-8 relative">
            <div className="flex items-center gap-2">
                <div>
                    <h1 className="text-2xl font-serif text-[#C5A059]">Olá, {user.name?.split(' ')[0]}</h1>
                    <p className="text-xs text-gray-500">Painel Profissional</p>
                </div>
            </div>
            <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} className="w-10 h-10 rounded-full border border-[#C5A059]" />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-[#1A1E1A] p-4 rounded-xl border border-white/5">
                <span className="material-symbols-outlined text-[#C5A059] mb-2">visibility</span>
                <h3 className="text-2xl font-bold">128</h3>
                <p className="text-[10px] text-gray-500 uppercase">Visitas Perfil</p>
            </div>
            <div className="bg-[#1A1E1A] p-4 rounded-xl border border-white/5">
                <span className="material-symbols-outlined text-[#C5A059] mb-2">event_available</span>
                <h3 className="text-2xl font-bold">4</h3>
                <p className="text-[10px] text-gray-500 uppercase">Agendamentos</p>
            </div>
        </div>

        {/* Actions */}
        <h2 className="text-xs uppercase tracking-widest text-gray-500 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 gap-4">
            <button onClick={() => navigate('/mural')} className="bg-[#1A1E1A] p-4 rounded-xl border border-[#C5A059]/20 hover:bg-[#C5A059]/10 transition-colors flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-white">post_add</span>
                <span className="text-xs font-bold">Novo Post</span>
            </button>
            <button onClick={() => navigate('/clients')} className="bg-[#1A1E1A] p-4 rounded-xl border border-[#C5A059]/20 hover:bg-[#C5A059]/10 transition-colors flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-white">person_search</span>
                <span className="text-xs font-bold">Meus Clientes</span>
            </button>
            <button onClick={() => navigate('/agenda')} className="bg-[#1A1E1A] p-4 rounded-xl border border-[#C5A059]/20 hover:bg-[#C5A059]/10 transition-colors flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-white">calendar_month</span>
                <span className="text-xs font-bold">Gerir Agenda</span>
            </button>
            <button onClick={() => navigate('/ai')} className="bg-gradient-to-br from-[#C5A059] to-[#B89246] p-4 rounded-xl shadow-lg flex flex-col items-center gap-2 text-black">
                <span className="material-symbols-outlined">auto_awesome</span>
                <span className="text-xs font-bold">Assistente IA</span>
            </button>
        </div>
    </div>
  );
};

export default ClientDashboard;
