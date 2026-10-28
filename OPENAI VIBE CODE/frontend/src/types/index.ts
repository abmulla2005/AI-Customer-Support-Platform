export type Role = 'customer' | 'employee' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  preferences?: Record<string, any>;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface MessageSource {
  document_id: string;
  filename: string;
  page_number: number;
  snippet: string;
  relevance_score: number;
}

export interface Message {
  id: string;
  thread_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  sources?: MessageSource[];
  tool_calls?: any[];
  feedback?: 'like' | 'dislike' | null;
  created_at: string;
}

export interface ChatThread {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  scope: 'customer' | 'employee' | 'company';
  filename: string;
  file_size: number;
  num_pages: number;
  status: 'pending' | 'processing' | 'indexed' | 'failed';
  error_message?: string;
  created_at: string;
}

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTicket {
  id: string;
  customer_id: string;
  customer_email?: string;
  customer_name?: string;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  chat_thread_id?: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeNote {
  id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export interface AdminStats {
  total_users: number;
  total_customers: number;
  total_employees: number;
  total_tickets: number;
  open_tickets: number;
  total_chats: number;
  total_documents: number;
  ai_tokens_used: number;
  activity_timeline: Array<{ day: string; chats: number; tickets: number }>;
}

export interface CompanyKnowledge {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ip_address?: string;
  timestamp: string;
}

export interface MCPTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  permitted_roles: string[];
}
