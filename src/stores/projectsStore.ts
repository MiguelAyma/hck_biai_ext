import { createPageId } from "../utils/createPageId";
import { writable, derived } from "svelte/store";
import type { Writable } from "svelte/store";

// Define el tipo para una sola página web
export interface Webpage {
  id: string;
  title: string;
  url: string;
  faviconUrl: string;
  rawMarkdown: string;
  strippedMarkdown: string;
  refinedMarkdown: string;
  markdownSummaryLong: string;
  markdownSummaryMedium: string;
  markdownSummaryShort: string;
  addedAt: number;
}

// Define el tipo para un proyecto (que contiene páginas)
export interface Project {
  id: string;
  name: string;
  contentProject: string; //page 1, page2, page3
  webpages: Webpage[];
  summaryProject: string;
  createdAt: number;
}

// Define el estado principal de tu store
export interface ProjectsState {
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

// Estado inicial
const initialState: ProjectsState = {
  projects: [],
  activeProjectId: null,
  isLoading: false,
  hasError: false,
  errorMessage: "",
};

const STORAGE_KEY = "projectsState";
const DEFAULT_PROJECT_ID = "default-project";

// Función para crear el store
function createProjectsStore() {
  const { subscribe, set, update }: Writable<ProjectsState> =
    writable(initialState);

  // Cargar datos desde Chrome Storage
async function loadFromStorage() {
      try {
        const result = await chrome.storage.local.get([STORAGE_KEY]);
        let loadedState = result[STORAGE_KEY];

        // Si no hay datos, crear proyecto por defecto Y EL DE PRUEBA
        if (!loadedState || loadedState.projects.length === 0) {
          
          const now = Date.now();

          // 1. Crear proyecto por defecto
          const defaultProject: Project = {
            id: DEFAULT_PROJECT_ID,
            name: "General",
            contentProject: "",
            webpages: [],
            summaryProject: "",
            createdAt: now,
          };

          // ======================================================
          // ¡INICIO DE LA LÓGICA AÑADIDA!
          // (Es tu lógica de handleSeedData, movida aquí)
          // ======================================================
          
          // 2. Crear las webpages de UML
          const webpage1: Webpage = {
            id: `page-uml-seq-${now}`,
            title: "Diagramas de Secuencia",
            url: "https://ejemplo.com/uml/secuencia",
            faviconUrl: "",
            rawMarkdown: "# Diagramas de Secuencia\n\nUn diagrama de secuencia muestra la interacción de objetos...",
            strippedMarkdown: "Diagramas de Secuencia. Un diagrama de secuencia...",
            refinedMarkdown: "Un diagrama de secuencia detalla cómo los objetos interactúan...",
            markdownSummaryLong: "Un diagrama de secuencia es una herramienta de modelado UML que ilustra las interacciones entre objetos en un escenario específico. Se centra en el orden cronológico de los mensajes.",
            markdownSummaryMedium: "Muestra cómo los objetos interactúan entre sí...",
            markdownSummaryShort: "Interacción de objetos en el tiempo.",
            addedAt: now
          };

          const webpage2: Webpage = {
            id: `page-uml-class-${now + 1}`,
            title: "Diagramas de Clase",
            url: "https://ejemplo.com/uml/clase",
            faviconUrl: "",
            rawMarkdown: "# Diagramas de Clase\n\nUn diagrama de clase describe la estructura...",
            strippedMarkdown: "Diagramas de Clase. Un diagrama de clase...",
            refinedMarkdown: "Un diagrama de clase modela la estructura estática...",
            markdownSummaryLong: "El diagrama de clases es fundamental en UML para el modelado estático. Define la estructura del sistema al mostrar clases, sus atributos, métodos y cómo se relacionan entre sí.",
            markdownSummaryMedium: "Describe la estructura estática de un sistema...",
            markdownSummaryShort: "Estructura estática de clases.",
            addedAt: now + 1
          };

          // 3. Crear el proyecto de UML
          const umlProject: Project = {
            id: `project-uml-${now}`,
            name: "Diagramas UML",
            contentProject: "Diagramas de Secuencia, Diagramas de Clase",
            webpages: [webpage1, webpage2],
            summaryProject: "Este proyecto contiene información sobre los diagramas UML más comunes.",
            createdAt: now
          };
          
          // ======================================================
          // ¡FIN DE LA LÓGICA AÑADIDA!
          // ======================================================

          // 4. Configurar el estado inicial con AMBOS proyectos
          loadedState = {
            ...initialState,
            projects: [defaultProject, umlProject], // <-- ¡AQUÍ ESTÁ EL CAMBIO!
            activeProjectId: DEFAULT_PROJECT_ID, // Iniciar en "General"
          };

          await saveToStorage(loadedState);
        }

        set(loadedState);
      } catch (error) {
        console.error("Error loading from storage:", error);
        update((state) => ({
          ...state,
          hasError: true,
          errorMessage: "Error al cargar los proyectos",
        }));
      }
    }

  // Guardar datos en Chrome Storage
  async function saveToStorage(state: ProjectsState) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: state });
    } catch (error) {
      console.error("Error saving to storage:", error);
    }
  }

  // Inicializar el store
  loadFromStorage();

  return {
    subscribe,

    // ========== MÉTODOS PARA PROYECTOS ==========

    createProject: async (name: string) => {
      update((state) => {
        const newProject: Project = {
          id: `project-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          name,
          contentProject: "",
          webpages: [],
          summaryProject: "",
          createdAt: Date.now(),
        };

        const newState = {
          ...state,
          projects: [...state.projects, newProject],
          activeProjectId: newProject.id,
        };

        saveToStorage(newState);
        return newState;
      });
    },

    updateProject: async (
      projectId: string,
      updates: Partial<Omit<Project, "id" | "webpages" | "createdAt">>
    ) => {
      update((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId ? { ...project, ...updates } : project
          ),
        };

        saveToStorage(newState);
        return newState;
      });
    },

    deleteProject: async (projectId: string) => {
      // No permitir eliminar el proyecto por defecto
      if (projectId === DEFAULT_PROJECT_ID) {
        console.warn("No se puede eliminar el proyecto General");
        return;
      }

      update((state) => {
        const filteredProjects = state.projects.filter(
          (p) => p.id !== projectId
        );

        const newState = {
          ...state,
          projects: filteredProjects,
          activeProjectId:
            state.activeProjectId === projectId
              ? filteredProjects[0]?.id || null
              : state.activeProjectId,
        };

        saveToStorage(newState);
        return newState;
      });
    },

    setActiveProject: (projectId: string) => {
      update((state) => ({
        ...state,
        activeProjectId: projectId,
      }));
    },

    // ========== MÉTODOS PARA PÁGINAS ==========

    addWebpage: async (
      projectId: string,
      webpage: Omit<Webpage, "id" | "addedAt">
    ) => {
      update((state) => {
        const newWebpage: Webpage = {
          ...webpage,
          id: createPageId(webpage.url),
          addedAt: Date.now(),
        };

        const newState = {
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId
              ? { ...project, webpages: [newWebpage, ...project.webpages] }
              : project
          ),
          hasError: false,
          errorMessage: "",
        };

        saveToStorage(newState);
        return newState;
      });
    },

    updateWebpage: async (
      projectId: string,
      webpageId: string,
      updates: Partial<Omit<Webpage, "id" | "addedAt">>
    ) => {
      update((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  webpages: project.webpages.map((webpage) =>
                    webpage.id === webpageId
                      ? { ...webpage, ...updates }
                      : webpage
                  ),
                }
              : project
          ),
        };

        saveToStorage(newState);
        return newState;
      });
    },

    removeWebpage: async (projectId: string, webpageId: string) => {
      update((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  webpages: project.webpages.filter(
                    (webpage) => webpage.id !== webpageId
                  ),
                }
              : project
          ),
        };

        saveToStorage(newState);
        return newState;
      });
    },

    moveWebpage: async (
      fromProjectId: string,
      toProjectId: string,
      webpageId: string
    ) => {
      update((state) => {
        let webpageToMove: Webpage | null = null;
        // Encontrar y remover la página del proyecto origen
        const projectsAfterRemove = state.projects.map((project) => {
          if (project.id === fromProjectId) {
            const webpage = project.webpages.find((w) => w.id === webpageId);
            if (webpage) {
              webpageToMove = webpage;
              return {
                ...project,
                webpages: project.webpages.filter((w) => w.id !== webpageId),
              };
            }
          }
          return project;
        });

        // Si no se encontró la página, no hacer nada
        if (!webpageToMove) return state;

        // Agregar la página al proyecto destino
        const newState = {
          ...state,
          projects: projectsAfterRemove.map((project) =>
            project.id === toProjectId
              ? {
                  ...project,
                  webpages: [webpageToMove!, ...project.webpages],
                }
              : project
          ),
        };

        saveToStorage(newState);
        return newState;
      });
    },

    ///////////////////////////////////////////////////////////////////
    // Metodos set individuales para atributos de Webpage
    setRawMarkdown: async (
      projectId: string,
      webpageId: string,
      rawMarkdown: string
    ) => {
      update((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  webpages: project.webpages.map((webpage) =>
                    webpage.id === webpageId
                      ? { ...webpage, rawMarkdown }
                      : webpage
                  ),
                }
              : project
          ),
        };

        saveToStorage(newState);
        return newState;
      });
    },

    setStrippedMarkdown: async (
      projectId: string,
      webpageId: string,
      strippedMarkdown: string
    ) => {
      console.log(
        "setStrippedMarkdown",
        projectId,
        webpageId,
        strippedMarkdown
      );
      update((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  webpages: project.webpages.map((webpage) =>
                    webpage.id === webpageId
                      ? { ...webpage, strippedMarkdown }
                      : webpage
                  ),
                }
              : project
          ),
        };

        saveToStorage(newState);
        return newState;
      });
    },

    setRefinedMarkdown: async (
      projectId: string,
      webpageId: string,
      refinedMarkdown: string
    ) => {
      update((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  webpages: project.webpages.map((webpage) =>
                    webpage.id === webpageId
                      ? { ...webpage, refinedMarkdown }
                      : webpage
                  ),
                }
              : project
          ),
        };

        saveToStorage(newState);
        return newState;
      });
    },

    setMarkdownSummaryLong: async (
      projectId: string,
      webpageId: string,
      markdownSummaryLong: string
    ) => {
      update((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  webpages: project.webpages.map((webpage) =>
                    webpage.id === webpageId
                      ? { ...webpage, markdownSummaryLong }
                      : webpage
                  ),
                }
              : project
          ),
        };

        saveToStorage(newState);
        return newState;
      });
    },

    setMarkdownSummaryMedium: async (
      projectId: string,
      webpageId: string,
      markdownSummaryMedium: string
    ) => {
      update((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  webpages: project.webpages.map((webpage) =>
                    webpage.id === webpageId
                      ? { ...webpage, markdownSummaryMedium }
                      : webpage
                  ),
                }
              : project
          ),
        };

        saveToStorage(newState);
        return newState;
      });
    },

    setMarkdownSummaryShort: async (
      projectId: string,
      webpageId: string,
      markdownSummaryShort: string
    ) => {
      update((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  webpages: project.webpages.map((webpage) =>
                    webpage.id === webpageId
                      ? { ...webpage, markdownSummaryShort }
                      : webpage
                  ),
                }
              : project
          ),
        };

        saveToStorage(newState);
        return newState;
      });
    },

    // Metodo para agregar contenido a contentProject
    appendToProjectContent: async (
      projectId: string,
      title: string,
      content: string
    ) => {
      update((state) => {
        const newState = {
          ...state,
          projects: state.projects.map((project) => {
            if (project.id === projectId) {
              const newContent = `# ${title}\n\n${content}\n\n---\n\n`;
              return {
                ...project,
                contentProject: project.contentProject + newContent,
              };
            }
            return project;
          }),
        };

        saveToStorage(newState);
        return newState;
      });
    },
    //==========================================================//

    // ========== METODOS DE UTILIDAD ==========

    setLoading: (loading: boolean) => {
      update((state) => ({ ...state, isLoading: loading }));
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




  };
}
// Exportar el store
export const projectsStore = createProjectsStore();

// Derived stores útiles
export const activeProject = derived(
  projectsStore,
  ($store) =>
    $store.projects.find((p) => p.id === $store.activeProjectId) || null
);

export const activeWebpages = derived(
  activeProject,
  ($project) => $project?.webpages || []
);

export const projectCount = derived(
  projectsStore,
  ($store) => $store.projects.length
);

export const totalWebpageCount = derived(projectsStore, ($store) =>
  $store.projects.reduce((total, project) => total + project.webpages.length, 0)
);
