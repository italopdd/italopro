
import React, { useState, useEffect } from 'react';
import { User, Log, Role } from '../types';
import { useNavigate } from 'react-router-dom';

// Tipos de visualização
type AdminView = 'METRICS' | 'LIVE_ACTIVITY' | 'ADMIN_ACTIVITY' | 'USER_ACTIVITY' | 'MURAL' | 'USERS_LIST' | 'REGISTER' | 'RECOVERY' | 'ONLINE_USERS' | 'NEW_USERS';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Estado da View Ativa
  const [activeView, setActiveView] = useState<AdminView>(() => {
      const savedView = sessionStorage.getItem('admin_active_view');
      return (savedView as AdminView) || 'METRICS';
  });
  
  // Estado do Menu Mobile (Gaveta)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
      sessionStorage.setItem('admin_active_view', activeView);
  }, [activeView]);

  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, online: 0, new: 0 });
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  // Form States
  const [newUser, setNewUser] = useState({ 
      name: '', profession: '', phone: '', phone2: '', email: '', login: '', password: '', role: 'CLIENT', description: ''
  });
  const [recoverEmail, setRecoverEmail] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // --- CARREGAMENTO DE DADOS ---
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) setCurrentUser(JSON.parse(userStr));

    const dbUsers = localStorage.getItem('app_users');
    if (dbUsers) {
        const parsedUsers: User[] = JSON.parse(dbUsers);
        const normalizedUsers = parsedUsers.map(u => ({...u, isVisible: u.isVisible !== undefined ? u.isVisible : true}));
        setUsers(normalizedUsers);

        const editTargetId = localStorage.getItem('admin_edit_target_id');
        if (editTargetId) {
            const targetUser = normalizedUsers.find(u => u.id === editTargetId);
            if (targetUser) {
                setEditingUserId(targetUser.id);
                setNewUser({ 
                    name: targetUser.name, 
                    email: targetUser.email, 
                    login: targetUser.login || targetUser.email,
                    password: targetUser.password || '', 
                    role: targetUser.role, 
                    phone: targetUser.phone || '',
                    phone2: targetUser.phone2 || '',
                    profession: targetUser.profession || (targetUser.specialties ? targetUser.specialties[0] : ''),
                    description: targetUser.description || ''
                });
                setActiveView('REGISTER');
            }
            localStorage.removeItem('admin_edit_target_id');
        }

        const randomOnlineCount = Math.floor(Math.random() * (normalizedUsers.length / 2)) + 1;
        const shuffled = [...normalizedUsers].sort(() => 0.5 - Math.random());
        setOnlineUserIds(shuffled.slice(0, randomOnlineCount).map(u => u.id));

        setStats({
            total: normalizedUsers.length,
            online: randomOnlineCount,
            new: normalizedUsers.filter(u => {
                const date = new Date(u.createdAt);
                const today = new Date();
                return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
            }).length
        });
    }

    const dbPosts = localStorage.getItem('app_posts');
    if (dbPosts) setPosts(JSON.parse(dbPosts).sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime()));

    const generateLogs = () => {
        const actions = ['LOGIN', 'LOGOUT', 'VIEW_PROFILE', 'CREATE_POST', 'UPDATE_SETTINGS'];
        const targets = ['Sistema', 'Mural', 'Perfil', 'Configurações'];
        const newLogs: Log[] = [];
        for(let i=0; i<20; i++) {
            newLogs.push({
                id: i.toString(),
                action: actions[Math.floor(Math.random() * actions.length)],
                target: targets[Math.floor(Math.random() * targets.length)],
                userId: (Math.floor(Math.random() * 5) + 1).toString(),
                timestamp: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString()
            });
        }
        return newLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };
    setLogs(generateLogs());
  }, []);

  // --- ACTIONS ---
  const handleLogout = (e?: React.MouseEvent) => {
      e?.preventDefault();
      const sessionKeys = ['currentUser', 'isAdmin', 'isClient', 'isUser', 'tempProfileView', 'sys_user_alert', 'admin_edit_target_id', 'admin_active_view'];
      sessionKeys.forEach(key => localStorage.removeItem(key));
      sessionStorage.clear();
      navigate('/', { replace: true });
  };

  const handleRegisterUser = (e: React.FormEvent) => {
      e.preventDefault();
      if(!currentUser) return;
      if ((newUser.role === 'ADMIN' || newUser.role === 'SUPER_ADMIN') && currentUser.role !== 'SUPER_ADMIN') {
          alert("Permissão negada: Apenas Super Admins podem criar ou editar contas de Administrador.");
          return;
      }
      if(!newUser.name || !newUser.login || !newUser.password) return alert("Preencha os campos obrigatórios");
      
      const commonData = {
          name: newUser.name, email: newUser.email, login: newUser.login, password: newUser.password, role: newUser.role as Role,
          phone: newUser.phone, phone2: newUser.phone2, profession: newUser.profession, description: newUser.description,
          specialties: newUser.profession ? [newUser.profession] : [], 
      };

      if (editingUserId) {
          const updatedUsers = users.map(u => u.id === editingUserId ? { ...u, ...commonData } as User : u);
          setUsers(updatedUsers);
          localStorage.setItem('app_users', JSON.stringify(updatedUsers));
          if (editingUserId === currentUser.id) {
              localStorage.setItem('currentUser', JSON.stringify(updatedUsers.find(u => u.id === currentUser.id)));
              setCurrentUser(updatedUsers.find(u => u.id === currentUser.id) || null);
          }
          alert("Atualizado com sucesso!");
          setEditingUserId(null);
      } else {
          const user: User = {
              id: Date.now().toString(), ...commonData, status: 'ACTIVE', isVisible: true, createdAt: new Date().toISOString(),
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newUser.name)}&background=random`
          };
          const updatedUsers = [...users, user];
          setUsers(updatedUsers);
          localStorage.setItem('app_users', JSON.stringify(updatedUsers));
          alert("Cadastrado com sucesso!");
      }
      setNewUser({ name: '', profession: '', phone: '', phone2: '', email: '', login: '', password: '', role: 'CLIENT', description: '' });
      setActiveView('USERS_LIST');
  };

  const handleEditUser = (user: User) => {
      setEditingUserId(user.id);
      setNewUser({ 
          name: user.name, email: user.email, login: user.login || user.email, password: user.password || '', 
          role: user.role, phone: user.phone || '', phone2: user.phone2 || '', 
          profession: user.profession || (user.specialties ? user.specialties[0] : ''), description: user.description || ''
      });
      setActiveView('REGISTER');
  };

  const handleBlockUser = (id: string) => {
      if(window.confirm("Alterar status de bloqueio?")) {
          const updated = users.map(u => u.id === id ? { ...u, status: (u.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE') as User['status'] } : u);
          setUsers(updated);
          localStorage.setItem('app_users', JSON.stringify(updated));
      }
  };

  const handleToggleVisibility = (id: string) => {
      const updated = users.map(u => u.id === id ? { ...u, isVisible: !u.isVisible } : u);
      setUsers(updated);
      localStorage.setItem('app_users', JSON.stringify(updated));
  };

  const handleViewProfile = (user: User) => {
      localStorage.setItem('tempProfileView', JSON.stringify(user));
      navigate('/profile');
  };

  const handleRecoverPassword = (e: React.FormEvent) => {
      e.preventDefault();
      const targetUser = users.find(u => u.email === recoverEmail || u.name === recoverEmail || u.login === recoverEmail);
      alert(targetUser ? `Login: ${targetUser.login || targetUser.email}\nSenha: ${targetUser.password || '2244'}` : "Usuário não encontrado.");
  };

  // --- HELPERS ---
  const getDisplayLogs = () => {
      if (activeView === 'ADMIN_ACTIVITY') return logs.filter(l => ['ADMIN','SUPER_ADMIN'].includes(users.find(u=>u.id===l.userId)?.role || ''));
      if (activeView === 'USER_ACTIVITY') return logs.filter(l => ['CLIENT','VISITOR'].includes(users.find(u=>u.id===l.userId)?.role || ''));
      return logs;
  };

  const getFilteredUsers = () => {
      if (activeView === 'ONLINE_USERS') return users.filter(u => onlineUserIds.includes(u.id));
      if (activeView === 'NEW_USERS') {
          const today = new Date();
          return users.filter(u => { const d = new Date(u.createdAt); return d.getDate() === today.getDate() && d.getMonth() === today.getMonth(); });
      }
      return users; 
  };

  const handleViewChange = (view: AdminView) => {
      setActiveView(view);
      setIsMobileMenuOpen(false);
      if(view === 'REGISTER') setEditingUserId(null);
  };

  if (!currentUser) return null;
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  // Componente de Item da Sidebar
  const SidebarItem = ({ view, icon, label }: { view: AdminView, icon: string, label: string }) => (
      <button 
        onClick={() => handleViewChange(view)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${activeView === view ? 'bg-[#C5A059] text-black shadow-lg' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
      >
          <span className={`material-symbols-outlined ${activeView === view ? 'text-black' : 'text-[#C5A059]'}`}>{icon}</span>
          <span className="text-sm font-bold uppercase tracking-wider text-left flex-1">{label}</span>
          {activeView === view && <span className="material-symbols-outlined text-[16px]">chevron_right</span>}
      </button>
  );

  // --- CONTEÚDO DA SIDEBAR (Reutilizável) ---
  const SidebarContent = () => (
      <div className="flex flex-col h-full bg-[#0A0D0A] border-r border-[#C5A059]/20 shadow-2xl">
          {/* Logo */}
          <div className="p-6 flex flex-col items-center border-b border-[#C5A059]/10 relative shrink-0">
              <span className="material-symbols-outlined text-4xl text-[#C5A059] mb-2">diamond</span>
              <h1 className="text-xl font-serif tracking-[0.2em] text-[#C5A059]">PROFILE<span className="text-white font-bold">PRO</span></h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Super Admin Panel</p>
          </div>

          {/* Menu Scrollable */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
              <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-2 pl-4 mt-2">Geral</div>
              <SidebarItem view="METRICS" icon="analytics" label="Dashboard" />
              <SidebarItem view="LIVE_ACTIVITY" icon="podcasts" label="Atividade Real" />
              <SidebarItem view="MURAL" icon="dashboard" label="Mural Global" />
              
              <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-6 mb-2 pl-4">Monitoramento</div>
              <SidebarItem view="ADMIN_ACTIVITY" icon="admin_panel_settings" label="Logs Admins" />
              <SidebarItem view="USER_ACTIVITY" icon="group" label="Logs Usuários" />
              
              <div className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-6 mb-2 pl-4">Gestão</div>
              <SidebarItem view="USERS_LIST" icon="list_alt" label="Base de Usuários" />
              <SidebarItem view="REGISTER" icon="person_add" label="Novo Cadastro" />
              <SidebarItem view="RECOVERY" icon="lock_reset" label="Senhas" />

              <div className="h-4"></div>
              <button onClick={() => { navigate('/ai'); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-[#C5A059]/20 to-transparent border border-[#C5A059]/30 hover:bg-[#C5A059] hover:text-black transition-all group">
                 <span className="material-symbols-outlined text-[#C5A059] group-hover:text-black">smart_toy</span>
                 <span className="text-sm font-bold uppercase tracking-wider flex-1 text-[#C5A059] group-hover:text-black">Admin AI</span>
              </button>
              <button onClick={() => { navigate('/mural'); setIsMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-all mt-2">
                 <span className="material-symbols-outlined">rocket_launch</span>
                 <span className="text-sm font-bold uppercase tracking-wider flex-1">Ver App</span>
                 <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </button>
          </div>

          {/* Footer User */}
          <div className="p-4 border-t border-[#C5A059]/10 bg-[#080A08] shrink-0">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#C5A059] flex items-center justify-center text-black font-bold">SA</div>
                  <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold truncate">{currentUser?.name}</p>
                      <button onClick={handleLogout} className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">logout</span> Sair
                      </button>
                  </div>
              </div>
          </div>
      </div>
  );

  // Layout FIXO e "NUCLEAR": 
  // 'fixed inset-0' garante que o painel ocupe a tela toda e fique por cima de qualquer layout do App.tsx.
  // Breakpoint 'lg' (1024px) força o menu mobile a aparecer em tablets/laptops pequenos, facilitando o preview.
  return (
    <div className="fixed inset-0 z-50 w-full h-full bg-[#050806] text-white flex overflow-hidden">
      
      {/* 1. SIDEBAR DESKTOP (Visível apenas em LG - 1024px para cima) */}
      <aside className="hidden lg:flex w-72 flex-col h-full shrink-0 z-40 bg-[#0A0D0A]">
         <SidebarContent />
      </aside>

      {/* 2. SIDEBAR MOBILE (Visível em Mobile, Tablet e telas < 1024px) */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-[60] lg:hidden flex">
              {/* Backdrop */}
              <div 
                  className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
                  onClick={() => setIsMobileMenuOpen(false)}
              ></div>
              
              {/* Drawer */}
              <div className="relative w-72 h-full animate-slide-in shadow-2xl">
                 <button onClick={() => setIsMobileMenuOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white z-50">
                    <span className="material-symbols-outlined">close</span>
                 </button>
                 <SidebarContent />
              </div>
          </div>
      )}

      {/* 3. CONTEÚDO PRINCIPAL (Ocupa o resto do espaço) */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-[#050806]">
          
          {/* Header Mobile (Visível apenas < LG) */}
          <header className="lg:hidden h-16 bg-[#0A0D0A] border-b border-[#C5A059]/20 flex items-center justify-between px-4 shrink-0 z-30">
              <button onClick={() => setIsMobileMenuOpen(true)} className="text-[#C5A059] p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors">
                  <span className="material-symbols-outlined text-2xl">menu</span>
              </button>
              <span className="text-[#C5A059] font-serif tracking-widest font-bold">ADMIN PANEL</span>
              <div className="w-10"></div> {/* Espaçador */}
          </header>

          {/* Área de Scroll do Conteúdo */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar relative">
              <div className="max-w-6xl mx-auto pb-24">
                  
                  {/* Título da Página */}
                  <div className="mb-6 flex items-center gap-4">
                      {activeView !== 'METRICS' && (
                          <button onClick={() => setActiveView('METRICS')} className="hidden lg:flex p-2 bg-[#1A1E1A] rounded-lg border border-white/10 text-gray-400 hover:text-white transition-colors">
                              <span className="material-symbols-outlined">arrow_back</span>
                          </button>
                      )}
                      <div>
                          <h2 className="text-xl lg:text-2xl font-serif text-white flex items-center gap-2">
                              {activeView === 'METRICS' && 'Visão Geral'}
                              {activeView === 'LIVE_ACTIVITY' && 'Monitoramento Real'}
                              {activeView === 'MURAL' && 'Mural Global'}
                              {activeView === 'ADMIN_ACTIVITY' && 'Logs Administrativos'}
                              {activeView === 'USER_ACTIVITY' && 'Logs de Usuários'}
                              {activeView === 'USERS_LIST' && 'Base de Usuários'}
                              {activeView === 'ONLINE_USERS' && 'Usuários Online'}
                              {activeView === 'NEW_USERS' && 'Novos Cadastros'}
                              {activeView === 'REGISTER' && (editingUserId ? 'Editar Usuário' : 'Novo Cadastro')}
                              {activeView === 'RECOVERY' && 'Recuperação de Senha'}
                          </h2>
                      </div>
                  </div>

                  {/* CONTEÚDO DAS VIEWS */}
                  <div className="animate-fade-in">
                      {activeView === 'METRICS' && (
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              <button onClick={() => setActiveView('ONLINE_USERS')} className="bg-[#1A1E1A] p-6 rounded-2xl border border-[#C5A059]/10 relative overflow-hidden group hover:border-[#C5A059]/50 transition-all text-left">
                                  <div className="absolute -right-4 -top-4 bg-green-500/10 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-2 flex items-center gap-2">Online Agora</p>
                                  <h3 className="text-4xl font-serif text-green-400 flex items-center gap-2">{stats.online} <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span></h3>
                              </button>
                              <button onClick={() => setActiveView('NEW_USERS')} className="bg-[#1A1E1A] p-6 rounded-2xl border border-[#C5A059]/10 relative overflow-hidden group hover:border-[#C5A059]/50 transition-all text-left">
                                  <div className="absolute -right-4 -top-4 bg-blue-500/10 w-24 h-24 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
                                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Novos Hoje</p>
                                  <h3 className="text-4xl font-serif text-blue-400">+{stats.new}</h3>
                              </button>
                              <div className="bg-[#1A1E1A] p-6 rounded-2xl border border-[#C5A059]/10">
                                  <p className="text-gray-400 text-xs uppercase tracking-widest mb-2">Total Usuários</p>
                                  <h3 className="text-4xl font-serif text-white">{stats.total}</h3>
                              </div>
                              <button onClick={() => navigate('/ai')} className="lg:col-span-3 bg-gradient-to-r from-[#1A1E1A] to-[#0A0D0A] p-6 rounded-2xl border border-[#C5A059]/30 hover:border-[#C5A059] transition-all text-left flex items-center justify-between group">
                                  <div>
                                      <p className="text-[#C5A059] text-xs uppercase tracking-widest mb-1 font-bold">Assistente Inteligente</p>
                                      <h3 className="text-2xl font-serif text-white">Consultar Admin Bot</h3>
                                  </div>
                                  <span className="material-symbols-outlined text-4xl text-[#C5A059] group-hover:scale-110 transition-transform">smart_toy</span>
                              </button>
                          </div>
                      )}

                      {(activeView === 'LIVE_ACTIVITY' || activeView === 'ADMIN_ACTIVITY' || activeView === 'USER_ACTIVITY') && (
                          <div className="bg-[#1A1E1A] rounded-2xl border border-white/5 overflow-hidden">
                              <div className="divide-y divide-white/5">
                                  {getDisplayLogs().map(log => (
                                      <div key={log.id} className="p-4 hover:bg-white/5 transition-colors flex items-center gap-4">
                                          <div className={`p-2 rounded-lg ${log.action.includes('ADMIN') ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'bg-blue-900/20 text-blue-400'}`}>
                                              <span className="material-symbols-outlined text-[18px]">{log.action.includes('LOGIN') ? 'login' : 'info'}</span>
                                          </div>
                                          <div className="flex-1">
                                              <p className="text-sm text-white"><span className="font-bold text-[#C5A059]">{users.find(u=>u.id===log.userId)?.name || 'Sistema'}</span> : {log.action}</p>
                                              <p className="text-xs text-gray-500">{log.target}</p>
                                          </div>
                                          <span className="text-[10px] text-gray-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}

                      {(activeView === 'USERS_LIST' || activeView === 'ONLINE_USERS' || activeView === 'NEW_USERS') && (
                          <div className="bg-[#1A1E1A] rounded-2xl border border-white/5 overflow-hidden">
                              <div className="overflow-x-auto">
                                  <table className="w-full text-left text-sm whitespace-nowrap">
                                      <thead className="bg-[#0A0D0A] text-gray-500 uppercase text-[10px]">
                                          <tr><th className="p-4">Usuário</th><th className="p-4">Login</th><th className="p-4">Cargo</th><th className="p-4 text-right">Ações</th></tr>
                                      </thead>
                                      <tbody className="divide-y divide-white/5">
                                          {getFilteredUsers().map(u => (
                                              <tr key={u.id} className={`hover:bg-white/5 ${!u.isVisible ? 'opacity-50' : ''}`}>
                                                  <td className="p-4 flex items-center gap-3">
                                                      <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name}`} className="w-8 h-8 rounded-full" alt="" />
                                                      <div><p className={`font-bold ${u.status==='BLOCKED'?'line-through text-red-400':'text-white'}`}>{u.name}</p><p className="text-[10px] text-gray-500">{u.profession}</p></div>
                                                  </td>
                                                  <td className="p-4 text-gray-400">{u.login || u.email}</td>
                                                  <td className="p-4"><span className="bg-black border border-white/10 px-2 py-1 rounded text-[10px] text-[#C5A059]">{u.role}</span></td>
                                                  <td className="p-4 text-right flex justify-end gap-2">
                                                      <button onClick={() => handleViewProfile(u)} className="p-2 bg-blue-900/20 text-blue-400 rounded hover:bg-blue-500 hover:text-white"><span className="material-symbols-outlined text-[16px]">visibility</span></button>
                                                      <button onClick={() => handleEditUser(u)} className="p-2 bg-white/5 rounded hover:bg-[#C5A059] hover:text-black"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                                                      <button onClick={() => handleToggleVisibility(u.id)} className="p-2 bg-white/5 rounded hover:text-white text-gray-500"><span className="material-symbols-outlined text-[16px]">{u.isVisible!==false?'visibility':'visibility_off'}</span></button>
                                                      <button onClick={() => handleBlockUser(u.id)} className={`p-2 rounded ${u.status==='BLOCKED'?'bg-red-600 text-white':'bg-white/5 hover:bg-red-500'}`}><span className="material-symbols-outlined text-[16px]">{u.status==='BLOCKED'?'lock':'lock_open'}</span></button>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}

                      {activeView === 'REGISTER' && (
                          <div className="max-w-2xl mx-auto bg-[#1A1E1A] p-6 rounded-2xl border border-[#C5A059]/20">
                              <h3 className="text-lg font-serif text-[#C5A059] mb-6">{editingUserId ? 'Editar Usuário' : 'Novo Cadastro'}</h3>
                              <form onSubmit={handleRegisterUser} className="space-y-4">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      <input className="bg-[#050806] border border-white/10 p-3 rounded text-white w-full" placeholder="Nome Completo" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} />
                                      <input className="bg-[#050806] border border-white/10 p-3 rounded text-white w-full" placeholder="Profissão" value={newUser.profession} onChange={e=>setNewUser({...newUser,profession:e.target.value})} />
                                      <input className="bg-[#050806] border border-white/10 p-3 rounded text-white w-full" placeholder="Telefone 1" value={newUser.phone} onChange={e=>setNewUser({...newUser,phone:e.target.value})} />
                                      <input className="bg-[#050806] border border-white/10 p-3 rounded text-white w-full" placeholder="Telefone 2" value={newUser.phone2} onChange={e=>setNewUser({...newUser,phone2:e.target.value})} />
                                  </div>
                                  <div className="bg-[#0A0D0A] p-4 rounded border border-white/5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      <input className="bg-[#1A1E1A] border border-white/10 p-3 rounded text-white w-full" placeholder="Login" value={newUser.login} onChange={e=>setNewUser({...newUser,login:e.target.value})} />
                                      <input className="bg-[#1A1E1A] border border-white/10 p-3 rounded text-white w-full" placeholder="Senha" value={newUser.password} onChange={e=>setNewUser({...newUser,password:e.target.value})} />
                                      <input className="bg-[#1A1E1A] border border-white/10 p-3 rounded text-white w-full lg:col-span-2" placeholder="Email" value={newUser.email} onChange={e=>setNewUser({...newUser,email:e.target.value})} />
                                  </div>
                                  <textarea className="w-full bg-[#050806] border border-white/10 p-3 rounded text-white h-24" placeholder="Descrição" value={newUser.description} onChange={e=>setNewUser({...newUser,description:e.target.value})} />
                                  <select className="w-full bg-[#050806] border border-white/10 p-3 rounded text-white" value={newUser.role} onChange={e=>setNewUser({...newUser,role:e.target.value})}>
                                      <option value="CLIENT">Cliente (Profissional)</option>
                                      <option value="COMPANY">Empresa</option>
                                      {isSuperAdmin && <option value="ADMIN">Administrador</option>}
                                      {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                                      <option value="VISITOR">Visitante</option>
                                  </select>
                                  <div className="flex gap-2">
                                      {editingUserId && <button type="button" onClick={()=>setActiveView('USERS_LIST')} className="flex-1 bg-gray-700 p-3 rounded font-bold">Cancelar</button>}
                                      <button type="submit" className="flex-[2] bg-[#C5A059] text-black p-3 rounded font-bold hover:bg-[#d4b470]">{editingUserId?'Salvar':'Cadastrar'}</button>
                                  </div>
                              </form>
                          </div>
                      )}

                      {activeView === 'RECOVERY' && (
                          <div className="max-w-md mx-auto bg-[#1A1E1A] p-8 rounded-2xl border border-white/5 text-center mt-10">
                              <h3 className="text-xl font-bold text-white mb-4">Recuperação Administrativa</h3>
                              <form onSubmit={handleRecoverPassword} className="space-y-4">
                                  <input type="text" value={recoverEmail} onChange={e => setRecoverEmail(e.target.value)} className="w-full bg-[#050806] border border-white/10 rounded-lg p-3 text-center text-white" placeholder="Email ou Login" />
                                  <button type="submit" className="w-full border border-[#C5A059] text-[#C5A059] font-bold py-3 rounded-lg hover:bg-[#C5A059] hover:text-black">Buscar Senha</button>
                              </form>
                          </div>
                      )}

                      {activeView === 'MURAL' && (
                          <div className="space-y-4">
                              {posts.map(post => (
                                  <div key={post.id} className="bg-[#1A1E1A] p-4 rounded-xl border border-white/5 flex gap-4">
                                      <img src={post.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                                      <div className="flex-1">
                                          <div className="flex justify-between"><h4 className="font-bold text-white">{post.user}</h4><span className="text-xs text-gray-500">{new Date(post.time).toLocaleDateString()}</span></div>
                                          <p className="text-gray-300 text-sm mt-1">{post.text}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </main>
      </div>
    </div>
  );
};

export default AdminPanel;
