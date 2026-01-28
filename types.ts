
export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'CLIENT' | 'VISITOR' | 'COMPANY';

export interface User {
  id: string;
  name: string;
  email: string;
  login?: string; // Novo campo de Login
  profession?: string; // Novo campo de Profissão
  description?: string; // Novo campo de Descrição
  phone?: string;
  phone2?: string; // Segundo telefone
  role: Role;
  avatar?: string;
  specialties?: string[];
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  isVisible?: boolean; 
  createdAt: string;
  password?: string; 
  provider?: string;
  whatsappEnabled?: boolean;
}

export interface Post {
  id: string | number; // Flexibilidade para ids legados
  content?: string; // Compatibilidade legada
  text?: string; // Compatibilidade nova
  imageUrl?: string; // Compatibilidade legada
  image?: string; // Compatibilidade nova
  userId: string | number;
  user: User | string; // Relation ou nome direto
  avatar?: string;
  likes: number;
  createdAt?: string;
  time?: string;
  tags?: string[];
  role?: string;
  visible?: boolean; // Novo: controla visibilidade
  hiddenAt?: string; // Novo: data em que foi ocultado
  relatedUserId?: string; // Novo: ID de usuário relacionado (para solicitações de admin)
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO String
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'RESCHEDULED';
  professionalId: string;
  visitorId: string;
  createdAt: string;
}

export interface Log {
  id: string;
  action: string;
  target: string;
  userId: string;
  timestamp: string;
}

export interface NavItem {
  label: string;
  icon: string;
  path: string;
}
