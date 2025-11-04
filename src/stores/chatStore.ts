import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

export type ChatRole =
  | "user"
  | "assistant"
  | "error"
  | "system-warning"
  | "system";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatListItem {
  id: string;
  title: string;
  projectId: string; // ID del proyecto asociado
}

export interface ChatState {
  statusInfo: string;
  rawMarkdown: string;
  chatHistory: ChatMessage[];
  isLoading: boolean;
  isSessionReady: boolean;
  chatSessionId: string | null;
  chatList: ChatListItem[];
}

export const chatInitialState: ChatState = {
  statusInfo: "Selecciona un proyecto para comenzar.",
  rawMarkdown: "...",
  chatHistory: [],
  isLoading: false,
  isSessionReady: false,
  chatSessionId: null,
  chatList: [],
};

const STORAGE_KEY = "chatState";

// Cargar estado desde chrome.storage.local
async function loadState(): Promise<ChatState> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY]);
      if (result[STORAGE_KEY]) {
        return { ...chatInitialState, ...result[STORAGE_KEY] };
      }
    } catch (error) {
      console.error("Error loading chat state:", error);
    }
  }
  return chatInitialState;
}

// Guardar estado en chrome.storage.local
async function saveState(state: ChatState): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: state });
    } catch (error) {
      console.error("Error saving chat state:", error);
    }
  }
}

function createChatStore() {
  const { subscribe, set, update }: Writable<ChatState> =
    writable(chatInitialState);

  // Inicializar el store con datos persistentes
  loadState().then((state) => set(state));

  // Wrapper para actualizar y persistir
  const updateAndSave = (updater: (state: ChatState) => ChatState) => {
    update((state) => {
      const newState = updater(state);
      saveState(newState);
      return newState;
    });
  };

  return {
    subscribe,

    setChatList: (list: ChatListItem[]) =>
      updateAndSave((state) => ({
        ...state,
        chatList: list,
      })),

    startLoading: (sessionId: string, isNew: boolean) =>
      updateAndSave((state) => ({
        ...state,
        isLoading: true,
        isSessionReady: false,
        statusInfo: isNew ? "Creando nueva sesión..." : "Cargando sesión...",
        chatHistory: [],
        chatSessionId: sessionId,
      })),

    startSending: (userMessage: string) =>
      updateAndSave((state) => ({
        ...state,
        isLoading: true,
        chatHistory: [
          ...state.chatHistory,
          { role: "user", content: userMessage },
        ],
      })),

    setSessionReady: () =>
      updateAndSave((state) => ({
        ...state,
        isLoading: false,
        isSessionReady: true,
        statusInfo: "¡Sesión lista! Ya puedes chatear.",
      })),

    setHistoryRestored: (history: ChatMessage[], lastMessage: string) =>
      updateAndSave((state) => ({
        ...state,
        isLoading: false,
        isSessionReady: true,
        statusInfo: "¡Sesión anterior restaurada!",
        rawMarkdown: lastMessage,
        chatHistory: history
          .filter((m) => m.role !== "system")
          .map((m) => ({ role: m.role, content: m.content })),
      })),

    setResponse: (response: string) =>
      updateAndSave((state) => ({
        ...state,
        isLoading: false,
        rawMarkdown: response,
        chatHistory: [
          ...state.chatHistory,
          { role: "assistant", content: response },
        ],
      })),

    setError: (error: string) =>
      updateAndSave((state) => ({
        ...state,
        isLoading: false,
        statusInfo: `Error: ${error}`,
        chatHistory: [...state.chatHistory, { role: "error", content: error }],
      })),

    setSystemUpdated: (message: string) =>
      updateAndSave((state) => ({
        ...state,
        isLoading: false,
        statusInfo: message,
      })),

    setQuotaOverflow: (message: string) =>
      updateAndSave((state) => ({
        ...state,
        chatHistory: [
          ...state.chatHistory,
          { role: "system-warning", content: message },
        ],
      })),

    setDestroyed: () =>
      updateAndSave((state) => ({
        ...chatInitialState,
        chatList: state.chatList,
      })),

    clearActiveChat: () =>
      updateAndSave((state) => ({
        ...chatInitialState,
        chatList: state.chatList,
      })),

    // Limpiar completamente el store
    reset: () => {
      set(chatInitialState);
      saveState(chatInitialState);
    },
  };
}

