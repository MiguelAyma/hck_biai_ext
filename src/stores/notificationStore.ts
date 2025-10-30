import { ViewType } from "src/types/types";
import { writable, derived, get } from "svelte/store";

export interface Notification {
  id: string;
  view: ViewType;
  count: number;
  timestamp: number;
  data?: any; // Datos adicionales específicos de cada tipo de notificación
}

interface NotificationState {
  notifications: Notification[];
}

// Clave para localStorage
const STORAGE_KEY = "botsi_notifications";

// Función para cargar notificaciones desde chrome.storage
async function loadNotifications(): Promise<Notification[]> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || [];
  } catch (error) {
    console.error("Error loading notifications:", error);
    return [];
  }
}

// Función para guardar notificaciones en chrome.storage
async function saveNotifications(notifications: Notification[]) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: notifications });
  } catch (error) {
    console.error("Error saving notifications:", error);
  }
}

// Store principal
function createNotificationStore() {
  const { subscribe, set, update } = writable<NotificationState>({
    notifications: [],
  });

  return {
    subscribe,

    // Inicializar el store desde storage
    async init() {
      const notifications = await loadNotifications();
      set({ notifications });
    },

    // Agregar una notificación
    async add(view: ViewType, data?: any) {
      let notificationId: string;

      update((state) => {
        // Buscar si ya existe una notificación para este view
        const existingIndex = state.notifications.findIndex(
          (n) => n.view === view
        );

        if (existingIndex !== -1) {
          // Incrementar el contador
          notificationId = state.notifications[existingIndex].id;
          state.notifications[existingIndex].count++;
          state.notifications[existingIndex].timestamp = Date.now();
          if (data) {
            state.notifications[existingIndex].data = data;
          }
        } else {
          // Crear nueva notificación
          notificationId = `${view}_${Date.now()}`;
          state.notifications.push({
            id: notificationId,
            view,
            count: 1,
            timestamp: Date.now(),
            data,
          });
        }

        return state;
      });

      // Guardar en storage
      const currentState = get({ subscribe });
      await saveNotifications(currentState.notifications);

      // Enviar mensaje al content script para actualizar el botón flotante
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateNotifications",
            notifications: currentState.notifications,
          });
        }
      } catch (error) {
        console.log("Could not send message to content script:", error);
      }

      return notificationId;
    },

    // Limpiar notificaciones de un view específico
    async clear(view: ViewType) {
      update((state) => {
        state.notifications = state.notifications.filter(
          (n) => n.view !== view
        );
        return state;
      });

      const currentState = get({ subscribe });
      await saveNotifications(currentState.notifications);

      // Notificar al content script
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateNotifications",
            notifications: currentState.notifications,
          });
        }
      } catch (error) {
        console.log("Could not send message to content script:", error);
      }
    },

    // Limpiar todas las notificaciones
    async clearAll() {
      set({ notifications: [] });
      await saveNotifications([]);

      // Notificar al content script
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "updateNotifications",
            notifications: [],
          });
        }
      } catch (error) {
        console.log("Could not send message to content script:", error);
      }
    },

    // Obtener notificación de un view específico
    getByView(view: ViewType): Notification | undefined {
      const currentState = get({ subscribe });
      return currentState.notifications.find((n) => n.view === view);
    },
  };
}

export const notificationStore = createNotificationStore();

// Stores derivados para cada view
export const chatNotifications = derived(notificationStore, ($store) =>
  $store.notifications.find((n) => n.view === "chat")
);

export const markdownNotifications = derived(notificationStore, ($store) =>
  $store.notifications.find((n) => n.view === "markdown")
);

export const summariesNotifications = derived(notificationStore, ($store) =>
  $store.notifications.find((n) => n.view === "summaries")
);

export const investigationNotifications = derived(notificationStore, ($store) =>
  $store.notifications.find((n) => n.view === "investigation")
);

// Total de notificaciones
export const totalNotifications = derived(notificationStore, ($store) =>
  $store.notifications.reduce((sum, n) => sum + n.count, 0)
);
