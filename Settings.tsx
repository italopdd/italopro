
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const isClient = localStorage.getItem('isClient') === 'true'; // Nota: essa flag legacy pode ser ignorada a favor do currentUser
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [clientData, setClientData] = useState<any>({
    id: 0,
    name: '',
    phone: '',
    email: '',
    avatar: '',
    provider: 'Social Login',
    isVisible: true,
    phoneLocked: false
  });
  
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [showSupportChat, setShowSupportChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{sender: 'me' | 'support', text: string}[]>([
      { sender: 'support', text: 'Olá! Bem-vindo ao suporte. Como podemos ajudar?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // Carrega dados baseados no currentUser (fonte da verdade)
    const currUser = localStorage.getItem('currentUser');
    if (currUser) {
        setClientData(JSON.parse(currUser));
    }
  }, []);

  useEffect(() => {
      if (clientData.id) {
          const chatKey = `support_chat_${clientData.id}`;
          const storedChat = localStorage.getItem(chatKey);
          if (storedChat) setChatMessages(JSON.parse(storedChat));

          if (showSupportChat) {
            chatIntervalRef.current = window.setInterval(() => {
                const updatedStored = localStorage.getItem(chatKey);
                if (updatedStored) {
                    const msgs = JSON.parse(updatedStored);
                    setChatMessages(prev => (msgs.length !== prev.length ? msgs : prev));
                }
            }, 1000);
          }
      }
      return () => { if (chatIntervalRef.current) clearInterval(chatIntervalRef.current); };
  }, [clientData.id, showSupportChat]);

  useEffect(() => {
      if (showSupportChat) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showSupportChat]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setClientData({ ...clientData, avatar: reader.result as string }); };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveClient = (e: React.FormEvent) => {
      e.preventDefault();
      const storedUsers = localStorage.getItem('app_users');
      let allUsers = storedUsers ? JSON.parse(storedUsers) : [];
      
      const shouldLockPhone = clientData.phone && clientData.phone.trim().length > 0;
      
      const userToSave = { 
          ...clientData, 
          status: 'ACTIVE', // Garante status ativo
          isVisible: clientData.isVisible !== undefined ? clientData.isVisible : true, 
          phoneLocked: clientData.phoneLocked || shouldLockPhone 
      };
      
      setClientData(userToSave);
      
      const userIndex = allUsers.findIndex((u: any) => u.id === clientData.id);
      
      if (userIndex !== -1) {
          allUsers[userIndex] = { ...allUsers[userIndex], ...userToSave };
      } else {
          // Fallback raro
          allUsers.push(userToSave);
      }
      
      localStorage.setItem('app_users', JSON.stringify(allUsers));
      localStorage.setItem('currentUser', JSON.stringify(userToSave));
      
      alert("Perfil atualizado! Suas informações foram salvas.");
      setIsEditingClient(false);
  };

  const sendMessage = (e: React.FormEvent) => {
      e.preventDefault();
      if(!chatInput.trim() || !clientData.id) return;
      const newMsg = { sender: 'me' as const, text: chatInput };
      const updatedChat = [...chatMessages, newMsg];
      setChatMessages(updatedChat);
      localStorage.setItem(`support_chat_${clientData.id}`, JSON.stringify(updatedChat));
      setChatInput('');
  };

  // --- LOGOUT NUCLEAR (SPA) ---
  const handleLogout = (e?: React.MouseEvent) => {
      e?.preventDefault();
      
      const sessionKeys = ['currentUser', 'isAdmin', 'isClient', 'isUser', 'tempProfileView', 'sys_user_alert'];
      sessionKeys.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();

      // Navegação SPA pura para evitar refresh do navegador e erros de URL
      navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-[#050806] flex flex-col pb-20 text-white font-sans relative">
        {showSupportChat && (
            <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-[#101410] border border-[#C5A059]/30 w-full max-w-md h-[500px] rounded-2xl flex flex-col shadow-2xl">
                    <div className="flex justify-between items-center p-4 border-b border-[#C5A059]/20 bg-[#1A1E1A] rounded-t-2xl"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#C5A059]">support_agent</span><div><h3 className="font-bold text-white leading-none">Suporte</h3><p className="text-[10px] text-green-400">Online</p></div></div><button onClick={() => setShowSupportChat(false)} className="text-gray-500 hover:text-white"><span className="material-symbols-outlined">close</span></button></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050806]">{chatMessages.map((msg, idx) => (<div key={idx} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender === 'me' ? 'bg-[#C5A059] text-black rounded-tr-none' : 'bg-[#1A1E1A] text-white rounded-tl-none border border-white/10'}`}>{msg.text}</div></div>))}<div ref={chatEndRef}></div></div>
                    <form onSubmit={sendMessage} className="p-3 border-t border-[#C5A059]/20 bg-[#1A1E1A] rounded-b-2xl flex gap-2"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Digite..." className="flex-1 bg-[#050806] border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:border-[#C5A059] outline-none" /><button type="submit" className="w-10 h-10 bg-[#C5A059] rounded-full flex items-center justify-center text-black hover:bg-[#d4b470]"><span className="material-symbols-outlined text-[20px]">send</span></button></form>
                </div>
            </div>
        )}
        <header className="sticky top-0 z-50 flex items-center justify-between bg-[#101410] border-b border-[#C5A059]/20 px-4 py-4 shadow-lg backdrop-blur-md">
            {/* Seta Removida */}
            <div className="size-10"></div>
            <h1 className="text-lg font-serif text-[#C5A059]">Configurações</h1>
            <div className="size-10"></div>
        </header>
        <main className="flex-1 overflow-y-auto w-full max-w-md mx-auto px-6 py-6 space-y-8">
            <div className="flex flex-col items-center gap-4">
                <div className="relative group"><div className="w-32 h-32 rounded-full border-2 border-[#C5A059] p-1 bg-[#050806] shadow-[0_0_30px_rgba(197,160,89,0.1)]"><img src={clientData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(clientData.name || 'V')}&background=random`} alt="Perfil" className={`w-full h-full rounded-full object-cover bg-gray-800 transition-all ${!isEditingClient ? 'grayscale-[0.3]' : ''}`}/></div>{isEditingClient && (<><button onClick={() => fileInputRef.current?.click()} className="absolute bottom-1 right-1 bg-[#C5A059] text-black w-10 h-10 rounded-full flex items-center justify-center border-4 border-[#050806] shadow-lg active:scale-90 transition-transform"><span className="material-symbols-outlined text-[20px]">photo_camera</span></button><input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" /></>)}</div>
                <div className="text-center"><p className="text-sm text-gray-300 font-bold">{clientData.name || 'Usuário'}</p><p className="text-xs text-gray-500">{isEditingClient ? 'Toque na câmera para alterar foto' : 'Visualize seus dados abaixo'}</p></div>
            </div>
            <form onSubmit={handleSaveClient} className="flex flex-col gap-6">
                <div className="space-y-5">
                    <div className="relative"><label className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold mb-1 ml-1 block">Nome Completo</label><div className={`flex items-center bg-[#1A1E1A] rounded-xl border transition-colors ${isEditingClient ? 'border-white/10 focus-within:border-[#C5A059]' : 'border-transparent opacity-80'}`}><div className="pl-4 text-gray-500"><span className="material-symbols-outlined text-[20px]">person</span></div><input type="text" value={clientData.name} onChange={(e) => setClientData({...clientData, name: e.target.value})} disabled={!isEditingClient} className="w-full bg-transparent p-4 text-white outline-none placeholder-gray-600 font-medium" placeholder="Digite seu nome"/></div></div>
                    <div className="relative"><label className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold mb-1 ml-1 block flex justify-between">Telefone / Whatsapp {clientData.phoneLocked && isEditingClient && (<span className="text-red-500 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">lock</span> Bloqueado</span>)}</label><div className={`flex items-center bg-[#1A1E1A] rounded-xl border transition-colors ${!isEditingClient ? 'border-transparent opacity-80' : clientData.phoneLocked ? 'border-red-900/30 bg-red-900/10 cursor-not-allowed' : 'border-white/10 focus-within:border-[#C5A059]'}`}><div className={`pl-4 ${clientData.phoneLocked ? 'text-red-500' : 'text-gray-500'}`}><span className="material-symbols-outlined text-[20px]">smartphone</span></div><input type="text" value={clientData.phone} onChange={(e) => setClientData({...clientData, phone: e.target.value})} disabled={!isEditingClient || clientData.phoneLocked} className={`w-full bg-transparent p-4 text-white outline-none placeholder-gray-600 font-medium ${clientData.phoneLocked ? 'text-gray-400' : ''}`} placeholder="(00) 00000-0000"/>{clientData.phoneLocked && (<div className="pr-4 text-gray-500"><span className="material-symbols-outlined text-[16px]">lock</span></div>)}</div>{clientData.phoneLocked && isEditingClient && (<p className="text-[9px] text-red-400 mt-1 ml-1">* Alteração de número restrita. Contate o suporte/admin.</p>)}</div>
                    <div className="relative opacity-60"><label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 ml-1 block">Email (Login)</label><div className="flex items-center bg-[#1A1E1A] rounded-xl border border-white/5 cursor-not-allowed"><div className="pl-4 text-gray-500"><span className="material-symbols-outlined text-[20px]">mail</span></div><input type="text" value={clientData.email} disabled className="w-full bg-transparent p-4 text-gray-400 outline-none"/><div className="pr-4 text-gray-600"><span className="material-symbols-outlined text-[16px]">lock</span></div></div></div>
                </div>
                <div className="pt-2">
                    {isEditingClient ? (
                        <div className="flex gap-3 animate-fade-in"><button type="button" onClick={() => setIsEditingClient(false)} className="flex-1 py-3.5 rounded-xl font-bold text-sm bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors cursor-pointer"><span className="material-symbols-outlined text-[20px]">close</span>Cancelar</button><button type="submit" className="flex-[2] py-3.5 rounded-xl font-bold text-sm bg-[#C5A059] text-black shadow-lg hover:bg-[#d4b470] transition-colors flex items-center justify-center gap-2 uppercase tracking-wide cursor-pointer"><span className="material-symbols-outlined text-[20px]">save</span>SALVAR</button></div>
                    ) : (
                        <button type="button" onClick={() => setIsEditingClient(true)} className="w-full py-4 rounded-xl font-bold text-sm bg-[#1A1E1A] text-[#C5A059] border border-[#C5A059]/30 hover:bg-[#C5A059]/10 transition-colors flex items-center justify-center gap-2 uppercase tracking-wider cursor-pointer"><span className="material-symbols-outlined text-[20px]">edit_square</span>EDITAR DADOS</button>
                    )}
                </div>
            </form>
            {!isEditingClient && (
                <div className="space-y-3 pt-6 border-t border-white/5 animate-fade-in">
                    <button type="button" onClick={() => setShowSupportChat(true)} className="w-full flex items-center justify-between p-4 rounded-xl bg-[#1A1E1A] border border-white/5 hover:border-[#C5A059]/30 transition-colors cursor-pointer"><div className="flex items-center gap-3"><div className="bg-[#C5A059]/10 p-2 rounded-full text-[#C5A059]"><span className="material-symbols-outlined text-[20px]">chat</span></div><div className="text-left"><p className="text-sm font-bold text-white">Falar com Suporte</p></div></div><span className="material-symbols-outlined text-gray-600">chevron_right</span></button>
                    <button type="button" onClick={handleLogout} className="w-full flex items-center justify-between p-4 rounded-xl bg-[#1A1E1A] border border-white/5 hover:bg-red-900/10 hover:border-red-900/30 transition-colors group cursor-pointer"><div className="flex items-center gap-3"><div className="bg-red-900/20 p-2 rounded-full text-red-500 group-hover:text-red-400"><span className="material-symbols-outlined text-[20px]">logout</span></div><div className="text-left"><p className="text-sm font-bold text-white group-hover:text-red-400 transition-colors">Sair da Conta</p></div></div><span className="material-symbols-outlined text-gray-600 group-hover:text-red-400">chevron_right</span></button>
                    <div className="text-center pt-4"><p className="text-[10px] text-gray-600">ProfilePro App v1.3</p></div>
                </div>
            )}
        </main>
    </div>
  );
};

export default Settings;