export const chatStore = createChatStore();
// import { writable } from "svelte/store";
// import type { Writable } from "svelte/store";

// export type ChatRole =
//   | "user"
//   | "assistant"
//   | "error"
//   | "system-warning"
//   | "system";
// export interface ChatMessage {
//   role: ChatRole;
//   content: string;
// }

// export interface ChatState {
//   statusInfo: string;
//   rawMarkdown: string;
//   chatHistory: ChatMessage[];
//   isLoading: boolean;
//   isSessionReady: boolean;
//   chatSessionId: string | null;
//   chatList: { id: string; title: string }[];
// }

// export const chatInitialState: ChatState = {
//   statusInfo: "Selecciona un chat o crea uno nuevo.",
//   rawMarkdown: "...",
//   chatHistory: [],
//   isLoading: false,
//   isSessionReady: false,
//   chatSessionId: null,
//   chatList: [],
// };

// function createChatStore() {
//   const { subscribe, set, update }: Writable<ChatState> =
//     writable(chatInitialState);

//   return {
//     subscribe,

//     setChatList: (list: { id: string; title: string }[]) =>
//       update((state) => ({
//         ...state,
//         chatList: list,
//       })),

//     // Acción: Iniciar la carga (para un chat NUEVO o EXISTENTE)
//     startLoading: (sessionId: string, isNew: boolean) =>
//       update((state) => ({
//         ...state,
//         isLoading: true,
//         isSessionReady: false,
//         statusInfo: isNew ? "Creando nueva sesión..." : "Cargando sesión...",
//         chatHistory: [],
//         chatSessionId: sessionId,
//       })),

//     startSending: (userMessage: string) =>
//       update((state) => ({
//         ...state,
//         isLoading: true,
//         chatHistory: [
//           ...state.chatHistory,
//           { role: "user", content: userMessage },
//         ],
//       })),

//     // Evento: Sesión lista
//     setSessionReady: () =>
//       update((state) => ({
//         ...state,
//         isLoading: false,
//         isSessionReady: true,
//         statusInfo: "¡Sesión lista! Ya puedes chatear.",
//       })),

//     // Evento: Sesión restaurada
//     setHistoryRestored: (history: ChatMessage[], lastMessage: string) =>
//       update((state) => ({
//         ...state,
//         isLoading: false,
//         isSessionReady: true,
//         statusInfo: "¡Sesión anterior restaurada!",
//         rawMarkdown: lastMessage,
//         chatHistory: history
//           .filter((m) => m.role !== "system")
//           .map((m) => ({ role: m.role, content: m.content })),
//       })),

//     // Evento: Respuesta recibida
//     setResponse: (response: string) =>
//       update((state) => ({
//         ...state,
//         isLoading: false,
//         rawMarkdown: response,
//         chatHistory: [
//           ...state.chatHistory,
//           { role: "assistant", content: response },
//         ],
//       })),

//     // Evento: Error
//     setError: (error: string) =>
//       update((state) => ({
//         ...state,
//         isLoading: false,
//         statusInfo: `Error: ${error}`,
//         chatHistory: [...state.chatHistory, { role: "error", content: error }],
//       })),
//     setSystemUpdated: (message: string) =>
//       update((state) => ({
//         ...state,
//         isLoading: false,
//         statusInfo: message, // Muestra el mensaje de éxito
//       })),

//     // Evento: Desbordamiento de cuota
//     setQuotaOverflow: (message: string) =>
//       update((state) => ({
//         ...state,
//         chatHistory: [
//           ...state.chatHistory,
//           { role: "system-warning", content: message },
//         ],
//       })),

//     // Acción: Sesión destruida
//     setDestroyed: () =>
//       update((state) => ({
//         ...chatInitialState,
//         chatList: state.chatList,
//       })),

//     // Limpia la UI sin destruir la sesión (para cambiar a "Nuevo Chat")
//     clearActiveChat: () =>
//       update((state) => ({
//         ...chatInitialState,
//         chatList: state.chatList,
//       })),
//   };
// }
// export const chatStore = createChatStore();
