import { writable, type Writable } from "svelte/store";

export interface ProjectPage {
  idProject: string;
}

// Estado inicial
const initialState: ProjectPage = {
  idProject: "",
};

const STORAGE_KEY = "projectPageState";

// Función para crear el store
function createProjectPageStore() {
  const { subscribe, set, update }: Writable<ProjectPage> =
    writable(initialState);

  // Cargar datos desde Chrome Storage
  async function loadFromStorage() {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY]);
      const loadedState = result[STORAGE_KEY];

      if (loadedState) {
        set(loadedState);
      }
    } catch (error) {
      console.error("Error loading projectPage from storage:", error);
    }
  }

  // Guardar datos en Chrome Storage
  async function saveToStorage(state: ProjectPage) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: state });
    } catch (error) {
      console.error("Error saving projectPage to storage:", error);
    }
  }

  // Inicializar el store
  loadFromStorage();

  return {
    subscribe,

    setIdProject: (id: string) => {
      update((state) => {
        const newState = { ...state, idProject: id };
        saveToStorage(newState);
        return newState;
      });
    },
    // Método para limpiar los valores
    clear: () => {
      set(initialState);
      saveToStorage(initialState);
    },
  };
}

// Exportar el store
export const projectPageStore = createProjectPageStore();
