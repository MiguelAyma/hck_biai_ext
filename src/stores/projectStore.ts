import { writable, derived, type Writable } from "svelte/store";

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: number;
  pageCount: number;
}

export interface PageMetadata {
  id: string;
  projectId: string;
  title: string;
  description: string;
  image: string;
  url: string;
  favicon: string;
  author: string;
  publishedDate: string;
  addedAt: number;
}

interface ProjectStoreState {
  projects: Project[];
  pages: PageMetadata[];
  activeProjectId: string | null;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

const STORAGE_KEY_PROJECTS = "projects_list";
const STORAGE_KEY_PAGES = "pages_list";
const DEFAULT_PROJECT_ID = "default-project";

const PROJECT_COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#06b6d4",
];

const PROJECT_ICONS = ["📁", "🚀", "💼", "🎯", "📚", "🎨", "⚡", "🌟"];

function createProjectStore() {
  const { subscribe, set, update }: Writable<ProjectStoreState> = writable({
    projects: [],
    pages: [],
    activeProjectId: null,
    isLoading: false,
    hasError: false,
    errorMessage: "",
  });

  async function loadFromStorage() {
    try {
      const result = await chrome.storage.local.get([
        STORAGE_KEY_PROJECTS,
        STORAGE_KEY_PAGES,
      ]);

      let projects = result[STORAGE_KEY_PROJECTS] || [];
      const pages = result[STORAGE_KEY_PAGES] || [];

      // Crear proyecto por defecto si no existe
      if (projects.length === 0) {
        const defaultProject: Project = {
          id: DEFAULT_PROJECT_ID,
          name: "General",
          color: "#6366f1",
          icon: "📁",
          createdAt: Date.now(),
          pageCount: 0,
        };
        projects = [defaultProject];
        await chrome.storage.local.set({
          [STORAGE_KEY_PROJECTS]: projects,
        });
      }

      projects = projects.map((project: Project) => ({
        ...project,
        pageCount: pages.filter((p: PageMetadata) => p.projectId === project.id)
          .length,
      }));

      update((state) => ({
        ...state,
        projects,
        pages,
        activeProjectId: projects[0].id,
      }));
    } catch (error) {
      console.error("Error loading from storage:", error);
    }
  }

  async function saveToStorage(projects: Project[], pages: PageMetadata[]) {
    try {
      await chrome.storage.local.set({
        [STORAGE_KEY_PROJECTS]: projects,
        [STORAGE_KEY_PAGES]: pages,
      });
    } catch (error) {
      console.error("Error saving to storage:", error);
    }
  }

  loadFromStorage();

  return {
    subscribe,

    // Proyectos
    createProject: async (name: string) => {
      update((state) => {
        const newProject: Project = {
          id: `project-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          name,
          color:
            PROJECT_COLORS[Math.floor(Math.random() * PROJECT_COLORS.length)],
          icon: PROJECT_ICONS[Math.floor(Math.random() * PROJECT_ICONS.length)],
          createdAt: Date.now(),
          pageCount: 0,
        };

        const newProjects = [...state.projects, newProject];
        saveToStorage(newProjects, state.pages);

        return {
          ...state,
          projects: newProjects,
          activeProjectId: newProject.id,
        };
      });
    },

    updateProject: async (id: string, updates: Partial<Project>) => {
      update((state) => {
        const newProjects = state.projects.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        );
        saveToStorage(newProjects, state.pages);
        return { ...state, projects: newProjects };
      });
    },

    deleteProject: async (id: string) => {
      if (id === DEFAULT_PROJECT_ID) {
        return;
      }

      update((state) => {
        const newProjects = state.projects.filter((p) => p.id !== id);
        const newPages = state.pages.filter((p) => p.projectId !== id);

        saveToStorage(newProjects, newPages);

        return {
          ...state,
          projects: newProjects,
          pages: newPages,
          activeProjectId:
            state.activeProjectId === id
              ? newProjects[0]?.id || null
              : state.activeProjectId,
        };
      });
    },

    setActiveProject: (id: string) => {
      update((state) => ({ ...state, activeProjectId: id }));
    },

    // Páginas
    addPage: async (page: Omit<PageMetadata, "id" | "addedAt">) => {
      update((state) => {
        const newPage: PageMetadata = {
          ...page,
          id: `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          addedAt: Date.now(),
        };

        const newPages = [newPage, ...state.pages];
        const newProjects = state.projects.map((p) =>
          p.id === page.projectId ? { ...p, pageCount: p.pageCount + 1 } : p
        );

        saveToStorage(newProjects, newPages);

        return {
          ...state,
          pages: newPages,
          projects: newProjects,
          hasError: false,
          errorMessage: "",
        };
      });
    },

    removePage: async (id: string) => {
      update((state) => {
        const pageToRemove = state.pages.find((p) => p.id === id);
        if (!pageToRemove) return state;

        const newPages = state.pages.filter((p) => p.id !== id);
        const newProjects = state.projects.map((p) =>
          p.id === pageToRemove.projectId
            ? { ...p, pageCount: Math.max(0, p.pageCount - 1) }
            : p
        );

        saveToStorage(newProjects, newPages);

        return {
          ...state,
          pages: newPages,
          projects: newProjects,
        };
      });
    },

    movePage: async (pageId: string, newProjectId: string) => {
      update((state) => {
        const pageToMove = state.pages.find((p) => p.id === pageId);
        if (!pageToMove) return state;

        const oldProjectId = pageToMove.projectId;
        const newPages = state.pages.map((p) =>
          p.id === pageId ? { ...p, projectId: newProjectId } : p
        );

        const newProjects = state.projects.map((p) => {
          if (p.id === oldProjectId) {
            return { ...p, pageCount: Math.max(0, p.pageCount - 1) };
          }
          if (p.id === newProjectId) {
            return { ...p, pageCount: p.pageCount + 1 };
          }
          return p;
        });

        saveToStorage(newProjects, newPages);

        return {
          ...state,
          pages: newPages,
          projects: newProjects,
        };
      });
    },

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

export const projectStore = createProjectStore();

export const activeProject = derived(projectStore, ($store) =>
  $store.projects.find((p) => p.id === $store.activeProjectId)
);

export const activePagesStore = derived(projectStore, ($store) =>
  $store.pages.filter((p) => p.projectId === $store.activeProjectId)
);
