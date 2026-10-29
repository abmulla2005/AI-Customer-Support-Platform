import { TokenResponse, User, ChatThread, Message, DocumentItem, SupportTicket, EmployeeNote, AdminStats, CompanyKnowledge, AuditLog, MCPTool } from '../types';

const API_BASE = '/api';

class ApiService {
  private getHeaders(isJson = true): HeadersInit {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isFormData = options.body instanceof FormData;
    const headers = isFormData 
      ? this.getHeaders(false) 
      : { ...this.getHeaders(true), ...(options.headers as any) };

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      // Attempt token refresh
      const refreshed = await this.refreshToken();
      if (refreshed) {
        return this.request<T>(endpoint, options);
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('current_user');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    if (!res.ok) {
      let errMsg = 'An error occurred';
      try {
        const errJson = await res.json();
        errMsg = errJson.detail || errJson.message || errMsg;
      } catch {}
      throw new Error(errMsg);
    }

    return res.json();
  }

  // Auth
  async signup(data: any): Promise<TokenResponse> {
    return this.request<TokenResponse>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(credentials: { email: string; password: string }): Promise<TokenResponse> {
    return this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async refreshToken(): Promise<boolean> {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) return false;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      if (res.ok) {
        const data: TokenResponse = await res.json();
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('current_user', JSON.stringify(data.user));
        return true;
      }
    } catch {}
    return false;
  }

  async logout(): Promise<void> {
    const refresh = localStorage.getItem('refresh_token');
    try {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refresh }),
      });
    } catch {}
    localStorage.clear();
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async updateMe(data: any): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMe(): Promise<void> {
    return this.request('/auth/me', { method: 'DELETE' });
  }

  async forgotPassword(email: string): Promise<any> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, new_password: string): Promise<any> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, new_password }),
    });
  }

  // Chats
  async createChat(title?: string): Promise<ChatThread> {
    return this.request<ChatThread>('/chats', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async listChats(): Promise<ChatThread[]> {
    return this.request<ChatThread[]>('/chats');
  }

  async getChat(chatId: string): Promise<{ thread: ChatThread; messages: Message[] }> {
    return this.request(`/chats/${chatId}`);
  }

  async renameChat(chatId: string, title: string): Promise<ChatThread> {
    return this.request<ChatThread>(`/chats/${chatId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
  }

  async deleteChat(chatId: string): Promise<void> {
    return this.request(`/chats/${chatId}`, { method: 'DELETE' });
  }

  async sendMessage(chatId: string, content: string, language = 'en', selectedDocs?: string[]): Promise<any> {
    return this.request(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        language,
        selected_document_ids: selectedDocs,
      }),
    });
  }

  async submitFeedback(chatId: string, messageId: string, feedback: 'like' | 'dislike', comment?: string): Promise<any> {
    return this.request(`/chats/${chatId}/messages/${messageId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback, comment }),
    });
  }

  // Documents
  async uploadDocument(file: File, scope = 'customer'): Promise<DocumentItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('scope', scope);
    return this.request<DocumentItem>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async listDocuments(): Promise<DocumentItem[]> {
    return this.request<DocumentItem[]>('/documents');
  }

  async deleteDocument(id: string): Promise<void> {
    return this.request(`/documents/${id}`, { method: 'DELETE' });
  }

  async queryDocument(id: string, query: string): Promise<any> {
    return this.request(`/documents/${id}/query`, {
      method: 'POST',
      body: JSON.stringify({ query, top_k: 4 }),
    });
  }

  // Tickets
  async createTicket(data: { title: string; description: string; priority: string; chat_thread_id?: string }): Promise<SupportTicket> {
    return this.request<SupportTicket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async listTickets(status?: string, priority?: string): Promise<SupportTicket[]> {
    let url = '/tickets';
    const params = new URLSearchParams();
    if (status) params.append('status_filter', status);
    if (priority) params.append('priority_filter', priority);
    if (params.toString()) url += `?${params.toString()}`;
    return this.request<SupportTicket[]>(url);
  }

  async getTicket(id: string): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/tickets/${id}`);
  }

  async updateTicket(id: string, update: Partial<SupportTicket>): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  async addEmployeeNote(ticketId: string, content: string): Promise<EmployeeNote> {
    return this.request<EmployeeNote>(`/tickets/${ticketId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async listEmployeeNotes(ticketId: string): Promise<EmployeeNote[]> {
    return this.request<EmployeeNote[]>(`/tickets/${ticketId}/notes`);
  }

  // Employee
  async getEmployeeDashboard(): Promise<any> {
    return this.request('/employee/dashboard');
  }

  async getEmployeeAssignments(): Promise<any> {
    return this.request('/employee/assignments');
  }

  async getAiSuggestions(customer_query: string, ticket_id?: string): Promise<{ query: string; suggestions: string[] }> {
    return this.request('/employee/suggestions', {
      method: 'POST',
      body: JSON.stringify({ customer_query, ticket_id }),
    });
  }

  // Admin
  async getAdminAnalytics(): Promise<AdminStats> {
    return this.request<AdminStats>('/admin/analytics');
  }

  async listUsers(role?: string): Promise<User[]> {
    const url = role ? `/admin/users?role=${role}` : '/admin/users';
    return this.request<User[]>(url);
  }

  async updateUser(userId: string, data: Partial<User>): Promise<User> {
    return this.request<User>(`/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(userId: string): Promise<void> {
    return this.request(`/admin/users/${userId}`, { method: 'DELETE' });
  }

  async listCompanyKnowledge(): Promise<CompanyKnowledge[]> {
    return this.request<CompanyKnowledge[]>('/admin/knowledge');
  }

  async createCompanyKnowledge(data: any): Promise<CompanyKnowledge> {
    return this.request<CompanyKnowledge>('/admin/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCompanyKnowledge(id: string): Promise<void> {
    return this.request(`/admin/knowledge/${id}`, { method: 'DELETE' });
  }

  async getAuditLogs(): Promise<AuditLog[]> {
    return this.request<AuditLog[]>('/admin/audit-logs');
  }

  async getAdminSettings(): Promise<any> {
    return this.request('/admin/settings');
  }

  async updateAdminSettings(settings: any): Promise<any> {
    return this.request('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // MCP
  async listMcpTools(): Promise<MCPTool[]> {
    return this.request<MCPTool[]>('/mcp/tools');
  }

  async executeMcpTool(tool_name: string, args: any): Promise<any> {
    return this.request('/mcp/execute', {
      method: 'POST',
      body: JSON.stringify({ tool_name, arguments: args }),
    });
  }
}

export const api = new ApiService();
