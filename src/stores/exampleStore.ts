import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

// Define el tipo para una sola página web
export interface Webpage {
  id: string;
  title: string;
  url: string;
  faviconUrl: string;
  rawMarkdown: string; //primer contenido sucio
  strippedMarkdown: string; //contenido sin imagenes, links, etc
  refinedMarkdown: string; //contenido limpio por gemini nano
  markdownSummaryLong: string; //resumen largo,nueva estructura
  markdownSummaryMedium: string; //resumen mediano, nueva estructura
  markdownSummaryShort: string; //resumen corto, nueva estructura
}

// Define el tipo para un proyecto (que contiene páginas)
export interface Project {
  id: string;
  name: string;
  contentProject: string;
  webpages: Webpage[];
  summaryProject: string;
}

// Define el estado principal de tu store
export interface ProjectsState {
  projects: Project[];
  isLoading: boolean; // Para cargar/guardar todos los proyectos
  hasError: boolean;
  errorMessage: string;
}

// 1. Define el estado inicial
const initialState: ProjectsState = {
  projects: [],
  isLoading: false,
  hasError: false,
  errorMessage: "",
};

const STORAGE_KEY = "projectsState";

// 3. Crea la función del store
export function createProjectsStore() {
  
}
