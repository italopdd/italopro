
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Role } from '../types';

const Login: React.FC = () => {
  const navigate = useNavigate();
  
  // Estados
  const [isAdminMode, setIsAdminMode] = useState(false); // Controla se está na tela do cadeado
  const [identifier, setIdentifier] = useState(''); // Serve para email, login ou user
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // SEED DATABASE (Cria os usuários solicitados se não existirem)
  useEffect(() => {
    const existingUsersStr = localStorage.getItem('app_users');
    let users: User[] = existingUsersStr ? JSON.parse(existingUsersStr) : [];
    
    // Definição dos usuários obrigatórios
    const requiredUsers = [
        { 
            id: 'super-admin-id', 
            name: 'Italo Super', 
            email: 'italo@admin.com',
            login: 'italo',
            password: '2244', 
            role: 'SUPER_ADMIN' as Role, 
            status: 'ACTIVE' as const, 
            createdAt: new Date().toISOString() 
        },
        { 
            id: 'admin-id', 
            name: 'Italo Admin', 
            email: 'italopd@admin.com',
            login: 'italopd',
            password: '2244', 
            role: 'ADMIN' as Role, 
            status: 'ACTIVE' as const, 
            createdAt: new Date().toISOString() 
        },
        { 
            id: 'client-id', 
            name: 'Italo User', 
            email: 'italopdd@client.com',
            login: 'italopdd',
            password: '2244', 
            role: 'CLIENT' as Role, 
            status: 'ACTIVE' as const, 
            specialties: ['Arquiteto', 'Designer'],
            createdAt: new Date().toISOString() 
        }
    ];

    let updated = false;
    requiredUsers.forEach(reqUser => {
        // Verifica se existe por login ou email
        if (!users.find(u => u.login === reqUser.login)) {
            users.push(reqUser);
            updated = true;
        }
    });

    if (updated || users.length === 0) {
        localStorage.setItem('app_users', JSON.stringify(users));
    }
  }, []);

  // Redireciona se já houver sessão ativa
  useEffect(() => {
      const userString = localStorage.getItem('currentUser');
      if (userString) {
          const user: User = JSON.parse(userString);
          redirectByRole(user.role);
      }
  }, [navigate]);

  const redirectByRole = (role: Role) => {
      switch(role) {
          case 'SUPER_ADMIN':
          case 'ADMIN': navigate('/admin'); break;
          // Alteração: Clientes, Empresas e Visitantes vão para o Perfil
          case 'CLIENT': 
          case 'COMPANY':
              navigate('/profile'); break;
          case 'VISITOR': navigate('/profile'); break;
          default: navigate('/');
      }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const storedUsers = localStorage.getItem('app_users');
    const users: User[] = storedUsers ? JSON.parse(storedUsers) : [];

    // Busca usuário pelo "email" OU "login"
    const user = users.find(u => (u.email === identifier || u.login === identifier) && u.password === password);

    if (user) {
        if (user.status === 'BLOCKED') {
            setError('Conta bloqueada. Contate o suporte.');
            return;
        }
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        redirectByRole(user.role);
    } else {
        setError('Credenciais inválidas.');
    }
  };

  const handleVisitorAccess = (provider: string) => {
      // Cria um usuário visitante temporário/rápido
      const visitorUser: User = {
          id: `visitor-${Date.now()}`,
          name: `Visitante (${provider})`,
          email: `visitor-${Date.now()}@temp.com`,
          login: `visitante-${Date.now()}`,
          role: 'VISITOR',
          status: 'ACTIVE',
          provider: provider,
          avatar: `https://ui-avatars.com/api/?name=Visitante&background=random`,
          createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('currentUser', JSON.stringify(visitorUser));
      
      // Salva no banco "mock"
      const storedUsers = localStorage.getItem('app_users');
      const users: User[] = storedUsers ? JSON.parse(storedUsers) : [];
      users.push(visitorUser);
      localStorage.setItem('app_users', JSON.stringify(users));

      redirectByRole('VISITOR');
  };

  return (
    <div className="min-h-screen w-full bg-[#050806] flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle at center, #1a3322 0%, #050806 70%)` }} />

      {/* Cadeado para Admin (Topo Direito ou Discreto) */}
      <button 
        onClick={() => { setIsAdminMode(!isAdminMode); setError(''); setIdentifier(''); setPassword(''); }}
        className={`absolute top-6 right-6 p-2 rounded-full transition-all duration-500 ${isAdminMode ? 'text-[#C5A059] bg-[#C5A059]/10' : 'text-gray-700 hover:text-gray-500'}`}
        title="Acesso Administrativo"
      >
        <span className="material-symbols-outlined text-xl">{isAdminMode ? 'lock_open' : 'lock'}</span>
      </button>

      <div className="z-10 w-full max-w-xs flex flex-col items-center transition-all duration-500">
        
        {/* LOGO DOURADO */}
        <div className="mb-4 text-[#C5A059] animate-fade-in">
            <span className="material-symbols-outlined text-6xl drop-shadow-[0_0_15px_rgba(197,160,89,0.5)]">
                diamond
            </span>
        </div>

        <h1 className="text-3xl tracking-[0.2em] font-serif text-[#C5A059] mb-2">
            PROFILE<span className="text-[#DFC278] font-bold">PRO</span>
        </h1>
        
        <p className={`text-xs uppercase tracking-widest mb-10 transition-colors ${isAdminMode ? 'text-red-500 font-bold' : 'text-[#C5A059]/50'}`}>
            {isAdminMode ? 'Área Restrita' : 'Marketplace Profissional'}
        </p>

        {/* Formulário de Login (Serve para User e Admin) */}
        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4 relative">
            <div className={`transition-all duration-300 ${isAdminMode ? 'border-red-900/30' : 'border-transparent'}`}>
                <input 
                    type="text" 
                    value={identifier} 
                    onChange={e => setIdentifier(e.target.value)} 
                    className={`w-full bg-transparent border-b py-3 text-white placeholder-gray-600 outline-none transition-colors ${isAdminMode ? 'border-red-500/50 focus:border-red-500' : 'border-[#C5A059]/50 focus:border-[#C5A059]'}`} 
                    placeholder="Login ou Email" 
                />
                <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className={`w-full bg-transparent border-b py-3 text-white placeholder-gray-600 outline-none transition-colors ${isAdminMode ? 'border-red-500/50 focus:border-red-500' : 'border-[#C5A059]/50 focus:border-[#C5A059]'}`} 
                    placeholder="Senha" 
                />
            </div>
            
            {error && <p className="text-red-500 text-xs text-center font-bold bg-red-900/10 py-2 rounded animate-pulse">{error}</p>}

            <button 
                type="submit" 
                className={`mt-4 w-full border py-3 px-6 text-sm font-bold tracking-widest uppercase hover:text-[#050806] transition-all duration-300 rounded-lg ${isAdminMode ? 'border-red-500 text-red-500 hover:bg-red-500' : 'border-[#C5A059] bg-[#C5A059]/10 text-[#C5A059] hover:bg-[#C5A059]'}`}
            >
              Acessar
            </button>
        </form>

        {/* Área de Visitante (Apenas ícones sociais) - Oculta se estiver em modo Admin */}
        {!isAdminMode && (
            <div className="mt-12 w-full flex flex-col items-center animate-fade-in">
                <div className="flex items-center w-full gap-2 mb-6">
                    <div className="h-[1px] bg-white/10 flex-1"></div>
                    <span className="text-[10px] text-gray-600 uppercase tracking-widest">Visitante</span>
                    <div className="h-[1px] bg-white/10 flex-1"></div>
                </div>

                <div className="flex gap-6">
                    {/* Instagram Style */}
                    <button onClick={() => handleVisitorAccess('Instagram')} className="group relative w-12 h-12 rounded-full border border-white/10 flex items-center justify-center overflow-hidden hover:border-pink-500 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500 via-red-500 to-purple-600 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        <span className="text-gray-400 group-hover:text-white transition-colors font-bold text-xl">IG</span>
                    </button>
                    
                    {/* Facebook Style */}
                    <button onClick={() => handleVisitorAccess('Facebook')} className="group w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:border-blue-600 hover:bg-blue-600/10 transition-colors">
                        <span className="text-gray-400 group-hover:text-blue-500 transition-colors font-bold text-xl">fb</span>
                    </button>
                    
                    {/* Email Style */}
                    <button onClick={() => handleVisitorAccess('Email')} className="group w-12 h-12 rounded-full border border-white/10 flex items-center justify-center hover:border-white hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-gray-400 group-hover:text-white transition-colors">mail</span>
                    </button>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default Login;
