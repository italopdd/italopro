
import React, { useEffect, useState, PropsWithChildren, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { GoogleGenAI, Chat } from "@google/genai";
import Login from './pages/Login';
import Mural from './pages/Mural';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import ClientDashboard from './pages/ClientDashboard';
import VisitorDashboard from './pages/VisitorProfile'; 
import Clients from './pages/Clients'; 
import Agenda from './pages/Agenda';
import { BottomNav } from './components/BottomNav';
import { SwipeHandler } from './components/SwipeHandler';
import { Role } from './types';

// --- IA PAGE (Gemini Integration) ---
const AIPage = () => {
  const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
  const isVisitor = user.role === 'VISITOR';
  
  // Controle de Acesso para Visitante
  const [aiRequestStatus, setAiRequestStatus] = useState<'IDLE' | 'PENDING' | 'GRANTED'>('IDLE');

  useEffect(() => {
     if(isVisitor) {
         const status = localStorage.getItem(`ai_req_${user.id}`);
         if(status) setAiRequestStatus(status as any);
     }
  }, [isVisitor, user.id]);

  const handleRequestAccess = () => {
      setAiRequestStatus('PENDING');
      localStorage.setItem(`ai_req_${user.id}`, 'PENDING');
      
      const storedPosts = localStorage.getItem('app_posts');
      const posts = storedPosts ? JSON.parse(storedPosts) : [];
      const reqPost = {
          id: Date.now(),
          userId: 'sys',
          relatedUserId: user.id, // VINCULA O ID DO SOLICITANTE
          text: `SOLICITAÇÃO: O visitante ${user.name} solicitou acesso ao Chat de IA Interativa.`,
          time: new Date().toISOString(),
          user: 'System',
          tags: ['#AdminAlert'],
          role: 'SUPER_ADMIN',
          likes: 0
      };
      localStorage.setItem('app_posts', JSON.stringify([reqPost, ...posts]));
  };

  const [messages, setMessages] = useState<{sender: 'bot' | 'user', text: string}[]>([
      { 
          sender: 'bot', 
          text: isAdmin 
            ? `Sistema Administrativo ProfilePro v2.0\nConectado à Gemini AI.\nO banco de dados local foi indexado. Como posso auxiliar na gestão?` 
            : "Olá! Sou seu assistente virtual inteligente. Posso ajudar com dicas profissionais, dúvidas sobre o app ou criar textos para seus posts!" 
      }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Ref para manter a instância do chat ativa durante a sessão
  const chatSessionRef = useRef<Chat | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Inicializa o chat session SOMENTE se não for visitante bloqueado
  useEffect(() => {
    if(isVisitor && aiRequestStatus !== 'GRANTED') return;

    const initChat = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // CONTEXTO DO SISTEMA (RAG LOCAL)
            // Coleta dados do LocalStorage para dar "visão" à IA sobre o estado atual do App
            const dbUsers = JSON.parse(localStorage.getItem('app_users') || '[]');
            const dbPosts = JSON.parse(localStorage.getItem('app_posts') || '[]');
            const dbEvents = JSON.parse(localStorage.getItem('app_events') || '[]');

            let systemContext = "";

            if (isAdmin) {
                const stats = {
                    total_users: dbUsers.length,
                    blocked_users: dbUsers.filter((u: any) => u.status === 'BLOCKED').map((u:any) => u.name),
                    admins: dbUsers.filter((u: any) => u.role.includes('ADMIN')).map((u:any) => u.name),
                    recent_posts: dbPosts.slice(0, 5).map((p:any) => `Post de ${p.user}: "${p.text}"`),
                    user_list_summary: dbUsers.map((u: any) => `ID: ${u.id}, Nome: ${u.name}, Role: ${u.role}, Status: ${u.status}`).join('\n')
                };

                systemContext = `
                    Você é a IA Administrativa do sistema ProfilePro.
                    Seu objetivo é auxiliar o Super Admin na gestão da plataforma.
                    
                    DADOS EM TEMPO REAL DO SISTEMA (Contexto):
                    ${JSON.stringify(stats, null, 2)}
                    
                    Diretrizes:
                    1. Você tem acesso total aos dados acima. Se perguntarem "quem está bloqueado", consulte a lista 'blocked_users'.
                    2. Seja técnico, preciso e conciso. Estilo "Terminal/SysAdmin".
                    3. Se pedirem para realizar ações (deletar, banir), explique que você é um assistente de consulta e análise, e que a ação deve ser feita no Painel Admin.
                    4. Você também pode responder dúvidas gerais de tecnologia e programação.
                `;
            } else {
                systemContext = `
                    Você é o Assistente Virtual do ProfilePro, um app de networking para arquitetos e profissionais.
                    Seu objetivo é ajudar o usuário (${user.name}) a ter sucesso na plataforma.
                    
                    O que você pode fazer:
                    1. Dar dicas de como melhorar o perfil profissional.
                    2. Sugerir ideias de posts para o Mural.
                    3. Explicar como funciona a agenda (menu Agenda) e busca de clientes.
                    4. Responder perguntas gerais com criatividade e educação.
                    
                    Não invente dados de outros usuários. Foco no usuário atual.
                `;
            }

            // Seleção de modelo baseada na complexidade
            const modelName = isAdmin ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';

            chatSessionRef.current = ai.chats.create({
                model: modelName,
                config: {
                    systemInstruction: systemContext,
                }
            });

        } catch (error) {
            console.error("Erro ao iniciar Gemini AI:", error);
            setMessages(prev => [...prev, { sender: 'bot', text: 'Erro de conexão com a IA. Verifique a API Key.' }]);
        }
    };

    initChat();
  }, [isAdmin, user.name, isVisitor, aiRequestStatus]);

  const handleSend = async () => {
      if(!input.trim()) return;
      if(!chatSessionRef.current) return;
      
      const userMsg = input;
      setInput('');
      setMessages(prev => [...prev, { sender: 'user' as const, text: userMsg }]);
      setIsTyping(true);

      try {
          // Streaming Response para efeito "ChatGPT"
          const resultStream = await chatSessionRef.current.sendMessageStream({ message: userMsg });
          
          let fullResponse = "";
          let isFirstChunk = true;

          for await (const chunk of resultStream) {
              const chunkText = chunk.text;
              fullResponse += chunkText;
              
              if (isFirstChunk) {
                  // Adiciona a mensagem do bot vazia ou com o primeiro chunk
                  setMessages(prev => [...prev, { sender: 'bot', text: fullResponse }]);
                  isFirstChunk = false;
              } else {
                  // Atualiza a última mensagem do bot
                  setMessages(prev => {
                      const newArr = [...prev];
                      const lastMsg = newArr[newArr.length - 1];
                      if (lastMsg.sender === 'bot') {
                          lastMsg.text = fullResponse;
                      }
                      return newArr;
                  });
              }
          }

      } catch (error) {
          setMessages(prev => [...prev, { sender: 'bot', text: "Desculpe, tive um problema ao processar sua solicitação. Tente novamente." }]);
          console.error(error);
      } finally {
          setIsTyping(false);
      }
  };

  // RENDERIZAÇÃO CONDICIONAL PARA VISITANTE BLOQUEADO
  if(isVisitor && aiRequestStatus !== 'GRANTED') {
      return (
        <div className="min-h-screen bg-[#050806] text-white p-6 pb-24 flex flex-col items-center justify-center">
             <div className="max-w-sm w-full bg-[#1A1E1A] border border-[#C5A059]/30 rounded-2xl p-8 text-center relative overflow-hidden shadow-2xl">
                 <div className="absolute inset-0 bg-gradient-to-b from-[#C5A059]/5 to-transparent"></div>
                 
                 <div className="w-20 h-20 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-[#C5A059] relative z-10">
                    <span className="material-symbols-outlined text-[#C5A059] text-4xl">lock</span>
                 </div>
                 
                 <h2 className="text-2xl font-serif text-[#C5A059] mb-3 relative z-10">Acesso Restrito</h2>
                 <p className="text-gray-400 text-sm leading-relaxed mb-8 relative z-10">
                     A Assistente Virtual Interativa é uma ferramenta premium. Visitantes precisam de aprovação administrativa para utilizar este recurso.
                 </p>

                 {aiRequestStatus === 'PENDING' ? (
                     <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-xl text-yellow-500 font-bold animate-pulse">
                         <span className="material-symbols-outlined align-middle mr-2">hourglass_top</span>
                         Solicitação em Análise
                     </div>
                 ) : (
                     <button 
                        onClick={handleRequestAccess}
                        className="w-full bg-[#C5A059] text-black font-bold py-3 rounded-xl hover:bg-[#d4b470] shadow-lg transition-transform active:scale-95 uppercase tracking-wider relative z-10"
                     >
                         Solicitar Liberação
                     </button>
                 )}
             </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-[#050806] text-white p-6 pb-24 flex flex-col">
        <header className="mb-6 border-b border-[#C5A059]/20 pb-4">
            <h1 className="text-2xl font-serif text-[#C5A059] flex items-center gap-2">
                <span className="material-symbols-outlined">{isAdmin ? 'terminal' : 'auto_awesome'}</span>
                {isAdmin ? 'Gemini Admin Console' : 'Assistente ProfilePro'}
            </h1>
            <p className="text-xs text-gray-500">
                {isAdmin ? `Sessão Segura: ${user.name} | Model: Gemini 3 Pro` : 'Powered by Google Gemini'}
            </p>
        </header>

        <div className={`flex-1 rounded-xl flex flex-col overflow-hidden relative shadow-2xl transition-colors ${isAdmin ? 'bg-[#0A0D0A] border border-green-900/30' : 'bg-[#1A1E1A] border border-[#C5A059]/30'}`}>
            
            {/* Terminal Header for Admin */}
            {isAdmin && <div className="bg-[#050806] px-4 py-2 text-[10px] text-green-500 font-mono border-b border-white/5 flex justify-between items-center">
                <span>root@profilepro-ai:~$ ./connect_gemini_stream</span>
                <div className="flex gap-2 items-center">
                    <span className="text-xs opacity-50">v3.0</span>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                </div>
            </div>}
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-xl text-sm whitespace-pre-wrap shadow-md leading-relaxed ${
                            msg.sender === 'user' 
                                ? 'bg-[#C5A059] text-black rounded-tr-none font-bold' 
                                : isAdmin 
                                    ? 'bg-[#050806] text-green-400 font-mono border border-green-900/40 rounded-tl-none' 
                                    : 'bg-[#2A2E2A] text-gray-200 rounded-tl-none border border-white/5'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex justify-start">
                         <div className={`px-4 py-2 rounded-xl text-xs rounded-tl-none flex gap-1 items-center ${isAdmin ? 'bg-[#050806] text-green-500 border border-green-900/40' : 'bg-[#2A2E2A] text-gray-400'}`}>
                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce delay-150"></span>
                         </div>
                    </div>
                )}
                <div ref={chatEndRef}></div>
            </div>

            <div className="p-3 bg-[#101410] border-t border-[#C5A059]/10 flex gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isTyping}
                    placeholder={isAdmin ? "Enter command or query..." : "Digite sua mensagem..."} 
                    className={`flex-1 bg-[#050806] border border-white/10 rounded-lg p-3 outline-none focus:border-[#C5A059] transition-colors ${isAdmin ? 'font-mono text-sm text-green-500 placeholder-green-900' : ''}`}
                />
                <button 
                    onClick={handleSend} 
                    disabled={isTyping || !input.trim()}
                    className={`p-3 rounded-lg font-bold transition-all flex items-center justify-center ${
                        isTyping 
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                        : 'bg-[#C5A059] text-black hover:bg-[#d4b470]'
                    }`}
                >
                    <span className="material-symbols-outlined">send</span>
                </button>
            </div>
        </div>
    </div>
  );
};

// --- MIDDLEWARE DE PROTEÇÃO DE ROTAS ---
const ProtectedRoute = ({ children, allowedRoles }: PropsWithChildren<{ allowedRoles: Role[] }>) => {
  const userString = localStorage.getItem('currentUser');
  const user = userString ? JSON.parse(userString) : null;
  
  if (!user) return <Navigate to="/" replace />;
  if (!allowedRoles.includes(user.role)) {
      // Redirecionamento inteligente baseado na role real
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return <Navigate to="/admin" replace />;
      if (user.role === 'CLIENT' || user.role === 'COMPANY') return <Navigate to="/client-dashboard" replace />;
      if (user.role === 'VISITOR') return <Navigate to="/visitor-dashboard" replace />;
      return <Navigate to="/" replace />;
  }

  return <SwipeHandler>{children}</SwipeHandler>;
};

// --- ADMIN FLOATING BUTTON ---
// Botão flutuante global para retornar ao painel
const AdminFloatingButton = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    const userString = localStorage.getItem('currentUser');
    const user = userString ? JSON.parse(userString) : null;
    const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
    
    // Só mostra se for Admin e NÃO estiver no painel admin e NÃO estiver na login
    if (!isAdmin || location.pathname.startsWith('/admin') || location.pathname === '/') return null;

    return (
        <button
            onClick={() => navigate('/admin')}
            className="fixed bottom-24 right-4 z-[60] bg-[#C5A059] text-black p-3 rounded-full shadow-[0_0_20px_rgba(197,160,89,0.5)] border-2 border-black hover:scale-110 transition-transform animate-fade-in flex items-center justify-center group"
            title="Voltar ao Painel Admin"
        >
            <span className="material-symbols-outlined text-[24px]">admin_panel_settings</span>
            <span className="absolute right-full mr-2 bg-black text-[#C5A059] text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Voltar ao Painel
            </span>
        </button>
    );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="antialiased text-slate-900 dark:text-white min-h-screen relative bg-[#050806]">
        {/* Renderiza o botão flutuante para admins fora do painel */}
        <AdminFloatingButton />
        
        <Routes>
          {/* Rota Pública */}
          <Route path="/" element={<Login />} />

          {/* Rotas SUPER ADMIN & ADMIN */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN']}>
              <AdminPanel />
            </ProtectedRoute>
          } />

          {/* Rotas CLIENTE (Profissional) & EMPRESA */}
          <Route path="/client-dashboard" element={
            <ProtectedRoute allowedRoles={['CLIENT', 'COMPANY']}>
              <ClientDashboard />
            </ProtectedRoute>
          } />

          {/* Rotas VISITANTE */}
          <Route path="/visitor-dashboard" element={
            <ProtectedRoute allowedRoles={['VISITOR']}>
              <VisitorDashboard />
            </ProtectedRoute>
          } />

          {/* Rotas COMPARTILHADAS */}
          <Route path="/mural" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'COMPANY', 'VISITOR']}>
              <Mural />
            </ProtectedRoute>
          } />
          
          <Route path="/agenda" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'COMPANY', 'VISITOR']}>
              <Agenda />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'COMPANY', 'VISITOR']}>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/clients" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'COMPANY']}>
              <Clients />
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'COMPANY', 'VISITOR']}>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="/ai" element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ADMIN', 'CLIENT', 'COMPANY', 'VISITOR']}>
              <AIPage />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </div>
    </HashRouter>
  );
};

export default App;
