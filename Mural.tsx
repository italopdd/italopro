
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface Post {
  id: number;
  userId: number | string; 
  text: string;
  image?: string;
  time: string; 
  user: string;
  avatar: string;
  tags?: string[];
  likes: number;
  role?: string; 
  visible?: boolean; // Novo
  hiddenAt?: string; // Novo
  relatedUserId?: string; // Novo
}

const Mural: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Usuário Atual
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Estados
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Estado para edição
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');

  const [posts, setPosts] = useState<Post[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);

  const STORAGE_KEY = 'app_posts';

  // Carregar dados iniciais e LIMPEZA DE POSTS EXPIRADOS
  useEffect(() => {
    // Carrega user atual
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
    }

    // Carrega Favoritos (Lista de Profissionais do Visitante)
    const storedFavs = localStorage.getItem('client_favorites');
    if (storedFavs) {
        setFavorites(JSON.parse(storedFavs));
    }

    // Carrega Posts e Executa Limpeza 24h
    const storedPosts = localStorage.getItem(STORAGE_KEY);
    if (storedPosts) {
        let loadedPosts: Post[] = JSON.parse(storedPosts);
        
        // --- ROTINA DE LIMPEZA ---
        const now = new Date().getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        const validPosts = loadedPosts.filter(p => {
            // Se estiver visível (ou undefined, que assume visível), mantém
            if (p.visible !== false) return true;
            
            // Se estiver invisível, checa o tempo
            if (p.hiddenAt) {
                const hiddenTime = new Date(p.hiddenAt).getTime();
                // Se passou de 24h, retorna false (remove do array)
                if (now - hiddenTime > twentyFourHours) {
                    return false; 
                }
            }
            return true;
        });
        
        // Se houve remoção, salva a lista limpa
        if (validPosts.length !== loadedPosts.length) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(validPosts));
        }

        setPosts(validPosts);

    } else {
        // Dados Mock Iniciais
        const initialPosts: Post[] = [
            {
              id: 1,
              userId: 'admin-1', 
              text: "Bem-vindos ao Mural Global! Aqui compartilhamos novidades e atualizações.",
              time: new Date(Date.now() - 3600000).toISOString(),
              user: "Administração",
              avatar: "",
              tags: ["#Aviso", "#Oficial"],
              likes: 45,
              role: 'SUPER_ADMIN',
              visible: true
            }
        ];
        setPosts(initialPosts);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPosts));
    }
  }, []);

  const isUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';
  const isVisitor = currentUser?.role === 'VISITOR';
  const isProfessional = currentUser?.role === 'CLIENT';

  // Salvar posts sempre que atualizar
  const savePosts = (newPosts: Post[]) => {
      setPosts(newPosts);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPosts));
  };

  // Funcionalidade: Selecionar Imagem
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Funcionalidade: Publicar Post
  const handlePost = () => {
    if (!inputText.trim() && !selectedImage) return;
    
    // Validação extra
    if (!isUserAdmin && inputText.length > 200) {
        alert("O limite é de 200 caracteres.");
        return;
    }

    const authorName = currentUser?.name || "Usuário";
    const authorAvatar = currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}`;
    const authorId = currentUser?.id || Date.now().toString();
    const authorRole = currentUser?.role || 'CLIENT';

    const newPost: Post = {
      id: Date.now(),
      userId: authorId,
      text: inputText,
      image: selectedImage || undefined,
      time: new Date().toISOString(),
      user: authorName,
      avatar: authorAvatar,
      tags: isUserAdmin ? ["#Oficial"] : [],
      likes: 0,
      role: authorRole,
      visible: true // Padrão visível
    };

    const updatedPosts = [newPost, ...posts];
    savePosts(updatedPosts);
    
    setInputText('');
    setSelectedImage(null);
  };

  // Funcionalidade: Iniciar Edição
  const startEdit = (post: Post) => {
    setEditingPostId(post.id);
    setEditText(post.text);
  };

  // Funcionalidade: Salvar Edição
  const saveEdit = (id: number) => {
    const updated = posts.map(p => p.id === id ? { ...p, text: editText } : p);
    savePosts(updated);
    setEditingPostId(null);
    setEditText('');
  };
  
  // Funcionalidade: Deletar
  const deletePost = (e: React.MouseEvent, post: Post) => {
    e.stopPropagation(); 
    if (window.confirm("Tem certeza que deseja remover esta publicação permanentemente?")) {
        const updated = posts.filter(p => p.id !== post.id);
        savePosts(updated);
    }
  };

  // Funcionalidade: Alternar Visibilidade (Ocultar/Mostrar)
  const toggleVisibility = (e: React.MouseEvent, post: Post) => {
      e.stopPropagation();
      const updated = posts.map(p => {
          if (p.id === post.id) {
              const isCurrentlyVisible = p.visible !== false;
              // Se vai ocultar, define data. Se vai mostrar, limpa data.
              return { 
                  ...p, 
                  visible: !isCurrentlyVisible,
                  hiddenAt: isCurrentlyVisible ? new Date().toISOString() : undefined
              };
          }
          return p;
      });
      savePosts(updated);
  };
  
  // Funcionalidade: Interagir (Like)
  const handleLike = (id: number) => {
    const updated = posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p);
    savePosts(updated);
  };

  // --- ADMIN ACTIONS (Para solicitações) ---
  const handleAdminAction = (action: 'PROFILE' | 'CONTACT', relatedUserId: string) => {
      // Busca usuário nos dados
      const allUsersStr = localStorage.getItem('app_users');
      const allUsers = allUsersStr ? JSON.parse(allUsersStr) : [];
      const targetUser = allUsers.find((u: any) => u.id === relatedUserId);

      if (!targetUser) {
          alert("Usuário relacionado não encontrado.");
          return;
      }

      if (action === 'PROFILE') {
          localStorage.setItem('tempProfileView', JSON.stringify(targetUser));
          navigate('/profile');
      } else if (action === 'CONTACT') {
          const phone = targetUser.phone;
          if (phone) {
              const cleanNum = phone.replace(/\D/g, '');
              window.open(`https://wa.me/55${cleanNum}`, '_blank');
          } else {
              alert("Usuário não cadastrou telefone.");
          }
      }
  };

  // Helper de Tempo
  const formatTime = (isoString: string) => {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / 86400000);

      if (diffMins < 1) return 'agora';
      if (diffMins < 60) return `há ${diffMins} min`;
      if (diffHours < 24) return `há ${diffHours} h`;
      return `há ${diffDays} d`;
  };

  // Helper para mostrar tempo restante de exclusão
  const getDeletionTime = (hiddenAt?: string) => {
      if (!hiddenAt) return null;
      const hideTime = new Date(hiddenAt).getTime();
      const expirationTime = hideTime + (24 * 60 * 60 * 1000);
      const now = new Date().getTime();
      const hoursLeft = Math.round((expirationTime - now) / (1000 * 60 * 60));
      return hoursLeft > 0 ? hoursLeft : 0;
  };

  // --- LÓGICA DE EXIBIÇÃO ---
  const getDisplayPosts = () => {
    if (!currentUser) return [];

    return posts.filter(post => {
        // --- Regras de Visibilidade ---
        // Se o post estiver oculto (visible === false), ele SÓ aparece para:
        // 1. O próprio autor (currentUser.id === post.userId)
        // 2. Admins (isUserAdmin)
        // Todos os outros usuários NÃO veem.
        if (post.visible === false) {
             const isAuthor = String(post.userId) === String(currentUser.id);
             if (!isAuthor && !isUserAdmin) {
                 return false;
             }
        }

        const isPostAdmin = post.role === 'ADMIN' || post.role === 'SUPER_ADMIN';
        
        // 1. Posts de Admin aparecem para TODOS (se visíveis)
        if (isPostAdmin) return true;

        // 2. Se sou Admin, vejo TUDO
        if (isUserAdmin) return true;

        // 3. Se sou Profissional, vejo Admin + Meus próprios posts
        if (isProfessional) {
            return String(post.userId) === String(currentUser.id);
        }

        // 4. Se sou Visitante, vejo Admin + Posts de quem eu sigo (favoritos)
        if (isVisitor) {
             return favorites.includes(post.userId) || favorites.includes(String(post.userId));
        }

        return false;
    });
  };

  const displayPosts = getDisplayPosts();

  // Placeholder dinâmico
  const getPlaceholder = () => {
      if (isUserAdmin) return "Publicar aviso oficial para todos...";
      return "Publicar no seu mural profissional...";
  };

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className={`sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b ${isUserAdmin ? 'bg-[#1A1A00] border-[#C5A059]/30' : 'bg-black/80 backdrop-blur-md border-white/10'}`}>
        <div className="flex flex-col items-center flex-1">
             <h1 className="text-white font-medium text-lg tracking-wide flex items-center gap-2">
                 {isUserAdmin ? 'Mural Global' : (isVisitor ? 'Feed & Novidades' : 'Meu Mural')}
                 {isUserAdmin && <span className="material-symbols-outlined text-[#C5A059] text-[16px]">verified</span>}
             </h1>
             <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                 {isUserAdmin ? 'Moderação' : (isVisitor ? 'Profissionais Seguidos' : 'Minhas Publicações')}
             </span>
        </div>
        
        {/* Espaçador ou Avatar */}
        <div onClick={() => navigate(isUserAdmin ? '/admin' : '/profile')} className="w-9 h-9 rounded-full bg-gray-700 overflow-hidden cursor-pointer border border-[#C5A059]/30">
           {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="Usuário" className="w-full h-full object-cover" />
           ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400">
                  {currentUser?.name?.substring(0,2).toUpperCase() || 'US'}
              </div>
           )}
        </div>
      </header>

      {/* Input Area - Apenas para Admins e Profissionais */}
      {!isVisitor && (
          <div className="px-4 py-4">
            <div className={`bg-[#1A1A1A] rounded-2xl p-3 flex flex-col gap-3 border shadow-lg ${isUserAdmin ? 'border-[#C5A059] bg-[#1A1A00]/20' : 'border-white/5'}`}>
                <div className="relative">
                    <input 
                        type="text" 
                        value={inputText}
                        onChange={(e) => {
                            if (!isUserAdmin && e.target.value.length > 200) return;
                            setInputText(e.target.value);
                        }}
                        placeholder={getPlaceholder()}
                        className="bg-transparent text-white placeholder-gray-500 outline-none w-full text-sm pr-12"
                    />
                    {!isUserAdmin && (
                        <span className={`absolute right-0 top-1/2 -translate-y-1/2 text-[10px] font-bold ${inputText.length === 200 ? 'text-red-500' : 'text-gray-600'}`}>
                            {inputText.length}/200
                        </span>
                    )}
                </div>
                
                {/* Image Preview */}
                {selectedImage && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-black/50">
                    <img src={selectedImage} alt="Preview" className="w-full h-full object-cover opacity-80" />
                    <button 
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept="image/*" 
                      className="hidden" 
                    />
                    <button 
                      onClick={handleImageClick}
                      className="text-[#C5A059] hover:text-white transition-colors p-1 flex items-center gap-2"
                      title="Carregar foto"
                    >
                        <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                        <span className="text-xs font-bold uppercase">Foto</span>
                    </button>
                    <button 
                      onClick={handlePost}
                      disabled={!inputText.trim() && !selectedImage}
                      className={`px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
                        (inputText.trim() || selectedImage) 
                          ? 'bg-[#C5A059] text-black hover:bg-[#d4b470]' 
                          : 'bg-[#2A2A2A] text-white/30 cursor-not-allowed'
                      }`}
                    >
                        {isUserAdmin ? 'Publicar Oficial' : 'Publicar'}
                    </button>
                </div>
            </div>
          </div>
      )}

      {/* Content Feed */}
      <div className="px-4 space-y-6 mt-2">
        {displayPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500 text-center">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-30">feed</span>
                {isVisitor ? (
                    <>
                        <p className="font-bold">Seu feed está vazio.</p>
                        <p className="text-xs mt-1 max-w-xs mx-auto">Adicione profissionais à sua lista para ver as postagens deles aqui.</p>
                        <button onClick={() => navigate('/visitor-dashboard')} className="mt-4 bg-[#C5A059]/20 text-[#C5A059] px-4 py-2 rounded-full text-xs font-bold uppercase">Buscar Profissionais</button>
                    </>
                ) : (
                    <p>Nenhuma publicação encontrada.</p>
                )}
            </div>
        ) : (
            displayPosts.map((post, index) => {
              const isPostAdmin = post.role === 'ADMIN' || post.role === 'SUPER_ADMIN';
              // Permissão de Edição/Exclusão/Ocultar: O dono do post OU qualquer Admin
              const canModerate = isUserAdmin || (currentUser && String(post.userId) === String(currentUser.id));
              
              const isHidden = post.visible === false;
              const hoursLeft = getDeletionTime(post.hiddenAt);
              
              const isAccessRequest = post.tags?.includes('#AdminAlert') && post.relatedUserId;

              return (
              <React.Fragment key={post.id}>
                <div className={`flex flex-col gap-3 group relative p-3 rounded-xl transition-all ${isPostAdmin ? 'bg-[#1A1A00]/40 border border-[#C5A059]/30' : (isHidden ? 'bg-[#121212] border border-red-900/40 opacity-70' : 'bg-[#121212] border border-white/5')}`}>
                    
                    {/* Badge de Invisível */}
                    {isHidden && (
                        <div className="bg-red-900/20 text-red-400 text-[10px] font-bold uppercase px-2 py-1 rounded absolute top-2 left-2 flex items-center gap-1 z-10 border border-red-900/50">
                            <span className="material-symbols-outlined text-[12px]">visibility_off</span>
                            Oculto • Apaga em {hoursLeft}h
                        </div>
                    )}

                    {/* Controles de Edição e Exclusão */}
                    {canModerate && (
                        <div className="absolute top-2 right-2 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => toggleVisibility(e, post)}
                              className={`p-1.5 rounded-full transition-colors ${isHidden ? 'bg-yellow-900/80 text-yellow-300 hover:bg-yellow-700' : 'bg-gray-700/80 text-gray-300 hover:bg-gray-600'}`}
                              title={isHidden ? "Tornar Visível" : "Deixar Invisível (Apaga em 24h)"}
                            >
                                <span className="material-symbols-outlined text-[14px]">{isHidden ? 'visibility' : 'visibility_off'}</span>
                            </button>
                            <button 
                              onClick={() => startEdit(post)}
                              className="bg-blue-900/80 p-1.5 rounded-full text-blue-300 hover:bg-blue-700 transition-colors"
                              title="Editar"
                            >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                            </button>
                            <button 
                              onClick={(e) => deletePost(e, post)}
                              className="bg-red-900/80 p-1.5 rounded-full text-red-300 hover:bg-red-700 transition-colors"
                              title="Excluir Agora"
                            >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                        </div>
                    )}

                    {post.image && (
                      <div className={`w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gray-800 relative border border-white/5 ${isHidden ? 'grayscale' : ''}`}>
                          <img 
                              src={post.image} 
                              alt="Postagem" 
                              className="w-full h-full object-cover"
                          />
                      </div>
                    )}
                    <div className="space-y-1 relative">
                        <div className="flex justify-between items-start">
                          {editingPostId === post.id ? (
                            <div className="w-full flex gap-2 mt-2">
                              <input 
                                  type="text" 
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="bg-[#1A1A1A] text-white text-[15px] p-2 rounded-lg w-full outline-none border border-primary/50"
                                  autoFocus
                              />
                              <button onClick={() => saveEdit(post.id)} className="text-primary">
                                  <span className="material-symbols-outlined">check_circle</span>
                              </button>
                            </div>
                          ) : (
                            <div className="w-full mt-1">
                                {/* User info mini header within post */}
                                <div className="flex items-center gap-3 mb-3">
                                    <img src={post.avatar || `https://ui-avatars.com/api/?name=${post.user}`} className={`w-8 h-8 rounded-full object-cover ${isPostAdmin ? 'border-2 border-[#C5A059]' : 'border border-white/10'}`} alt={post.user}/>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold ${isPostAdmin ? 'text-[#C5A059]' : 'text-white'}`}>{post.user}</span>
                                            {isPostAdmin && (
                                                <span className="material-symbols-outlined text-[#C5A059] text-[14px]" title="Administrador">verified</span>
                                            )}
                                        </div>
                                        <p className="text-[10px] text-gray-500">{formatTime(post.time)}</p>
                                    </div>
                                </div>

                                <p className={`text-gray-200 text-sm leading-relaxed pr-2 ${isHidden ? 'line-through opacity-50' : ''}`}>
                                    {post.text}
                                    {post.tags && post.tags.map(tag => (
                                    <span key={tag} className="font-semibold text-[#C5A059] ml-1">{tag}</span>
                                    ))}
                                </p>
                                
                                {/* BOTÕES DE AÇÃO PARA ADMIN (Se for solicitação) */}
                                {isAccessRequest && isUserAdmin && (
                                    <div className="mt-4 flex gap-3 p-3 bg-yellow-900/10 border border-yellow-700/30 rounded-lg">
                                        <button 
                                            onClick={() => handleAdminAction('PROFILE', post.relatedUserId!)} 
                                            className="flex-1 bg-[#C5A059] text-black text-xs font-bold py-2 rounded hover:bg-[#d4b470] flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                                            Ver Perfil
                                        </button>
                                        <button 
                                            onClick={() => handleAdminAction('CONTACT', post.relatedUserId!)} 
                                            className="flex-1 bg-green-600 text-white text-xs font-bold py-2 rounded hover:bg-green-500 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[16px]">chat</span>
                                            Contato
                                        </button>
                                    </div>
                                )}
                            </div>
                          )}
                        </div>
                        
                        {/* Interaction Bar */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                            <div className="flex items-center gap-4">
                                <button onClick={() => handleLike(post.id)} className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors group">
                                    <span className="material-symbols-outlined text-[20px] group-hover:fill-current">favorite</span>
                                    <span className="text-xs font-medium">{post.likes}</span>
                                </button>
                            </div>
                            {isPostAdmin && (
                                <span className="text-[9px] bg-[#C5A059]/20 text-[#C5A059] px-2 py-1 rounded uppercase font-bold tracking-wider">
                                    Comunicado Oficial
                                </span>
                            )}
                        </div>

                    </div>
                </div>
                
                {index < displayPosts.length - 1 && (
                  <div className="flex justify-center my-2">
                      <div className="w-1 h-1 bg-gray-800 rounded-full"></div>
                  </div>
                )}
              </React.Fragment>
            )})
        )}
      </div>

    </div>
  );
};

export default Mural;
