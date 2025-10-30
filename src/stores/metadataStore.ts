import { writable, type Writable } from "svelte/store";

export interface PageMetadata {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
  favicon: string;
  author: string;
  publishedDate: string;
  addedAt: number;
}

interface MetadataStoreState {
  items: PageMetadata[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

const STORAGE_KEY = "page_metadata_list";

function createMetadataStore() {
  const { subscribe, set, update }: Writable<MetadataStoreState> = writable({
    items: [],
    isLoading: false,
    hasError: false,
    errorMessage: "",
  });

  // Cargar datos desde chrome.storage al inicializar
  async function loadFromStorage() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result[STORAGE_KEY]) {
        update((state) => ({
          ...state,
          items: result[STORAGE_KEY],
        }));
      }
    } catch (error) {
      console.error("Error loading metadata from storage:", error);
    }
  }

  // Guardar en chrome.storage
  async function saveToStorage(items: PageMetadata[]) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: items });
    } catch (error) {
      console.error("Error saving metadata to storage:", error);
    }
  }

  // Inicializar cargando datos
  loadFromStorage();

  return {
    subscribe,
    setLoading: (loading: boolean) => {
      update((state) => ({ ...state, isLoading: loading }));
    },
    addMetadata: async (metadata: PageMetadata) => {
      update((state) => {
        const newItems = [metadata, ...state.items];
        saveToStorage(newItems);
        return {
          ...state,
          items: newItems,
          hasError: false,
          errorMessage: "",
        };
      });
    },
    removeMetadata: async (id: string) => {
      update((state) => {
        const newItems = state.items.filter((item) => item.id !== id);
        saveToStorage(newItems);
        return {
          ...state,
          items: newItems,
        };
      });
    },
    setError: (message: string) => {
      update((state) => ({
        ...state,
        hasError: true,
        errorMessage: message,
        isLoading: false,
      }));
    },
    clearError: () => {
      update((state) => ({
        ...state,
        hasError: false,
        errorMessage: "",
      }));
    },
    reset: async () => {
      await chrome.storage.local.remove(STORAGE_KEY);
      set({
        items: [],
        isLoading: false,
        hasError: false,
        errorMessage: "",
      });
    },
  };
}

export const metadataStore = createMetadataStore();
