
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Role } from '../types';

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const userString = localStorage.getItem('currentUser');
  const user = userString ? JSON.parse(userString) : null;
  const role: Role | null = user ? user.role : null;

  if (!role || location.pathname === '/' || location.pathname.startsWith('/admin')) return null;

  // Navegação do PROFISSIONAL (CLIENT) e EMPRESA (COMPANY)
  const clientNav = [
    { label: 'Mural', icon: 'grid_view', path: '/mural' },
    { label: 'Clientes', icon: 'groups', path: '/clients' },
    { label: 'IA', icon: 'psychology', path: '/ai' },
    { label: 'Agenda', icon: 'calendar_month', path: '/agenda' },
    { label: 'Perfil', icon: 'person', path: '/profile' },
  ];

  // Navegação do VISITANTE (VISITOR)
  const visitorNav = [
    { label: 'Mural', icon: 'feed', path: '/mural' },
    { label: 'Profs', icon: 'search', path: '/visitor-dashboard' }, // Busca
    { label: 'IA', icon: 'smart_toy', path: '/ai' },
    { label: 'Agenda', icon: 'event', path: '/agenda' },
    { label: 'Perfil', icon: 'account_circle', path: '/profile' },
  ];

  // Navegação do ADMIN (Agora completa para navegar no App)
  const adminNav = [
    { label: 'Mural', icon: 'dashboard', path: '/mural' },
    { label: 'Usuários', icon: 'group_add', path: '/clients' }, // Visualiza todos
    { label: 'IA', icon: 'smart_toy', path: '/ai' },
    { label: 'Agenda', icon: 'calendar_month', path: '/agenda' },
    { label: 'Meu Perfil', icon: 'admin_panel_settings', path: '/profile' },
  ];

  let navItems = [];
  if (role === 'CLIENT' || role === 'COMPANY') navItems = clientNav;
  else if (role === 'VISITOR') navItems = visitorNav;
  else if (role === 'ADMIN' || role === 'SUPER_ADMIN') navItems = adminNav;

  const handleNavigation = (path: string) => {
      // Se for para o perfil, limpa qualquer visualização temporária (admin vendo outro user)
      if (path === '/profile') {
          localStorage.removeItem('tempProfileView');
      }
      navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#050806]/95 backdrop-blur-md border-t border-[#C5A059]/20 pb-6 pt-3 px-2 z-50">
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className="flex flex-col items-center gap-1 min-w-[50px] group"
            >
              <div className={`p-1 rounded-xl transition-all duration-300 ${isActive ? 'bg-[#C5A059]/10' : 'bg-transparent'}`}>
                <span 
                    className={`material-symbols-outlined text-[24px] transition-colors duration-200 ${
                    isActive ? 'text-[#C5A059]' : 'text-gray-500 group-hover:text-gray-300'
                    }`}
                >
                    {item.icon}
                </span>
              </div>
              <span 
                className={`text-[9px] font-bold uppercase tracking-wider transition-colors duration-200 ${
                  isActive ? 'text-[#C5A059]' : 'text-gray-600'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
