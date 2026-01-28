
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  
  const [clients, setClients] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState(''); // Novo estado de busca

  // Estados para o Chat de Suporte
  const [showSupport, setShowSupport] = useState(false);
  const [chatMessages, setChatMessages] = useState<{sender: 'me' | 'support', text: string}[]>([
      { sender: 'support', text: 'Olá! Precisa de ajuda com seus clientes ou leads?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. Identifica o usuário atual
    const storedUser = localStorage.getItem('currentUser');
    let proId = 0;
    let isAdmin = false;

    if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        proId = parsed.id;
        isAdmin = parsed.role === 'ADMIN' || parsed.role === 'SUPER_ADMIN';

        // Carregar histórico de chat real se existir
        const storedChat = localStorage.getItem(`support_chat_${parsed.id}`);
        if (storedChat) {
            setChatMessages(JSON.parse(storedChat));
        }
    }

    // 2. Carrega lista de clientes
    const storedUsers = localStorage.getItem('app_users');
    if (storedUsers) {
        const allUsers = JSON.parse(storedUsers);
        
        if (isAdmin) {
            // ADMIN VÊ TODOS OS USUÁRIOS (Excluindo ele mesmo opcionalmente, mas a spec pede todos)
            setClients(allUsers);
        } else {
            // PROFISSIONAL VÊ APENAS QUEM O FAVORITOU
            const clientList = allUsers.filter((u: any) => 
                (u.role === 'VISITOR' || u.role === 'CLIENT') && 
                u.favorites && 
                Array.isArray(u.favorites) &&
                u.favorites.includes(proId)
            );
            setClients(clientList);
        }
    }
  }, []);

  // Lógica do Chat de Suporte
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // 1. Atualiza Estado Local
    const newMsg = { sender: 'me' as const, text: chatInput };
    const updatedChat = [...chatMessages, newMsg];
    setChatMessages(updatedChat);
    
    // 2. Persiste no LocalStorage (Para Admin ver no perfil do usuário)
    if (currentUser?.id) {
        localStorage.setItem(`support_chat_${currentUser.id}`, JSON.stringify(updatedChat));
    }

    // 3. Cria Notificação no MURAL (Para Admin ser avisado)
    const storedPosts = localStorage.getItem('app_posts');
    const currentPosts = storedPosts ? JSON.parse(storedPosts) : [];
    
    const adminAlertPost = {
        id: Date.now(),
        userId: 'sys-alert', // ID sistêmico
        text: `🔔 SUPORTE: O usuário ${currentUser?.name} enviou uma mensagem: "${chatInput}"`,
        time: new Date().toISOString(),
        user: 'Sistema',
        avatar: '',
        tags: ['#Suporte', '#AdminAlert'],
        likes: 0,
        role: 'SUPER_ADMIN' // Garante visibilidade global/admin
    };
    
    localStorage.setItem('app_posts', JSON.stringify([adminAlertPost, ...currentPosts]));

    setChatInput('');
    
    // Simulação de resposta automática
    setTimeout(() => {
        const responseMsg = { sender: 'support' as const, text: 'Sua solicitação foi enviada para a administração. Aguarde retorno.' };
        const finalChat = [...updatedChat, responseMsg];
        setChatMessages(finalChat);
        if (currentUser?.id) {
            localStorage.setItem(`support_chat_${currentUser.id}`, JSON.stringify(finalChat));
        }
    }, 1500);
  };

  // Auto-scroll do chat
  useEffect(() => {
     chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, showSupport]);


  const handleViewProfile = (client: any) => {
      // Usa uma chave temporária para visualização
      localStorage.setItem('tempProfileView', JSON.stringify(client));
      navigate('/profile');
  };

  // Filtro de Clientes
  const filteredClients = clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.email && client.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  const isUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-[#050806] pb-24 text-white font-sans relative">
      
      {/* MODAL DE SUPORTE (CHAT) */}
      {showSupport && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#1A1E1A] border border-[#C5A059]/30 w-full max-w-md h-[500px] rounded-2xl flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-4 border-b border-[#C5A059]/20 bg-[#101410] rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#C5A059]">support_agent</span>
                        <div>
                            <h3 className="font-bold text-white leading-none">Suporte Profissional</h3>
                            <p className="text-[10px] text-green-400">Online • Admin Notificado</p>
                        </div>
                    </div>
                    <button onClick={() => setShowSupport(false)} className="text-gray-500 hover:text-white">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#050806]">
                    {chatMessages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.sender === 'me' ? 'bg-[#C5A059] text-black rounded-tr-none' : 'bg-[#1A1E1A] text-white rounded-tl-none border border-white/10'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef}></div>
                </div>
                <form onSubmit={handleSendMessage} className="p-3 border-t border-[#C5A059]/20 bg-[#1A1E1A] rounded-b-2xl flex gap-2">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Digite sua dúvida..." className="flex-1 bg-[#050806] border border-white/10 rounded-full px-4 py-2 text-sm text-white focus:border-[#C5A059] outline-none" />
                    <button type="submit" className="w-10 h-10 bg-[#C5A059] rounded-full flex items-center justify-center text-black hover:bg-[#d4b470]"><span className="material-symbols-outlined text-[20px]">send</span></button>
                </form>
            </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#101410] border-b border-[#C5A059]/20 px-4 py-4 shadow-lg backdrop-blur-md">
         <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-2">
                 <div>
                     <h1 className="text-lg font-serif text-[#C5A059] flex items-center gap-2">
                        <span className="material-symbols-outlined">{isUserAdmin ? 'group_add' : 'groups'}</span>
                        {isUserAdmin ? 'Todos os Usuários' : 'Meus Clientes'}
                     </h1>
                     <p className="text-xs text-gray-500">{isUserAdmin ? 'Administração Geral do Sistema' : 'Gestão de Leads e Visitantes'}</p>
                 </div>
             </div>
             {!isUserAdmin && (
                 <button 
                    onClick={() => setShowSupport(true)}
                    className="flex items-center gap-2 bg-[#1A1E1A] px-3 py-1.5 rounded-full border border-[#C5A059]/30 hover:bg-[#C5A059] hover:text-black transition-colors"
                 >
                     <span className="material-symbols-outlined text-[18px]">support_agent</span>
                     <span className="text-xs font-bold uppercase hidden sm:block">Suporte</span>
                 </button>
             )}
         </div>

         {/* BARRA DE PESQUISA */}
         <div className="relative">
             <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">search</span>
             <input 
                 type="text" 
                 placeholder={isUserAdmin ? "Buscar em toda a base..." : "Buscar por nome..."}
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full bg-[#050806] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:border-[#C5A059] outline-none"
             />
         </div>
      </header>

      {/* LISTA DE CLIENTES/USUÁRIOS */}
      <main className="p-4 space-y-3 animate-slide-in">
          {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-center">
                  <span className="material-symbols-outlined text-5xl mb-4 opacity-20">person_search</span>
                  <h3 className="text-white font-bold mb-1">{searchTerm ? 'Nenhum resultado' : (isUserAdmin ? 'Banco de dados vazio' : 'Nenhum Cliente Ainda')}</h3>
                  <p className="text-sm max-w-xs">{searchTerm ? 'Tente outro nome.' : (isUserAdmin ? 'Aguarde novos cadastros.' : 'Quando um visitante salvar seu perfil, ele aparecerá aqui automaticamente.')}</p>
              </div>
          ) : (
              filteredClients.map(client => (
                  <div key={client.id} className="bg-[#1A1E1A] border border-white/5 rounded-xl p-4 flex items-center gap-4 hover:border-[#C5A059]/30 transition-colors relative group">
                      
                      <div className="relative">
                          <img 
                              src={client.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}`} 
                              alt={client.name} 
                              className="w-14 h-14 rounded-full object-cover border border-[#C5A059]/20"
                          />
                          <div className={`absolute bottom-0 right-0 w-3 h-3 border border-[#1A1E1A] rounded-full ${client.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                      </div>

                      <div className="flex-1">
                          <h3 className="font-bold text-white text-sm">{client.name} {client.id === currentUser?.id && '(Você)'}</h3>
                          <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] bg-[#C5A059]/10 text-[#C5A059] px-2 py-0.5 rounded uppercase font-bold tracking-wider">{client.role}</span>
                              <span className="text-[10px] text-gray-500">{client.provider || 'Conta ProfilePro'}</span>
                          </div>
                      </div>

                      <button 
                        onClick={() => handleViewProfile(client)}
                        className="p-2 rounded-full bg-white/5 text-gray-400 hover:bg-[#C5A059] hover:text-black transition-colors"
                        title="Ver Perfil"
                      >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </button>
                  </div>
              ))
          )}
      </main>

    </div>
  );
};

export default Clients;
