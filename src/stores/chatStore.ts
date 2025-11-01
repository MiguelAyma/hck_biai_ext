import { writable } from "svelte/store";
import type { Writable } from "svelte/store";


export type ChatRole = 'user' | 'assistant' | 'error' | 'system-warning' | 'system';
export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatState {
  statusInfo: string;
  rawMarkdown: string;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  isSessionReady: boolean;
  chatSessionId: string | null;
  chatList: { id: string, title: string }[];
}

export const chatInitialState: ChatState = {
  statusInfo: "Selecciona un chat o crea uno nuevo.", 
  rawMarkdown: "...",
  chatHistory: [],
  isLoading: false,
  isSessionReady: false,
  chatSessionId: null,
  chatList: [],
};

function createChatStore() {
  const { subscribe, set, update }: Writable<ChatState> = writable(chatInitialState);

  return {
    subscribe,
    
    setChatList: (list: { id: string, title: string }[]) => update(state => ({
      ...state,
      chatList: list
    })),

    // Acción: Iniciar la carga (para un chat NUEVO o EXISTENTE)
    startLoading: (sessionId: string, isNew: boolean) => update(state => ({
      ...state,
      isLoading: true,
      isSessionReady: false,
      statusInfo: isNew ? "Creando nueva sesión..." : "Cargando sesión...",
      chatHistory: [],
      chatSessionId: sessionId,
    })),
    
    startSending: (userMessage: string) => update((state) => ({
      ...state,
      isLoading: true,
      chatHistory: [
        ...state.chatHistory,
        { role: 'user', content: userMessage },
      ],
    })),

    // Evento: Sesión lista 
    setSessionReady: () => update((state) => ({
      ...state,
      isLoading: false,
      isSessionReady: true,
      statusInfo: "¡Sesión lista! Ya puedes chatear.",
    })),

    // Evento: Sesión restaurada
    setHistoryRestored: (history: ChatMessage[], lastMessage: string) => update((state) => ({
      ...state,
      isLoading: false,
      isSessionReady: true,
      statusInfo: "¡Sesión anterior restaurada!",
      rawMarkdown: lastMessage,
      chatHistory: history
        .filter((m) => m.role !== 'system') 
        .map((m) => ({ role: m.role, content: m.content })),
    })),

    // Evento: Respuesta recibida
    setResponse: (response: string) => update((state) => ({
      ...state,
      isLoading: false,
      rawMarkdown: response,
      chatHistory: [
        ...state.chatHistory,
        { role: 'assistant', content: response },
      ],
    })),

    // Evento: Error
    setError: (error: string) => update((state) => ({
      ...state,
      isLoading: false,
      statusInfo: `Error: ${error}`,
      chatHistory: [
        ...state.chatHistory,
        { role: 'error', content: error },
      ],
    })),
    setSystemUpdated: (message: string) => update(state => ({
      ...state,
      isLoading: false,
      statusInfo: message, // Muestra el mensaje de éxito
    })),

    // Evento: Desbordamiento de cuota
    setQuotaOverflow: (message: string) => update((state) => ({
      ...state,
      chatHistory: [
        ...state.chatHistory,
        { role: 'system-warning', content: message },
      ],
    })),



    // Acción: Sesión destruida
    setDestroyed: () => update(state => ({
      ...chatInitialState,
      chatList: state.chatList 
    })),
    
    // Limpia la UI sin destruir la sesión (para cambiar a "Nuevo Chat")
    clearActiveChat: () => update(state => ({
      ...chatInitialState,
      chatList: state.chatList
    })),
  };
}

export const chatStore = createChatStore();

