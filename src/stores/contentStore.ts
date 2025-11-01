import { writable } from "svelte/store";
import type { Writable } from "svelte/store";
import type { ImageData } from "../types/types";

interface FullMarkdownState {
  content: string;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

function createFullMarkdownStore() {
  const { subscribe, set, update }: Writable<FullMarkdownState> = writable({
    content: "",
    isLoading: false,
    hasError: false,
    errorMessage: "",
  });

  return {
    subscribe,
    setLoading: (loading: boolean) => {
      update((state) => ({ ...state, isLoading: loading }));
    },
    setContent: (content: string) => {
      update((state) => ({
        ...state,
        content,
        hasError: false,
        errorMessage: "",
      }));
    },
    setError: (message: string) => {
      update((state) => ({
        ...state,
        hasError: true,
        errorMessage: message,
        isLoading: false,
      }));
    },
    reset: () => {
      set({
        content: "",
        isLoading: false,
        hasError: false,
        errorMessage: "",
      });
    },
  };
}

interface TextOnlyMarkdownState {
  content: string;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

function createTextOnlyMarkdownStore() {
  const { subscribe, set, update }: Writable<TextOnlyMarkdownState> = writable({
    content: "",
    isLoading: false,
    hasError: false,
    errorMessage: "",
  });

  return {
    subscribe,
    setLoading: (loading: boolean) => {
      update((state) => ({ ...state, isLoading: loading }));
    },
    setContent: (content: string) => {
      update((state) => ({
        ...state,
        content,
        hasError: false,
        errorMessage: "",
      }));
    },
    setError: (message: string) => {
      update((state) => ({
        ...state,
        hasError: true,
        errorMessage: message,
        isLoading: false,
      }));
    },
    reset: () => {
      set({
        content: "",
        isLoading: false,
        hasError: false,
        errorMessage: "",
      });
    },
  };
}

interface RawMarkdownState {
  content: string;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

function createRawMarkdownStore() {
  const { subscribe, set, update }: Writable<RawMarkdownState> = writable({
    content: "",
    isLoading: false,
    hasError: false,
    errorMessage: "",
  });

  return {
    subscribe,
    setLoading: (loading: boolean) => {
      update((state) => ({ ...state, isLoading: loading }));
    },
    setContent: (content: string) => {
      update((state) => ({
        ...state,
        content,
        hasError: false,
        errorMessage: "",
      }));
    },
    setError: (message: string) => {
      update((state) => ({
        ...state,
        hasError: true,
        errorMessage: message,
        isLoading: false,
      }));
    },
    reset: () => {
      set({
        content: "",
        isLoading: false,
        hasError: false,
        errorMessage: "",
      });
    },
  };
}

interface ImagesState {
  images: ImageData[];
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

function createImagesStore() {
  const { subscribe, set, update }: Writable<ImagesState> = writable({
    images: [],
    isLoading: false,
    hasError: false,
    errorMessage: "",
  });

  return {
    subscribe,
    setLoading: (loading: boolean) => {
      update((state) => ({ ...state, isLoading: loading }));
    },
    setImages: (images: ImageData[]) => {
      update((state) => ({
        ...state,
        images,
        hasError: false,
        errorMessage: "",
      }));
    },
    setError: (message: string) => {
      update((state) => ({
        ...state,
        hasError: true,
        errorMessage: message,
        isLoading: false,
      }));
    },
    reset: () => {
      set({
        images: [],
        isLoading: false,
        hasError: false,
        errorMessage: "",
      });
    },
  };
}

//nuevo

interface PlainTextMarkdownState {
  content: string;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

function createPlainTextMarkdownStore() {
  const { subscribe, set, update }: Writable<PlainTextMarkdownState> = writable(
    {
      content: "",
      isLoading: false,
      hasError: false,
      errorMessage: "",
    }
  );

  return {
    subscribe,
    setLoading: (loading: boolean) => {
      update((state) => ({ ...state, isLoading: loading }));
    },
    setContent: (content: string) => {
      update((state) => ({
        ...state,
        content,
        hasError: false,
        errorMessage: "",
      }));
    },
    setError: (message: string) => {
      update((state) => ({
        ...state,
        hasError: true,
        errorMessage: message,
        isLoading: false,
      }));
    },
    reset: () => {
      set({
        content: "",
        isLoading: false,
        hasError: false,
        errorMessage: "",
      });
    },
  };
}

// 1. He definido la interfaz para el estado del nuevo store
interface CleanMarkdownByIaState {
  content: string;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

// 2. He renombrado la función como pediste
export function createCleanMarkdownByIaStore() {
  const { subscribe, set, update }: Writable<CleanMarkdownByIaState> = writable(
    {
      content: "",
      isLoading: false,
      hasError: false,
      errorMessage: "",
    }
  );

  // 3. El resto de la lógica interna es idéntica
  return {
    subscribe,
    setLoading: (loading: boolean) => {
      update((state) => ({ ...state, isLoading: loading }));
    },
    setContent: (content: string) => {
      update((state) => ({
        ...state,
        content,
        hasError: false,
        errorMessage: "",
      }));
    },
    setError: (message: string) => {
      update((state) => ({
        ...state,
        hasError: true,
        errorMessage: message,
        isLoading: false,
      }));
    },
    reset: () => {
      set({
        content: "",
        isLoading: false,
        hasError: false,
        errorMessage: "",
      });
    },
  };
}

export const cleanMarkdownByIaStore = createCleanMarkdownByIaStore();
export const plainTextMarkdownStore = createPlainTextMarkdownStore();
export const fullMarkdownStore = createFullMarkdownStore();
export const textOnlyMarkdownStore = createTextOnlyMarkdownStore();
export const rawMarkdownStore = createRawMarkdownStore();
export const imagesStore = createImagesStore();
