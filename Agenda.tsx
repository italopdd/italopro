
import React, { useState, useEffect, useRef } from 'react';
import { Event, User } from '../types';
import { useNavigate } from 'react-router-dom';

interface Alert {
    id: string;
    eventId: string;
    title: string;
    message: string;
    time: string;
    type: 'WARNING' | 'URGENT';
}

const Agenda: React.FC = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // Data State
  const [events, setEvents] = useState<Event[]>([]);
  
  // Notification State
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [showAlertPanel, setShowAlertPanel] = useState(false);
  
  // AI & Interaction State
  const [aiInput, setAiInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [chatHistory, setChatHistory] = useState<{sender: 'user' | 'ai', text: string}[]>([
      { sender: 'ai', text: 'Olá! Diga algo como "Advogado dia 25 às 17h" ou apenas "Reunião amanhã".' }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Permissão de IA para Visitante
  const [aiRequestStatus, setAiRequestStatus] = useState<'IDLE' | 'PENDING' | 'GRANTED'>('IDLE');

  // Estado para o Card de Confirmação
  const [pendingEvent, setPendingEvent] = useState<Partial<Event> | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) return;
    const user = JSON.parse(userStr);
    setCurrentUser(user);

    // Check AI Permission for Visitors
    const reqStatus = localStorage.getItem(`ai_req_${user.id}`);
    if(reqStatus) setAiRequestStatus(reqStatus as any);

    // Load Events
    const storedEvents = localStorage.getItem('app_events');
    if (storedEvents) {
        setEvents(JSON.parse(storedEvents));
    } else {
        const today = new Date();
        const mock: Event[] = [
            { 
                id: '1', 
                title: 'REUNIÃO', 
                date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0).toISOString(), 
                time: '14:00', 
                status: 'CONFIRMED', 
                professionalId: user.id, 
                visitorId: 'mock', 
                createdAt: new Date().toISOString() 
            }
        ];
        setEvents(mock);
        localStorage.setItem('app_events', JSON.stringify(mock));
    }
  }, []);

  // --- NOTIFICATION SYSTEM ---
  useEffect(() => {
    const checkAlerts = () => {
        const now = new Date();
        const newAlerts: Alert[] = [];

        events.forEach(evt => {
            if (evt.status !== 'CONFIRMED') return;

            // Combinar Data ISO com Hora String HH:MM para ter precisão
            const evtDate = new Date(evt.date);
            const [hours, minutes] = evt.time.split(':').map(Number);
            evtDate.setHours(hours, minutes, 0, 0);

            const diffMs = evtDate.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            // Regra 1: Aviso de 24 horas (Considerando uma margem de 23h a 24h)
            if (diffHours > 23 && diffHours <= 24) {
                newAlerts.push({
                    id: `24h-${evt.id}`,
                    eventId: evt.id,
                    title: 'Lembrete de 24h',
                    message: `O evento "${evt.title}" é amanhã às ${evt.time}.`,
                    time: 'Amanhã',
                    type: 'WARNING'
                });
            }

            // Regra 2: Aviso de 60 minutos (Considerando margem de 0 a 1h)
            if (diffHours > 0 && diffHours <= 1) {
                const minutesLeft = Math.ceil(diffHours * 60);
                newAlerts.push({
                    id: `1h-${evt.id}`,
                    eventId: evt.id,
                    title: 'Começa em Breve',
                    message: `O evento "${evt.title}" começa em ${minutesLeft} minutos.`,
                    time: 'Agora',
                    type: 'URGENT'
                });
            }
        });

        if (newAlerts.length > 0) {
            setAlerts(prev => {
                const uniqueAlerts = [...prev];
                newAlerts.forEach(na => {
                    if (!uniqueAlerts.find(a => a.id === na.id)) {
                        uniqueAlerts.push(na);
                    }
                });
                return uniqueAlerts;
            });
        }
    };

    checkAlerts();
    const interval = setInterval(checkAlerts, 30000); 
    return () => clearInterval(interval);
  }, [events]);

  const dismissAlert = (id: string) => {
      setAlerts(prev => prev.filter(a => a.id !== id));
  };


  useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, pendingEvent]); 

  const saveEvents = (newEvents: Event[]) => {
      setEvents(newEvents);
      localStorage.setItem('app_events', JSON.stringify(newEvents));
  };

  // --- CALENDAR HELPERS ---
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const generateCalendarDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const startDay = firstDayOfMonth(currentDate);
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);
    return days;
  };

  const isToday = (day: number) => {
      const today = new Date();
      return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  const isSelected = (day: number) => {
      return day === selectedDate.getDate() && currentDate.getMonth() === selectedDate.getMonth() && currentDate.getFullYear() === selectedDate.getFullYear();
  };

  const hasEvent = (day: number) => {
      return events.some(e => {
          const eDate = new Date(e.date);
          return eDate.getDate() === day && eDate.getMonth() === currentDate.getMonth() && eDate.getFullYear() === currentDate.getFullYear() && e.status !== 'CANCELED';
      });
  };

  const handleDayClick = (day: number) => {
      setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
  };

  // --- ACTIONS ---

  const handleEditEvent = (evt: Event) => {
      setPendingEvent(evt);
      setChatHistory(prev => [...prev, { sender: 'ai', text: `Abrindo edição para "${evt.title}".` }]);
  };

  const handleToggleStatus = (evt: Event) => {
      const newStatus: Event['status'] = evt.status === 'CANCELED' ? 'CONFIRMED' : 'CANCELED';
      const updatedEvents = events.map(e => e.id === evt.id ? { ...e, status: newStatus } : e);
      saveEvents(updatedEvents);
  };

  // --- INTELLIGENT PARSER (NLP) ---

  const processAiCommand = (text: string) => {
      const lowerText = text.toLowerCase();
      
      if ((lowerText.includes('cancelar') || lowerText.includes('não')) && pendingEvent) {
          setPendingEvent(null);
          setChatHistory(prev => [...prev, { sender: 'ai', text: 'Cancelado.' }]);
          return;
      }

      let categoryTitle = "";
      
      if (lowerText.includes('reun') || lowerText.includes('meet')) categoryTitle = "REUNIÃO";
      else if (lowerText.includes('med') || lowerText.includes('dr') || lowerText.includes('doutor') || lowerText.includes('hosp')) categoryTitle = "MÉDICO";
      else if (lowerText.includes('dent')) categoryTitle = "DENTISTA";
      else if (lowerText.includes('advog') || lowerText.includes('jurid')) categoryTitle = "ADVOGADO";
      else if (lowerText.includes('consult')) categoryTitle = "CONSULTA";
      else if (lowerText.includes('orç')) categoryTitle = "ORÇAMENTO";
      else if (lowerText.includes('proj')) categoryTitle = "PROJETO";
      else if (lowerText.includes('visit')) categoryTitle = "VISITA";
      else if (lowerText.includes('almoç')) categoryTitle = "ALMOÇO";
      else if (lowerText.includes('jant')) categoryTitle = "JANTAR";
      else if (lowerText.includes('trein') || lowerText.includes('academ')) categoryTitle = "ACADEMIA";
      
      if (!categoryTitle && lowerText.match(/marcar|agendar|criar|nova|novo/)) {
          categoryTitle = "COMPROMISSO";
      }

      if (!categoryTitle && text.length < 3) {
           setChatHistory(prev => [...prev, { sender: 'ai', text: "Não entendi. Tente 'Reunião dia 15'." }]);
           return;
      }

      if (!categoryTitle) categoryTitle = "COMPROMISSO";

      const now = new Date();
      let targetDay = now.getDate();
      let targetMonth = now.getMonth();
      let targetYear = now.getFullYear();
      let dateFound = false;

      if (lowerText.includes('amanhã') || lowerText.includes('amanha')) {
          const tmrw = new Date();
          tmrw.setDate(tmrw.getDate() + 1);
          targetDay = tmrw.getDate();
          targetMonth = tmrw.getMonth();
          targetYear = tmrw.getFullYear();
          dateFound = true;
      } else if (lowerText.includes('hoje')) {
          dateFound = true;
      } else {
          const dayMatch = lowerText.match(/(?:dia|em)?\s*(\d{1,2})/g);
          if (dayMatch) {
              for (const match of dayMatch) {
                  const numStr = match.replace(/\D/g, '');
                  const num = parseInt(numStr);
                  const isTimeContext = lowerText.includes(`as ${num}`) || lowerText.includes(`às ${num}`) || lowerText.includes(`${num}h`) || lowerText.includes(`${num}:`);
                  
                  if (num > 0 && num <= 31 && !isTimeContext) {
                      targetDay = num;
                      dateFound = true;
                      if (targetDay < now.getDate()) {
                          targetMonth++;
                          if (targetMonth > 11) { targetMonth = 0; targetYear++; }
                      }
                      break;
                  }
              }
          }
      }

      let hour = 9; 
      let minute = 0;
      
      const timeMatch = lowerText.match(/(?:às|as|ás|at|h|:|das)\s*(\d{1,2})(:(\d{2}))?/) || lowerText.match(/(\d{1,2})(?:h|:)/);
      
      if (timeMatch) {
          const h = parseInt(timeMatch[1] || timeMatch[0].replace(/\D/g,''));
          if (h >= 0 && h <= 23) {
              hour = h;
              if (timeMatch[3]) minute = parseInt(timeMatch[3]);
          }
      } else if (!dateFound && !timeMatch) {
          const tmrw = new Date();
          tmrw.setDate(tmrw.getDate() + 1);
          targetDay = tmrw.getDate();
          targetMonth = tmrw.getMonth();
          targetYear = tmrw.getFullYear();
      }

      const finalDate = new Date(targetYear, targetMonth, targetDay, hour, minute);

      const draftEvent: Partial<Event> = {
          id: Date.now().toString(),
          title: categoryTitle,
          date: finalDate.toISOString(),
          time: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          status: 'CONFIRMED',
          professionalId: currentUser?.id || 'sys',
          visitorId: 'ai',
          createdAt: new Date().toISOString()
      };

      setPendingEvent(draftEvent);
      setChatHistory(prev => [...prev, { sender: 'ai', text: `Entendi: ${categoryTitle}. Verifique e confirme.` }]);
  };

  const confirmPendingEvent = () => {
      if (pendingEvent && currentUser) {
          const existingIndex = events.findIndex(e => e.id === pendingEvent.id);
          let updatedEvents;

          if (existingIndex >= 0) {
              updatedEvents = [...events];
              updatedEvents[existingIndex] = { ...updatedEvents[existingIndex], ...pendingEvent } as Event;
          } else {
              updatedEvents = [...events, pendingEvent as Event];
          }

          saveEvents(updatedEvents);
          setChatHistory(prev => [...prev, { sender: 'ai', text: `Agendado para ${pendingEvent.time}.` }]);
          const pDate = new Date(pendingEvent.date!);
          setSelectedDate(pDate);
          setCurrentDate(new Date(pDate.getFullYear(), pDate.getMonth(), 1));
          setPendingEvent(null);
      }
  };

  const cancelPendingEvent = () => {
      setPendingEvent(null);
      setChatHistory(prev => [...prev, { sender: 'ai', text: 'Ok, descartado.' }]);
  };

  const handleSendMessage = () => {
      if (!aiInput.trim()) return;
      const text = aiInput;
      setChatHistory(prev => [...prev, { sender: 'user', text: text }]);
      setAiInput('');
      
      setTimeout(() => {
          processAiCommand(text);
      }, 400);
  };

  const toggleRecording = () => {
      if (isRecording) {
          setIsRecording(false);
          setAiInput(`marque tambem para dia 25 advogado as 17`);
      } else {
          setIsRecording(true);
      }
  };

  const handleRequestAccess = () => {
      if (!currentUser) return;
      setAiRequestStatus('PENDING');
      localStorage.setItem(`ai_req_${currentUser.id}`, 'PENDING');
      
      // Notificação Admin
      const storedPosts = localStorage.getItem('app_posts');
      const posts = storedPosts ? JSON.parse(storedPosts) : [];
      const reqPost = {
          id: Date.now(),
          userId: 'sys',
          relatedUserId: currentUser.id, // VINCULA O ID DO SOLICITANTE
          text: `SOLICITAÇÃO: O visitante ${currentUser.name} solicitou acesso ao Auto Agendamento por IA.`,
          time: new Date().toISOString(),
          user: 'System',
          tags: ['#AdminAlert'],
          role: 'SUPER_ADMIN',
          likes: 0
      };
      localStorage.setItem('app_posts', JSON.stringify([reqPost, ...posts]));
      alert("Solicitação enviada. Aguarde aprovação.");
  };

  // --- FILTER EVENTS ---
  const selectedEvents = events.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getDate() === selectedDate.getDate() && 
             eDate.getMonth() === selectedDate.getMonth() && 
             eDate.getFullYear() === selectedDate.getFullYear();
  });

  if (!currentUser) return null;

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  const isVisitorAndBlocked = currentUser.role === 'VISITOR' && aiRequestStatus !== 'GRANTED';

  return (
    <div className="min-h-screen bg-[#050806] text-white p-4 pb-24 flex flex-col md:flex-row gap-6 relative">
        
        {/* MODAL DE ALERTAS / NOTIFICAÇÕES */}
        {showAlertPanel && (
            <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-end p-4 pt-16 animate-fade-in" onClick={() => setShowAlertPanel(false)}>
                <div className="bg-[#1A1E1A] border border-[#C5A059] w-full max-w-xs rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="bg-[#0A0D0A] p-3 border-b border-[#C5A059]/30 flex justify-between items-center">
                        <h3 className="text-[#C5A059] font-bold text-sm flex items-center gap-2">
                            <span className="material-symbols-outlined">notifications</span> Avisos
                        </h3>
                        <button onClick={() => setShowAlertPanel(false)} className="text-gray-500 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-2">
                        {alerts.length === 0 ? (
                            <p className="text-gray-500 text-xs text-center py-4">Nenhum aviso no momento.</p>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} className={`p-3 rounded-lg border flex gap-3 ${alert.type === 'URGENT' ? 'bg-red-900/10 border-red-500/30' : 'bg-yellow-900/10 border-[#C5A059]/30'}`}>
                                    <span className="material-symbols-outlined text-lg mt-1">
                                        {alert.type === 'URGENT' ? 'warning' : 'schedule'}
                                    </span>
                                    <div className="flex-1">
                                        <h4 className={`text-xs font-bold uppercase ${alert.type === 'URGENT' ? 'text-red-400' : 'text-[#C5A059]'}`}>{alert.title}</h4>
                                        <p className="text-xs text-white mt-1">{alert.message}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[9px] text-gray-500">{alert.time}</span>
                                            <button onClick={() => dismissAlert(alert.id)} className="text-[9px] uppercase font-bold text-gray-400 hover:text-white">Dispensar</button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* CARD DE CONFIRMAÇÃO / EDIÇÃO (OVERLAY) */}
        {pendingEvent && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
                <div className="bg-[#1A1E1A] border border-[#C5A059] p-6 rounded-2xl shadow-[0_0_30px_rgba(197,160,89,0.2)] max-w-sm w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#C5A059] to-transparent"></div>
                    
                    <div className="text-center mb-6">
                        <span className="material-symbols-outlined text-4xl text-[#C5A059] mb-2">event_available</span>
                        <h3 className="text-xl font-serif text-white">{events.find(e => e.id === pendingEvent.id) ? 'Editar Evento' : 'Confirmar?'}</h3>
                        <p className="text-xs text-gray-400 mt-1">Verifique os dados extraídos:</p>
                    </div>

                    <div className="bg-[#050806] rounded-xl p-4 mb-6 border border-white/5 space-y-3">
                        <div className="flex flex-col border-b border-white/5 pb-2">
                            <span className="text-xs text-gray-500 uppercase font-bold mb-1">Motivo</span>
                            <input 
                                type="text" 
                                value={pendingEvent.title} 
                                onChange={(e) => setPendingEvent({...pendingEvent, title: e.target.value.toUpperCase()})}
                                className="bg-transparent text-sm font-bold text-[#C5A059] outline-none border-b border-white/10 focus:border-[#C5A059] pb-1 uppercase"
                            />
                        </div>
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-xs text-gray-500 uppercase font-bold">Data</span>
                            <span className="text-sm text-white">{new Date(pendingEvent.date!).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500 uppercase font-bold">Horário</span>
                            <input 
                                type="time" 
                                value={pendingEvent.time} 
                                onChange={(e) => setPendingEvent({...pendingEvent, time: e.target.value})}
                                className="text-sm font-mono text-white bg-white/10 px-2 rounded outline-none focus:ring-1 focus:ring-[#C5A059]"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={cancelPendingEvent} className="flex-1 py-3 rounded-lg border border-white/10 text-gray-400 font-bold text-sm hover:bg-white/5 transition-colors">
                            Cancelar
                        </button>
                        <button onClick={confirmPendingEvent} className="flex-1 py-3 rounded-lg bg-[#C5A059] text-black font-bold text-sm hover:bg-[#d4b470] shadow-lg transition-transform active:scale-[0.98]">
                            Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* COLUNA ESQUERDA: CALENDÁRIO */}
        <div className="flex-1 flex flex-col gap-6">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-serif text-[#C5A059] flex items-center gap-2">
                            <span className="material-symbols-outlined">calendar_month</span>
                            Agenda
                        </h1>
                        {/* Botão de Notificação */}
                        <button 
                            onClick={() => setShowAlertPanel(true)} 
                            className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <span className={`material-symbols-outlined ${alerts.length > 0 ? 'text-[#C5A059] animate-pulse' : 'text-gray-500'}`}>notifications</span>
                            {alerts.length > 0 && (
                                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-black"></span>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-white/10 rounded"><span className="material-symbols-outlined">chevron_left</span></button>
                    <span className="text-sm font-bold w-24 text-center">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-white/10 rounded"><span className="material-symbols-outlined">chevron_right</span></button>
                </div>
            </header>

            {/* Calendar Grid */}
            <div className="bg-[#1A1E1A] p-4 rounded-2xl border border-[#C5A059]/30 shadow-2xl">
                <div className="grid grid-cols-7 mb-4">
                    {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                        <div key={d} className="text-center text-xs text-gray-500 font-bold">{d}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {generateCalendarDays().map((day, idx) => {
                        if (day === null) return <div key={idx} className="h-10"></div>;
                        const today = isToday(day);
                        const selected = isSelected(day);
                        const marked = hasEvent(day);

                        return (
                            <button 
                                key={idx} 
                                onClick={() => handleDayClick(day)}
                                className={`
                                    h-10 md:h-14 rounded-xl flex flex-col items-center justify-center relative transition-all duration-300
                                    ${selected ? 'bg-[#C5A059] text-black font-bold shadow-[0_0_15px_rgba(197,160,89,0.5)] scale-105' : 'bg-[#0A0D0A] hover:bg-white/5'}
                                    ${today && !selected ? 'border border-[#C5A059] text-[#C5A059]' : ''}
                                `}
                            >
                                <span className="text-sm">{day}</span>
                                {marked && (
                                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${selected ? 'bg-black' : 'bg-green-500'}`}></span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Events Panel */}
            <div className="bg-[#1A1E1A] border border-white/5 rounded-2xl p-4 flex-1">
                <h3 className="text-xs uppercase tracking-widest text-gray-500 mb-4 flex items-center justify-between">
                    Compromissos {selectedDate.getDate()}
                    <span className="bg-white/10 text-white px-2 py-0.5 rounded-full text-[10px]">{selectedEvents.length}</span>
                </h3>
                
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {selectedEvents.length === 0 ? (
                        <div className="text-center text-gray-600 py-8 text-sm">Nenhum compromisso.</div>
                    ) : (
                        selectedEvents.map(evt => {
                            const isCanceled = evt.status === 'CANCELED';
                            return (
                                <div key={evt.id} className={`flex gap-3 items-center bg-[#050806] p-3 rounded-xl border border-white/5 animate-slide-in group ${isCanceled ? 'opacity-50 grayscale' : ''}`}>
                                    <div className="flex flex-col items-center min-w-[50px] border-r border-white/10 pr-3">
                                        <span className={`font-bold ${isCanceled ? 'text-gray-500 decoration-line-through' : 'text-[#C5A059]'}`}>{evt.time}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold text-sm uppercase tracking-wide ${isCanceled ? 'text-gray-500 decoration-line-through' : 'text-white'}`}>{evt.title}</h4>
                                        <p className="text-[10px] text-gray-400">{evt.status === 'CANCELED' ? 'Cancelado' : 'Confirmado'}</p>
                                    </div>
                                    
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => handleEditEvent(evt)} 
                                            className="p-1.5 hover:bg-[#C5A059] hover:text-black rounded-lg transition-colors text-gray-400"
                                            title="Editar"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">edit</span>
                                        </button>
                                        <button 
                                            onClick={() => handleToggleStatus(evt)} 
                                            className={`p-1.5 rounded-lg transition-colors ${isCanceled ? 'hover:bg-green-500 hover:text-white text-gray-400' : 'hover:bg-red-500 hover:text-white text-gray-400'}`}
                                            title={isCanceled ? "Restaurar" : "Cancelar"}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">{isCanceled ? 'check_circle' : 'block'}</span>
                                        </button>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${isCanceled ? 'bg-red-500' : (evt.status === 'CONFIRMED' ? 'bg-green-500' : 'bg-yellow-500')}`}></div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>

        {/* COLUNA DIREITA: IA CHAT - BLOQUEADA SE VISITANTE NÃO TIVER PERMISSÃO */}
        <div className="w-full md:w-80 flex flex-col gap-4">
            <div className="bg-gradient-to-b from-[#1A1E1A] to-[#0A0D0A] border border-[#C5A059]/30 rounded-2xl p-4 flex flex-col h-[400px] md:h-full shadow-2xl relative overflow-hidden">
                
                {isVisitorAndBlocked ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 animate-fade-in relative z-10">
                         <div className="w-16 h-16 bg-[#C5A059]/10 rounded-full flex items-center justify-center mb-4 border border-[#C5A059]">
                            <span className="material-symbols-outlined text-[#C5A059] text-3xl">lock</span>
                        </div>
                        <h3 className="text-[#C5A059] font-serif text-lg mb-2">Recurso Exclusivo</h3>
                        <p className="text-gray-400 text-xs mb-6 leading-relaxed">
                            O Agendamento Automático por IA é exclusivo para profissionais cadastrados. Solicite acesso ao administrador.
                        </p>
                        {aiRequestStatus === 'PENDING' ? (
                             <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded-lg text-yellow-500 text-xs font-bold w-full">
                                Solicitação em Análise...
                            </div>
                        ) : (
                            <button onClick={handleRequestAccess} className="bg-[#C5A059] text-black font-bold py-2.5 px-6 rounded-lg hover:bg-[#d4b470] text-xs uppercase tracking-wide w-full shadow-lg">
                                Solicitar Acesso
                            </button>
                        )}
                        {/* Background effect */}
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm -z-10"></div>
                    </div>
                ) : (
                    <>
                        {/* Header IA */}
                        <div className="flex items-center gap-3 border-b border-[#C5A059]/20 pb-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 flex items-center justify-center border border-[#C5A059]">
                                <span className="material-symbols-outlined text-[#C5A059]">smart_toy</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-[#C5A059]">Auto Agendamento</h3>
                                <p className="text-[10px] text-green-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> Online
                                </p>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 overflow-y-auto space-y-3 p-2 custom-scrollbar">
                            {chatHistory.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`p-3 rounded-xl text-xs max-w-[90%] leading-relaxed ${
                                        msg.sender === 'user' 
                                        ? 'bg-[#C5A059] text-black rounded-tr-none font-medium' 
                                        : 'bg-[#1A1E1A] border border-white/10 text-gray-300 rounded-tl-none'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef}></div>
                        </div>

                        {/* Input Area */}
                        <div className="mt-2 pt-2 border-t border-white/10 flex gap-2 items-center">
                            <button 
                                onClick={toggleRecording}
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#1A1E1A] text-[#C5A059] border border-[#C5A059]/30'}`}
                            >
                                <span className="material-symbols-outlined text-[20px]">{isRecording ? 'mic_off' : 'mic'}</span>
                            </button>
                            <div className="flex-1 relative">
                                <input 
                                    type="text" 
                                    value={aiInput}
                                    onChange={(e) => setAiInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                    placeholder="Ex: Advogado dia 25..." 
                                    className="w-full bg-[#050806] border border-white/10 rounded-full py-2.5 pl-4 pr-10 text-xs text-white outline-none focus:border-[#C5A059]"
                                />
                                <button 
                                    onClick={handleSendMessage}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#C5A059] rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform"
                                >
                                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>

    </div>
  );
};

export default Agenda;
