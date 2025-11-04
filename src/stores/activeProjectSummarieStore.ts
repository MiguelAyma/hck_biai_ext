import { writable } from "svelte/store";
import type { Writable } from "svelte/store";
import type { Project } from "./projectsStore";

const STORAGE_KEY = "localActiveProjectSummarie";

// Cargar proyecto desde chrome.storage.local
async function loadProject(): Promise<Project | null> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEY]);
      if (result[STORAGE_KEY]) {
        return result[STORAGE_KEY];
      }
    } catch (error) {
      console.error("Error loading local active project:", error);
    }
  }
  return null;
}

// Guardar proyecto en chrome.storage.local
async function saveProject(project: Project | null): Promise<void> {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: project });
    } catch (error) {
      console.error("Error saving local active project:", error);
    }
  }
}

function createLocalActiveProjectStore() {
  const { subscribe, set, update }: Writable<Project | null> = writable(null);

  // Inicializar el store con datos persistentes
  loadProject().then((project) => set(project));

  return {
    subscribe,

    setActiveProject: (project: Project | null) => {
      set(project);
      saveProject(project);
    },

    // Inicializar con el primer proyecto si no hay uno activo
    initializeWithFirstProject: (projects: Project[]) => {
      update((current) => {
        if (!current && projects.length > 0) {
          const firstProject = projects[0];
          saveProject(firstProject);
          return firstProject;
        }
        return current;
      });
    },

    reset: () => {
      set(null);
      saveProject(null);
    },
  };
}

export const localActiveProjectSummarie = createLocalActiveProjectStore();
