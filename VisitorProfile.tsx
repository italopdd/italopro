
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Post } from '../types';

const CATEGORIES = [
  "Todos", 
  "Advogado", 
  "Professor", 
  "Personal Trainer", 
  "Médico", 
  "Gerente", 
  "Farmácia", 
  "Mercado", 
  "Mecânica", 
  "Mecânico",
  "Arquiteto",
  "Designer",
  "Consultor",
  "Dentista"
];

const VisitorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [professionals, setProfessionals] = useState<User[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Estado das Abas, Busca e Categoria
  const [activeTab, setActiveTab] = useState<'SEARCH' | 'FAVORITES'>('SEARCH');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  
  // Estados de Modal
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [selectedPro, setSelectedPro] = useState<User | null>(null);
  const [privateMsg, setPrivateMsg] = useState('');

  useEffect(() => {
    // Carregar usuário atual
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
    }

    // Carregar profissionais
    const allUsers = JSON.parse(localStorage.getItem('app_users') || '[]');
    setProfessionals(allUsers.filter((u: User) => u.role === 'CLIENT' && u.status === 'ACTIVE' && u.isVisible !== false));

    // Carregar Favoritos
    const storedFavs = localStorage.getItem('client_favorites');
    if (storedFavs) {
        setFavorites(JSON.parse(storedFavs));
    }
  }, []);

  const handleToggleFavorite = (proId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      let newFavs;
      if (favorites.includes(proId)) {
          newFavs = favorites.filter(id => id !== proId);
      } else {
          newFavs = [...favorites, proId];
      }
      setFavorites(newFavs);
      localStorage.setItem('client_favorites', JSON.stringify(newFavs));
  };

  const handleWhatsApp = (phone: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const cleanNum = phone.replace(/\D/g, '');
      if (cleanNum) window.open(`https://wa.me/55${cleanNum}`, '_blank');
  };

  const openPrivateMsg = (pro: User, e: React.MouseEvent) => {
      e.stopPropagation();
      setSelectedPro(pro);
      setShowMsgModal(true);
  };

  const sendPrivateMessage = () => {
      if (!currentUser || !selectedPro || !privateMsg.trim()) return;

      const storedPosts = localStorage.getItem('app_posts');
      const currentPosts: Post[] = storedPosts ? JSON.parse(storedPosts) : [];

      const newPost: Post = {
          id: Date.now(),
          userId: currentUser.id,
          user: currentUser.name,
          avatar: currentUser.avatar || '',
          text: privateMsg,
          time: new Date().toISOString(),
          likes: 0,
          role: 'VISITOR',
          tags: ['#Private', `#To:${selectedPro.id}`],
          visible: true 
      };

      localStorage.setItem('app_posts', JSON.stringify([newPost, ...currentPosts]));
      
      alert(`Mensagem privada enviada para o mural de ${selectedPro.name}.`);
      setPrivateMsg('');
      setShowMsgModal(false);
      setSelectedPro(null);
  };

  // --- LÓGICA DE FILTRAGEM ---
  const filteredPros = professionals.filter(p => {
      // 1. REGRA: Se estiver nos favoritos, remove da lista de busca (constar APENAS nos favoritos)
      if (favorites.includes(p.id)) return false;

      // 2. REGRA: Filtro por Categoria (Profissão)
      // Normaliza para comparação (remove acentos se necessário, mas aqui faremos includes simples)
      const pProf = (p.profession || '').toLowerCase();
      const pSpecs = (p.specialties || []).map(s => s.toLowerCase());
      const catLower = selectedCategory.toLowerCase();

      const matchesCategory = selectedCategory === 'Todos' || 
                              pProf.includes(catLower) || 
                              pSpecs.some(s => s.includes(catLower));

      if (!matchesCategory) return false;

      // 3. REGRA: Busca por Nome ou Profissão
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = p.name.toLowerCase().includes(searchLower) || 
                            pProf.includes(searchLower) ||
                            pSpecs.some(s => s.includes(searchLower));

      return matchesSearch;
  });

  const favoritePros = professionals.filter(p => favorites.includes(p.id));

  // Componente de Card de Profissional (Reutilizável)
  const ProfessionalCard: React.FC<{ pro: User, isFav: boolean }> = ({ pro, isFav }) => (
    <div className="bg-[#1A1E1A] p-4 rounded-xl border border-white/5 flex gap-4 hover:border-[#C5A059]/50 transition-colors cursor-pointer group relative animate-fade-in" onClick={() => { localStorage.setItem('tempProfileView', JSON.stringify(pro)); navigate('/profile'); }}>
        
        {/* Botão Favoritar (Absoluto) */}
        <button 
            onClick={(e) => handleToggleFavorite(pro.id, e)}
            className={`absolute top-3 right-3 p-1.5 rounded-full transition-colors z-10 ${isFav ? 'text-[#C5A059] bg-[#C5A059]/10' : 'text-gray-600 hover:text-[#C5A059] bg-black/20'}`}
            title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
        >
            <span className={`material-symbols-outlined text-[18px] ${isFav ? 'fill-current' : ''}`}>{isFav ? 'favorite' : 'favorite_border'}</span>
        </button>

        <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center text-[#C5A059] overflow-hidden border border-white/10 group-hover:border-[#C5A059] transition-colors flex-shrink-0">
            {pro.avatar ? <img src={pro.avatar} className="w-full h-full object-cover"/> : <span className="font-serif font-bold text-lg">{pro.name.charAt(0)}</span>}
        </div>
        
        <div className="flex-1 pr-8">
            <h3 className="font-bold text-white group-hover:text-[#C5A059] transition-colors">{pro.name}</h3>
            <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{pro.profession || pro.specialties?.[0] || 'Profissional'}</p>
            
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={(e) => openPrivateMsg(pro, e)} className="text-[10px] bg-white/5 px-3 py-1.5 rounded border border-white/10 hover:bg-white/10 text-gray-300 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">lock</span> Mensagem
                </button>
                
                {pro.whatsappEnabled && (
                    <button onClick={(e) => handleWhatsApp(pro.phone || '', e)} className="text-[10px] bg-green-500/10 text-green-400 px-3 py-1.5 rounded border border-green-500/30 hover:bg-green-500 hover:text-black font-bold flex items-center gap-1 transition-colors">
                        WhatsApp
                    </button>
                )}
            </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050806] pb-24 text-white font-sans relative flex flex-col">
        
        {/* MODAL DE MENSAGEM PRIVADA */}
        {showMsgModal && selectedPro && (
            <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-[#1A1E1A] border border-[#C5A059]/30 p-6 rounded-2xl max-w-sm w-full relative">
                    <button onClick={() => setShowMsgModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                    <h3 className="text-[#C5A059] font-serif mb-1">Mensagem Privada</h3>
                    <p className="text-gray-500 text-xs mb-4">Para: <span className="text-white font-bold">{selectedPro.name}</span></p>
                    
                    <textarea 
                        value={privateMsg}
                        onChange={(e) => setPrivateMsg(e.target.value)}
                        className="w-full bg-[#050806] border border-white/10 rounded-xl p-3 text-white text-sm h-32 outline-none focus:border-[#C5A059] resize-none mb-4"
                        placeholder="Escreva sua mensagem aqui... Ela aparecerá no mural do profissional, visível apenas para vocês."
                    />
                    
                    <button onClick={sendPrivateMessage} className="w-full bg-[#C5A059] text-black font-bold py-3 rounded-lg hover:bg-[#d4b470] flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined">send</span> Enviar
                    </button>
                </div>
            </div>
        )}

        <header className="sticky top-0 bg-[#050806]/95 backdrop-blur-md z-40 px-6 pt-6 pb-2 border-b border-[#C5A059]/10 shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h1 className="text-2xl font-serif text-[#C5A059]">Explorar</h1>
                    <p className="text-xs text-gray-500">Conecte-se com profissionais</p>
                </div>
            </div>

            {/* TAB SWITCHER */}
            <div className="flex p-1 bg-[#1A1E1A] rounded-xl border border-white/5 mb-2">
                <button 
                    onClick={() => setActiveTab('SEARCH')} 
                    className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'SEARCH' ? 'bg-[#C5A059] text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                    <span className="material-symbols-outlined text-[16px]">search</span> Buscar
                </button>
                <button 
                    onClick={() => setActiveTab('FAVORITES')} 
                    className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'FAVORITES' ? 'bg-[#C5A059] text-black shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                >
                    <span className="material-symbols-outlined text-[16px] fill-current">favorite</span> Favoritos
                    {favoritePros.length > 0 && <span className="bg-black/20 px-1.5 py-0.5 rounded text-[9px]">{favoritePros.length}</span>}
                </button>
            </div>
        </header>

        <main className="flex-1 p-4 overflow-y-auto">
            
            {/* CONTEÚDO DA ABA DE BUSCA */}
            {activeTab === 'SEARCH' && (
                <div className="space-y-6 animate-slide-in">
                    
                    {/* Barra de Pesquisa */}
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">search</span>
                        <input 
                            type="text" 
                            placeholder="Buscar por nome ou profissão..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1A1E1A] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:border-[#C5A059] outline-none placeholder-gray-600 transition-colors"
                        />
                    </div>

                    {/* Filtro de Categorias (Horizontal Scroll) */}
                    <div>
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 ml-1">Categorias</h2>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                        selectedCategory === cat 
                                        ? 'bg-[#C5A059] text-black border-[#C5A059]' 
                                        : 'bg-[#1A1E1A] text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Resultados */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-1 ml-1">
                            <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Resultados</h2>
                            <span className="text-[10px] text-gray-600">{filteredPros.length} encontrados</span>
                        </div>
                        
                        {filteredPros.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 opacity-50">
                                <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                                <p className="text-xs text-center">Nenhum profissional encontrado com estes filtros.</p>
                                {favorites.length > 0 && <p className="text-[10px] text-[#C5A059] mt-2">Verifique sua aba de Favoritos.</p>}
                            </div>
                        ) : (
                            filteredPros.map(pro => (
                                <ProfessionalCard key={pro.id} pro={pro} isFav={false} />
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* CONTEÚDO DA ABA DE FAVORITOS */}
            {activeTab === 'FAVORITES' && (
                <div className="space-y-4 animate-slide-in">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <h2 className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059]">Meus Profissionais Salvos</h2>
                    </div>
                    
                    {favoritePros.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-white/10 rounded-2xl bg-[#1A1E1A]/30">
                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl opacity-30">favorite_border</span>
                            </div>
                            <h3 className="font-bold text-white mb-1">Lista Vazia</h3>
                            <p className="text-xs max-w-[200px] text-center leading-relaxed">
                                Você ainda não favoritou nenhum profissional. Vá para a aba <strong className="text-[#C5A059]">BUSCAR</strong> para encontrar especialistas.
                            </p>
                            <button onClick={() => setActiveTab('SEARCH')} className="mt-6 text-[#C5A059] text-xs font-bold uppercase tracking-wide border-b border-[#C5A059] pb-0.5">
                                Começar a buscar
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {favoritePros.map(pro => (
                                <ProfessionalCard key={pro.id} pro={pro} isFav={true} />
                            ))}
                        </div>
                    )}
                </div>
            )}

        </main>
    </div>
  );
};

export default VisitorDashboard;
