
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Hook para detectar mudança de rota/navegação
  const isAdmin = localStorage.getItem('isAdmin') === 'true'; // Legacy flag
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [adminUserList, setAdminUserList] = useState<any[]>([]);
  const [viewingProfileId, setViewingProfileId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isViewingVisitor, setIsViewingVisitor] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDirectMsg, setShowDirectMsg] = useState(false);
  const [dmText, setDmText] = useState('');
  const [showLeftMenu, setShowLeftMenu] = useState(false); 
  const [showUserSupport, setShowUserSupport] = useState(false);
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');

  const [chatMessages, setChatMessages] = useState<{sender: 'me' | 'support', text: string}[]>([
      { sender: 'support', text: 'Olá! Como podemos ajudar você hoje?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Lógica para determinar quem é o usuário atual e se está vendo outro perfil
    const storedUser = localStorage.getItem('currentUser');
    const storedTemp = localStorage.getItem('tempProfileView');
    const allUsersStr = localStorage.getItem('app_users');
    const allUsers = allUsersStr ? JSON.parse(allUsersStr) : [];

    if (storedUser) {
        const user = JSON.parse(storedUser);
        
        // Se for admin, carrega lista para dashboard admin interno (caso necessário)
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
            const pros = allUsers.filter((u: any) => u.role !== 'VISITOR');
            setAdminUserList(pros);
        }

        // Se houver um perfil temporário para visualizar (Ex: Admin vendo User, ou User vendo Pro)
        // E se o usuário NÃO clicou na aba de perfil (que limpa o storage no BottomNav), carregamos o temp
        if (storedTemp) {
            const tempUser = JSON.parse(storedTemp);
            // GARANTIR QUE OS DADOS ESTÃO FRESCOS DO BANCO DE DADOS (localStorage app_users)
            // Isso evita que o estado local tempProfileView fique desatualizado após uma ação de admin
            const freshUser = allUsers.find((u: any) => u.id === tempUser.id) || tempUser;
            
            // Normalizar isVisible se não existir
            if(freshUser.isVisible === undefined) freshUser.isVisible = true;

            setCurrentUser(freshUser);
            
            if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
                setViewingProfileId(freshUser.id);
            } else {
                setIsViewingVisitor(true);
            }
        } else {
            // Vendo o próprio perfil (padrão ou resetado pela navegação)
            // Também buscamos dados frescos
            const freshMe = allUsers.find((u: any) => u.id === user.id) || user;
            if(freshMe.isVisible === undefined) freshMe.isVisible = true;

            setCurrentUser(freshMe);
            setViewingProfileId(null); // Reseta visualização de terceiro
            setIsViewingVisitor(false); // Reseta visualização de terceiro
            
            if (user.login) setRecoverEmail(user.login);
            else if (user.email) setRecoverEmail(user.email);
            
            // Verifica favoritos se for cliente
            if (user.role === 'CLIENT' || user.role === 'VISITOR' || user.role === 'COMPANY') {
                const favorites = JSON.parse(localStorage.getItem('client_favorites') || '[]');
                if(user.id) setIsFavorite(favorites.includes(user.id));
            }
        }
    }
    // Adicionado 'location' como dependência para forçar o re-render ao clicar na aba
  }, [location]);

  const handleAdminViewProfile = (user: any) => {
      setCurrentUser(user);
      setViewingProfileId(user.id);
      localStorage.setItem('tempProfileView', JSON.stringify(user));
  };

  const handleAdminEditRedirect = () => {
      if(currentUser) {
          // Define uma flag para o AdminPanel saber que deve abrir o modo de edição para este ID
          localStorage.setItem('admin_edit_target_id', currentUser.id);
          localStorage.removeItem('tempProfileView'); // Limpa a view temporária
          navigate('/admin'); // Vai para o painel
      }
  };

  const handleAdminChatSupport = (userId: number) => {
      // Simulação de chat
      alert("Abrindo chat de suporte para usuário " + userId);
  };
  
  const handleSendDirectMessage = () => {
      alert(`Mensagem enviada para ${currentUser.name}:\n"${dmText}"`);
      setShowDirectMsg(false);
      setDmText('');
  };

  const handleUserSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = { sender: 'me' as const, text: chatInput };
    setChatMessages([...chatMessages, newMsg]);
    setChatInput('');
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    setTimeout(() => {
        setChatMessages(prev => [...prev, { sender: 'support', text: 'Recebemos sua mensagem. Um administrador responderá em breve.' }]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, 2000);
  };

  const handleRecoverPassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (!recoverEmail) { alert("Por favor, informe um email ou login."); return; }
      alert(`Um link de redefinição de senha foi enviado para: ${recoverEmail}\nVerifique sua caixa de entrada.`);
      setShowRecoverModal(false);
      setShowLeftMenu(false);
  };

  // --- LOGOUT NUCLEAR (SPA) ---
  const handleLogout = (e?: React.MouseEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      
      const sessionKeys = ['currentUser', 'isAdmin', 'isClient', 'isUser', 'tempProfileView', 'sys_user_alert'];
      sessionKeys.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();

      // Navegação SPA pura para evitar refresh do navegador e erros de URL
      navigate('/', { replace: true });
  };

  const [hasSystemAlert, setHasSystemAlert] = useState(false);

  useEffect(() => {
      // Alerta simples se houver flag
    if (localStorage.getItem('sys_user_alert') === 'true') {
        setHasSystemAlert(true);
    }
  }, []);

  const clearAlert = () => {
    setHasSystemAlert(false);
    localStorage.removeItem('sys_user_alert');
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  useEffect(() => {
      if (currentUser) {
          const existingPhones = currentUser.phones && currentUser.phones.length > 0 ? currentUser.phones : (currentUser.phone ? [currentUser.phone] : []);
          const phonesSlot = [ existingPhones[0] || '', existingPhones[1] || '', existingPhones[2] || '' ];
          setFormData({ 
              name: currentUser.name, 
              role: currentUser.role, 
              phones: phonesSlot, 
              specialties: currentUser.specialties ? currentUser.specialties.join(', ') : '', 
              avatar: currentUser.avatar || '', 
              whatsappEnabled: currentUser.whatsappEnabled !== undefined ? currentUser.whatsappEnabled : true,
              profession: currentUser.profession || '',
              description: currentUser.description || ''
          });
      }
  }, [currentUser]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setFormData({ ...formData, avatar: reader.result as string }); };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
      // Bloqueia edição se estiver vendo outro perfil (exceto admin vendo user, mas aqui simplificamos)
      if (viewingProfileId && !isAdmin) return;

      const storedUsers = localStorage.getItem('app_users');
      if (storedUsers) {
          let users = JSON.parse(storedUsers);
          const specsArray = typeof formData.specialties === 'string' ? formData.specialties.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '') : formData.specialties;
          const cleanPhones = formData.phones.filter((p: string) => p && p.trim() !== '');
          const primaryPhone = cleanPhones.length > 0 ? cleanPhones[0] : '';
          
          users = users.map((u: any) => {
              if (u.id === currentUser.id) {
                  return { 
                      ...u, 
                      name: formData.name, 
                      phone: primaryPhone, 
                      phones: cleanPhones, 
                      avatar: formData.avatar, 
                      specialties: specsArray, 
                      whatsappEnabled: formData.whatsappEnabled,
                      profession: formData.profession,
                      description: formData.description
                  };
              }
              return u;
          });
          localStorage.setItem('app_users', JSON.stringify(users));
          
          const updatedUser = users.find((u: any) => u.id === currentUser.id);
          setCurrentUser(updatedUser);
          localStorage.setItem('currentUser', JSON.stringify(updatedUser)); // Atualiza sessão se for o próprio
          
          alert("Perfil atualizado com sucesso!");
          setIsEditing(false);
      }
  };

  const handleAdminStatusChange = (type: 'status' | 'visibility', value: string | boolean) => {
      if (!currentUser) return;
      
      const storedUsers = localStorage.getItem('app_users');
      if (storedUsers) {
          let users = JSON.parse(storedUsers);
          
          // Atualiza a lista geral
          users = users.map((u: any) => {
              if (u.id === currentUser.id) {
                  if (type === 'status') return { ...u, status: value };
                  if (type === 'visibility') return { ...u, isVisible: value };
              }
              return u;
          });
          
          localStorage.setItem('app_users', JSON.stringify(users));
          
          // Atualiza o estado atual do componente para refletir na UI imediatamente
          const updatedUser = { 
              ...currentUser, 
              status: type === 'status' ? value : currentUser.status,
              isVisible: type === 'visibility' ? value : currentUser.isVisible
          };
          
          setCurrentUser(updatedUser);
          
          // Se estivermos visualizando temporariamente, atualizamos o tempProfileView também
          if (viewingProfileId) {
              localStorage.setItem('tempProfileView', JSON.stringify(updatedUser));
          }
      }
  };

  const handleCopyPhone = (phone: string) => {
      if (phone) {
          navigator.clipboard.writeText(phone)
            .then(() => { alert(`Número ${phone} copiado para a área de transferência!`); })
            .catch(err => { console.error('Erro ao copiar', err); alert("Erro ao copiar número. Tente manualmente."); });
      }
  };

  const handleSendMessage = (phone: string) => {
     if(phone) {
         const cleanNum = phone.replace(/\D/g,'');
         if(cleanNum) window.open(`https://wa.me/55${cleanNum}`, '_blank');
         else alert("Número inválido para contato.");
     }
  };

  const handleToggleFavorite = () => {
      if (!currentUser) return;
      const favorites = JSON.parse(localStorage.getItem('client_favorites') || '[]');
      let newFavs;
      if (isFavorite) newFavs = favorites.filter((id: number) => id !== currentUser.id);
      else newFavs = [...favorites, currentUser.id];
      localStorage.setItem('client_favorites', JSON.stringify(newFavs));
      setIsFavorite(!isFavorite);
  };
  
  const handlePhoneChange = (index: number, value: string) => {
      const newPhones = [...formData.phones];
      newPhones[index] = value;
      setFormData({ ...formData, phones: newPhones });
  };

  if (!currentUser) return <div className="min-h-screen bg-[#0D1117] flex items-center justify-center text-white">Carregando perfil...</div>;

  const displayUser = currentUser;
  const displayPhones = displayUser.phones && displayUser.phones.length > 0 ? displayUser.phones : (displayUser.phone ? [displayUser.phone] : []);
  const isBlocked = displayUser.status === 'BLOCKED';
  const isHidden = displayUser.isVisible === false; // Checagem explícita de false
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://profilepro.app/pro/${displayUser.id}`)}&color=000000&bgcolor=C5A059`;

  const isMyProfile = !viewingProfileId && !isViewingVisitor;
  
  // Lógica Visual para EMPRESA vs USUÁRIO COMUM
  const isCompany = displayUser.role === 'COMPANY';

  return (
    <div className="min-h-screen bg-[#0D1117] pb-24 text-white relative">
      {showQrModal && (<div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm animate-fade-in"><div className="bg-[#1A1F26] border border-[#C5A059] p-8 rounded-2xl flex flex-col items-center max-w-sm w-full relative shadow-[0_0_50px_rgba(197,160,89,0.2)]"><button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><span className="material-symbols-outlined">close</span></button><h3 className="text-[#C5A059] font-serif text-xl mb-1 text-center">QR Code</h3><p className="text-gray-400 text-xs mb-6 text-center">Compartilhe este código para que outros encontrem este perfil.</p><div className="bg-white p-2 rounded-xl"><img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" /></div><div className="mt-6 flex items-center gap-3"><img src={displayUser.avatar} className="w-10 h-10 rounded-full object-cover border border-[#C5A059]" alt="avatar"/><div className="text-left"><p className="font-bold text-white text-sm">{displayUser.name}</p><p className="text-[#C5A059] text-xs uppercase">{displayUser.profession || displayUser.role}</p></div></div></div></div>)}
      {showUserSupport && (<div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-[#1A1E1A] border border-[#C5A059]/30 w-full max-w-md h-[500px] rounded-2xl flex flex-col shadow-2xl"><div className="flex justify-between items-center p-4 border-b border-[#C5A059]/20 bg-[#101410] rounded-t-2xl"><div className="flex items-center gap-2"><span className="material-symbols-outlined text-[#C5A059]">support_agent</span><div><h3 className="font-bold text-white leading-none">Suporte</h3><p className="text-[10px] text-green-400">Online</p></div></div><button onClick={() => setShowUserSupport(false)} className="text-gray-500 hover:text-white"><span className="material-symbols-outlined">close</span></button></div><div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050806]">{chatMessages.map((msg, idx) => (<div key={idx} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender === 'me' ? 'bg-[#C5A059] text-black rounded-tr-none' : 'bg-[#1A1E1A] text-white rounded-tl-none border border-white/10'}`}>{msg.text}</div></div>))}<div ref={chatEndRef}></div></div><form onSubmit={handleUserSendMessage} className="p-3 border-t border-[#C5A059]/20 bg-[#1A1E1A] rounded-b-2xl flex gap-2"><input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Digite sua dúvida..." className="flex-1 bg-[#050806] border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:border-[#C5A059] outline-none" /><button type="submit" className="w-10 h-10 bg-[#C5A059] rounded-full flex items-center justify-center text-black hover:bg-[#d4b470]"><span className="material-symbols-outlined text-[20px]">send</span></button></form></div></div>)}
      {showRecoverModal && (<div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-[#1A1E1A] border border-[#C5A059] p-6 rounded-2xl w-full max-w-sm"><h3 className="text-[#C5A059] font-serif text-lg mb-2">Recuperar Senha</h3><p className="text-gray-400 text-xs mb-4">Informe seu email ou login para receber o link de redefinição.</p><form onSubmit={handleRecoverPassword}><input type="text" value={recoverEmail} onChange={(e) => setRecoverEmail(e.target.value)} className="w-full bg-[#050806] border border-white/10 rounded-lg p-3 text-white mb-4 outline-none focus:border-[#C5A059]" placeholder="seu@email.com"/><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowRecoverModal(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancelar</button><button type="submit" className="px-4 py-2 bg-[#C5A059] text-black rounded font-bold text-sm">Enviar Link</button></div></form></div></div>)}
      {hasSystemAlert && (<div className="bg-blue-900/90 border-b border-blue-500 text-white px-4 py-3 sticky top-0 z-[60] backdrop-blur-md shadow-lg animate-fade-in"><div className="flex flex-col gap-2 max-w-md mx-auto"><div className="flex items-start gap-3"><span className="material-symbols-outlined text-blue-300 mt-1">info</span><div><p className="font-bold text-sm">Perfil Atualizado</p><p className="text-xs text-blue-100 leading-relaxed mt-1">Seus dados foram atualizados pela administração. Verifique as novas informações.</p></div></div><div className="flex gap-2 justify-end mt-1"><button onClick={clearAlert} className="text-xs text-blue-300 hover:text-white px-3 py-1">Entendido</button></div></div></div>)}
      
      <header className="flex justify-between items-center p-4 relative z-50">
        {(viewingProfileId || isViewingVisitor) ? (
            <button 
                onClick={() => {
                    // Se for Admin e estiver vendo perfil temporário, limpa antes de voltar
                    // A persistência da view do AdminPanel cuidará do resto
                    if (viewingProfileId) {
                        localStorage.removeItem('tempProfileView');
                    }
                    navigate(-1);
                }} 
                className="text-white hover:text-[#C5A059] transition-colors flex items-center gap-1"
            >
                <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                <span className="text-sm font-bold">Voltar</span>
            </button>
        ) : <div className="w-20"></div>}
        
        {!viewingProfileId && !isViewingVisitor && (
            <div className="relative">
                <button onClick={() => setShowLeftMenu(!showLeftMenu)} className={`text-white hover:text-[#C5A059] transition-colors p-2 rounded-full ${showLeftMenu ? 'bg-white/10 text-[#C5A059]' : ''}`} title="Menu de Opções">
                    <span className="material-symbols-outlined text-[24px]">menu</span>
                </button>
                {showLeftMenu && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-[#1A1F26] border border-[#C5A059] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in origin-top-right">
                        <div className="flex flex-col">
                            <button onClick={() => { setShowUserSupport(true); setShowLeftMenu(false); }} className="px-4 py-3 text-left text-sm text-gray-300 hover:bg-[#C5A059] hover:text-black transition-colors flex items-center gap-3 w-full"><span className="material-symbols-outlined text-[18px]">support_agent</span>Suporte</button>
                            <button onClick={() => { setShowRecoverModal(true); setShowLeftMenu(false); }} className="px-4 py-3 text-left text-sm text-gray-300 hover:bg-[#C5A059] hover:text-black transition-colors flex items-center gap-3 w-full"><span className="material-symbols-outlined text-[18px]">lock_reset</span>Recuperar Senha</button>
                            <button onClick={() => { alert("Política de Privacidade:\n\nSeus dados estão seguros conosco. Para mais detalhes, acesse nosso site oficial."); setShowLeftMenu(false); }} className="px-4 py-3 text-left text-sm text-gray-300 hover:bg-[#C5A059] hover:text-black transition-colors flex items-center gap-3 w-full"><span className="material-symbols-outlined text-[18px]">policy</span>Política de Privacidade</button>
                            <div className="h-[1px] bg-white/10 mx-2"></div>
                            <button onClick={handleLogout} className="px-4 py-3 text-left text-sm text-red-400 hover:bg-red-900/30 transition-colors flex items-center gap-3 w-full cursor-pointer"><span className="material-symbols-outlined text-[18px]">logout</span>Sair da Conta</button>
                        </div>
                    </div>
                )}
            </div>
        )}
      </header>

      <div className="flex flex-col items-center mt-4 px-6 relative">
        {/* ... (restante do código visual e formulários permanecem sem alterações funcionais, apenas estrutura) */}
        {isAdmin && currentUser && viewingProfileId && (
            <div className="w-full bg-[#1A1F26] border border-[#C5A059]/30 rounded-xl p-4 mb-8 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-[#C5A059]"></div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#C5A059]">admin_panel_settings</span>
                        <h3 className="text-[#C5A059] font-bold text-sm tracking-wider uppercase">Painel Admin</h3>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleAdminChatSupport(currentUser.id)} className="bg-white/5 p-1 rounded hover:text-[#C5A059]" title="Chat de Suporte">
                            <span className="material-symbols-outlined text-[18px]">support_agent</span>
                        </button>
                        <button onClick={() => setShowDirectMsg(true)} className="bg-white/5 p-1 rounded hover:text-blue-400" title="Mensagem Direta">
                            <span className="material-symbols-outlined text-[18px]">mail</span>
                        </button>
                    </div>
                </div>
                
                {/* BOTÕES DE AÇÃO ADMINISTRATIVA */}
                <div className="grid grid-cols-2 gap-3 mb-1">
                    {/* BOTÃO BLOQUEAR */}
                    <button 
                        onClick={() => handleAdminStatusChange('status', isBlocked ? 'ACTIVE' : 'BLOCKED')} 
                        className={`py-3 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${isBlocked ? 'bg-red-500 text-white border-red-500 shadow-red-500/20 shadow-lg' : 'bg-red-900/20 text-red-400 border-red-900/50 hover:bg-red-500 hover:text-white'}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{isBlocked ? 'lock' : 'lock_open'}</span>
                        {isBlocked ? 'DESBLOQUEAR' : 'BLOQUEAR'}
                    </button>
                    
                    {/* BOTÃO EDITAR */}
                    <button 
                        onClick={handleAdminEditRedirect}
                        className="py-3 px-3 rounded-lg text-xs font-bold bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/50 hover:bg-[#C5A059] hover:text-black transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">edit_square</span>
                        EDITAR
                    </button>
                </div>
                
                {/* BOTÃO DE VISIBILIDADE / OCULTAR */}
                <div className="mt-3">
                     <button 
                        onClick={() => handleAdminStatusChange('visibility', !isHidden)}
                        className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition-colors flex items-center justify-center gap-2 ${isHidden ? 'bg-gray-700 text-white border-gray-500' : 'bg-transparent text-gray-500 border-gray-700 hover:border-gray-400 hover:text-white'}`}
                     >
                         <span className="material-symbols-outlined text-[16px]">{isHidden ? 'visibility' : 'visibility_off'}</span>
                         {isHidden ? 'MOSTRAR PERFIL (TORNA VISÍVEL)' : 'OCULTAR PERFIL (TORNA INVISÍVEL)'}
                     </button>
                </div>
            </div>
        )}

        {showDirectMsg && isAdmin && (<div className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-[#1A1E1A] border border-[#C5A059] p-6 rounded-2xl w-full max-w-sm"><h3 className="text-[#C5A059] font-serif text-lg mb-4">Enviar Mensagem</h3><textarea value={dmText} onChange={(e) => setDmText(e.target.value)} className="w-full h-32 bg-[#050806] border border-white/10 rounded-lg p-3 text-white mb-4 outline-none focus:border-[#C5A059]" placeholder="Digite a mensagem do sistema..."/><div className="flex justify-end gap-2"><button onClick={() => setShowDirectMsg(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button><button onClick={handleSendDirectMessage} className="px-4 py-2 bg-[#C5A059] text-black rounded font-bold">Enviar</button></div></div></div>)}
        
        {/* 1. FOTO (Sempre no topo) */}
        {/* LÓGICA DE EXIBIÇÃO DIFERENCIADA PARA EMPRESA */}
        <div className={`relative group ${isCompany ? 'w-full max-w-sm' : ''}`}>
            <div className={`
                ${isCompany 
                    ? 'w-full aspect-video rounded-2xl border-2 border-[#C5A059] shadow-2xl bg-gray-800 relative overflow-hidden mb-6' 
                    : 'w-44 h-44 rounded-full overflow-hidden border-2 border-[#1A1F26] shadow-2xl bg-gray-800 relative'
                }
                ${isHidden ? 'opacity-50 grayscale' : ''}
            `}>
                <img 
                    src={formData.avatar || displayUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayUser.name)}`} 
                    alt={displayUser.name} 
                    className="w-full h-full object-cover"
                />
            </div>

            {isEditing && (
                <>
                    <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 transition-opacity z-20 group-hover:bg-black/50 rounded-xl">
                        <span className="material-symbols-outlined text-white text-3xl bg-[#C5A059] p-3 rounded-full shadow-lg">photo_camera</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </>
            )}
            
            {/* BADGES DE STATUS */}
            <div className="absolute top-2 left-2 z-20 flex flex-col gap-1">
                {isBlocked && (
                    <div className="bg-red-600 text-white px-3 py-1 rounded text-[10px] font-bold uppercase shadow-lg flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">lock</span> Bloqueado
                    </div>
                )}
                {isHidden && (
                    <div className="bg-gray-700 text-white px-3 py-1 rounded text-[10px] font-bold uppercase shadow-lg flex items-center gap-1 border border-gray-500">
                        <span className="material-symbols-outlined text-[12px]">visibility_off</span> Oculto
                    </div>
                )}
            </div>
            
            {!isBlocked && !isCompany && !isHidden && (
                <div className="absolute bottom-3 right-3 w-6 h-6 bg-primary rounded-full border-2 border-[#0D1117] z-10"></div>
            )}
        </div>
        
        {isEditing ? (
            /* MODO EDIÇÃO */
            <div className="w-full max-w-sm mt-6 space-y-4 animate-fade-in">
                <div><label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Nome Completo</label><input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-[#1A1E1A] border border-[#C5A059] rounded-lg p-3 text-white font-bold text-center"/></div>
                <div><label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Profissão</label><input type="text" value={formData.profession} onChange={e => setFormData({...formData, profession: e.target.value})} className="w-full bg-[#1A1E1A] border border-[#C5A059] rounded-lg p-3 text-white text-center"/></div>
                <div><label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Especialidades (Separe por vírgula)</label><input type="text" value={formData.specialties} onChange={e => setFormData({...formData, specialties: e.target.value})} className="w-full bg-[#1A1E1A] border border-[#C5A059] rounded-lg p-3 text-white text-sm" placeholder="Ex: Projetos, Interiores, Consultoria"/></div>
                <div><label className="text-[10px] text-gray-500 uppercase font-bold ml-1">Descrição (Bio)</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#1A1E1A] border border-[#C5A059] rounded-lg p-3 text-white text-sm h-20 resize-none"/></div>
                
                {/* Botão de WhatsApp Explícito para Edição */}
                <div className="bg-[#1A1E1A] p-4 rounded-lg border border-white/5 mt-4">
                    <label className="text-[10px] text-gray-500 uppercase font-bold block mb-2">Configuração de Contato</label>
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Link direto para WhatsApp?</span>
                        <button 
                            onClick={() => setFormData({...formData, whatsappEnabled: !formData.whatsappEnabled})}
                            className={`px-4 py-2 rounded-lg font-bold text-xs transition-colors flex items-center gap-2 ${formData.whatsappEnabled ? 'bg-[#25D366] text-white' : 'bg-gray-700 text-gray-400'}`}
                        >
                            <span className="material-symbols-outlined text-[16px]">{formData.whatsappEnabled ? 'check_circle' : 'cancel'}</span>
                            {formData.whatsappEnabled ? 'ATIVADO' : 'DESATIVADO'}
                        </button>
                    </div>
                </div>

                <div className="space-y-3 mt-4">
                     {[0, 1, 2].map((idx) => (<div key={idx}><label className="text-[9px] text-gray-500 uppercase font-bold ml-1 block mb-1">{idx === 0 ? "Telefone Principal" : `Telefone Adicional ${idx}`}</label><input type="text" value={formData.phones[idx]} onChange={e => handlePhoneChange(idx, e.target.value)} className="w-full bg-[#1A1E1A] border border-[#C5A059] rounded-lg p-3 text-white" placeholder="(00) 00000-0000"/></div>))}
                </div>
            </div>
        ) : (
            /* MODO VISUALIZAÇÃO - SEQUÊNCIA REORGANIZADA */
            <div className="flex flex-col items-center w-full max-w-sm">
                
                {/* 2. NOME */}
                <h2 className={`text-2xl font-bold tracking-tight text-center ${isCompany ? 'mt-0' : 'mt-6'} ${isBlocked || isHidden ? 'opacity-50' : ''}`}>{displayUser.name}</h2>
                
                {/* 3. PROFISSÃO */}
                <p className="text-xs tracking-widest uppercase text-[#C5A059] mt-1 mb-3 text-center font-bold">{displayUser.profession || displayUser.role}</p>
                
                {/* 4. ESPECIALIDADES */}
                <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {displayUser.specialties && displayUser.specialties.length > 0 ? (
                        displayUser.specialties.map((spec: string, i: number) => (<span key={i} className="px-3 py-1 rounded-full bg-[#1A1E1A] border border-white/10 text-[10px] text-gray-300 uppercase tracking-wide">{spec}</span>))
                    ) : null}
                </div>

                {/* 5. DESCRIÇÃO */}
                <p className="text-sm text-gray-300 text-center leading-relaxed mb-6 px-4">{displayUser.description || "Sem descrição disponível."}</p>

                {/* Botões de Ação (Favorito/Indicar) */}
                {!isMyProfile && (<div className="flex gap-3 mb-6"><button onClick={handleToggleFavorite} className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${isFavorite ? 'bg-[#C5A059] border-[#C5A059] text-black' : 'bg-transparent border-gray-600 text-gray-300'}`}><span className="material-symbols-outlined text-[18px]">{isFavorite ? 'check' : 'person_add'}</span>{isFavorite ? 'Salvo' : 'Seguir'}</button><button onClick={() => setShowQrModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider bg-[#1A1F26] text-[#C5A059] border border-[#C5A059]/30"><span className="material-symbols-outlined text-[18px]">qr_code_2</span></button></div>)}
                
                {/* Divider */}
                <div className="w-full h-[1px] bg-white/5 my-4"></div>

                {/* 6. CONTATOS (ÚLTIMO NA SEQUÊNCIA) */}
                <div className="w-full space-y-4 px-2 mt-2">
                    <div className="flex items-center gap-2 mb-2 justify-center opacity-50">
                        <div className="h-[1px] bg-white/10 w-12"></div>
                        <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">Contatos</p>
                        <div className="h-[1px] bg-white/10 w-12"></div>
                    </div>

                    {displayPhones.map((phone: string, index: number) => {
                         const isPrimary = index === 0;

                         if (isPrimary) {
                             return (
                                <div key={index} className="bg-gradient-to-r from-[#1A1E1A] to-[#0D1117] border border-[#C5A059]/50 rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative overflow-hidden group transform transition-all hover:scale-[1.02]">
                                    {/* Gold Accent */}
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-[#C5A059]"></div>
                                    
                                    <div className="flex justify-between items-center relative z-10 pl-2">
                                        <div>
                                            <p className="text-[10px] text-[#C5A059] uppercase font-bold tracking-widest mb-1.5">Contato Principal</p>
                                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleCopyPhone(phone)}>
                                                {/* Alterado: font-serif -> font-sans, text-xl -> text-2xl, tracking-wide -> tracking-widest */}
                                                <span className="text-2xl font-sans font-bold text-white tracking-widest group-hover:text-[#C5A059] transition-colors select-all">{phone}</span>
                                                <span className="material-symbols-outlined text-[16px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">content_copy</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {displayUser.whatsappEnabled !== false && (
                                                <button 
                                                    onClick={() => handleSendMessage(phone)} 
                                                    className="bg-[#25D366] w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-900/40 hover:bg-green-400 transition-all hover:scale-110"
                                                    title="Chamar no WhatsApp"
                                                >
                                                    <span className="material-symbols-outlined text-[24px]">chat</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {/* Background decorative shine - reduced intensity for clarity */}
                                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-[#C5A059]/5 rounded-full blur-3xl pointer-events-none"></div>
                                </div>
                             )
                         }

                         return (
                            <div key={index} className="flex items-center justify-between group p-3 pl-4 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 mt-1">
                                <div className="flex items-center gap-4 text-gray-400 group-hover:text-gray-200 cursor-pointer" onClick={() => handleCopyPhone(phone)}>
                                    <span className="material-symbols-outlined text-[20px]">call</span>
                                    {/* Alterado: text-xs -> text-sm, tracking added */}
                                    <span className="text-sm font-sans tracking-wide font-medium">{phone}</span>
                                </div>
                                <button onClick={() => handleCopyPhone(phone)} className="text-[10px] text-gray-600 hover:text-white uppercase font-bold tracking-wider">Copiar</button>
                            </div>
                        )
                    })}
                    
                    {displayUser.email && (
                        <div className="flex items-center justify-between group p-3 rounded-lg bg-[#1A1E1A]/50 border border-white/5 hover:border-[#C5A059]/30 transition-all cursor-pointer mt-2" onClick={() => handleCopyPhone(displayUser.email)}>
                            <div className="flex items-center gap-3 text-gray-400 group-hover:text-white transition-colors">
                                <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[16px]">mail</span>
                                </div>
                                <span className="text-xs font-medium">{displayUser.email}</span>
                            </div>
                            <span className="material-symbols-outlined text-[16px] text-gray-600 group-hover:text-[#C5A059]">content_copy</span>
                        </div>
                    )}
                </div>

            </div>
        )}

        {isMyProfile && (<div className="mt-8 w-full flex justify-center pb-8">{isEditing ? (<div className="flex gap-3"><button onClick={() => setIsEditing(false)} className="bg-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-600 transition-colors">Cancelar</button><button onClick={handleSaveProfile} className="bg-[#C5A059] text-black px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#d4b470] transition-colors flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">save</span>Salvar</button></div>) : (<div className="flex items-center gap-3"><button onClick={() => setIsEditing(true)} className="bg-[#1A1E1A] border border-white/10 text-gray-300 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"><span className="material-symbols-outlined text-[16px]">edit</span>Editar Perfil</button><button onClick={() => setShowQrModal(true)} className="bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#C5A059] p-2 rounded-full hover:bg-[#C5A059] hover:text-black transition-colors" title="Meu QR Code"><span className="material-symbols-outlined text-[20px]">qr_code_2</span></button></div>)}</div>)}
      </div>
    </div>
  );
};

export default Profile;
