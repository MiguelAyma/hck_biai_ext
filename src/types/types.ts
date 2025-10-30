export interface ImageData {
  src: string;
  alt: string;
  description: string;
}

export interface ExtractedContent {
  fullMarkdown: string;
  textOnlyMarkdown: string;
  images: ImageData[];
}

export interface ContentState {
  extractedContent: ExtractedContent;
  isLoading: boolean;
  hasError: boolean;
  errorMessage: string;
}

// src/types.ts
export interface ChatMessage {
  id: number;
  text: string;
  type: string;
}

export type ViewType = "chat" | "markdown" | "summaries" | "investigation";
