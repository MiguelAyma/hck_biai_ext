import { createPageId } from "../utils/createPageId";
import { projectsStore, type Webpage } from "../stores/projectsStore";
import { extractPlainTextMarkdown } from "./contentExtrator.service";

// Script que se ejecuta en el contexto de la página
function extractMetadataScript() {
  function getMetaContent(name: string): string {
    const selectors = [
      `meta[name="${name}"]`,
      `meta[property="${name}"]`,
      `meta[property="og:${name}"]`,
      `meta[name="twitter:${name}"]`,
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.getAttribute("content");
        if (content) return content;
      }
    }
    return "";
  }

  const title =
    getMetaContent("title") ||
    getMetaContent("og:title") ||
    document.title ||
    "";

  const description =
    getMetaContent("description") ||
    getMetaContent("og:description") ||
    getMetaContent("twitter:description") ||
    "";

  const image =
    getMetaContent("image") ||
    getMetaContent("og:image") ||
    getMetaContent("twitter:image") ||
    "";

  const author =
    getMetaContent("author") || getMetaContent("article:author") || "";

  const publishedDate =
    getMetaContent("article:published_time") ||
    getMetaContent("datePublished") ||
    "";

  // Extraer favicon
  let favicon = "";
  const faviconLink = document.querySelector(
    'link[rel="icon"], link[rel="shortcut icon"]'
  ) as HTMLLinkElement;
  if (faviconLink && faviconLink.href) {
    favicon = faviconLink.href;
  } else {
    // Fallback al favicon por defecto
    favicon = `${window.location.origin}/favicon.ico`;
  }

  return {
    title,
    description,
    image,
    url: window.location.href,
    favicon,
    author,
    publishedDate,
  };
}

interface ExtractedMetadata {
  title: string;
  description: string;
  image: string;
  url: string;
  favicon: string;
  author: string;
  publishedDate: string;
}

/**
 * Servicio para extraer metadata de páginas web y gestionar su almacenamiento
 */
class MetadataExtractorService {
  /**
   * Obtiene el tab activo de Chrome
   */
  private async getActiveTab(): Promise<chrome.tabs.Tab> {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab || !tab.id) {
      throw new Error("No active tab found");
    }

    return tab;
  }

  /**
   * Ejecuta el script de extracción en el tab actual
   */
  private async executeExtractionScript(
    tabId: number
  ): Promise<ExtractedMetadata> {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractMetadataScript,
    });

    if (!results || !results[0] || !results[0].result) {
      throw new Error("No se pudo extraer la metadata");
    }

    return results[0].result;
  }

  /**
   * Convierte metadata extraída a formato Webpage
   */
  private metadataToWebpage(
    metadata: ExtractedMetadata
  ): Omit<Webpage, "addedAt"> & { id: string } {
    const id = createPageId(metadata.url);

    return {
      id,
      title: metadata.title || "Sin título",
      url: metadata.url,
      faviconUrl: metadata.favicon || "",
      rawMarkdown: "",
      strippedMarkdown: "",
      refinedMarkdown: "",
      markdownSummaryLong: "",
      markdownSummaryMedium: "",
      markdownSummaryShort: "",
    };
  }

  /**
   * Extrae solo el favicon de la página actual
   */
  async extractFavicon(): Promise<string> {
    try {
      const tab = await this.getActiveTab();
      const metadata = await this.executeExtractionScript(tab.id!);
      return metadata.favicon;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error extracting favicon:", error);
      throw new Error(`Failed to extract favicon: ${message}`);
    }
  }

  /**
   * Extrae metadata completa de la página actual sin añadirla al store
   */
  async extractMetadata(): Promise<ExtractedMetadata> {
    try {
      const tab = await this.getActiveTab();
      return await this.executeExtractionScript(tab.id!);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("Error extracting metadata:", error);
      throw new Error(`Failed to extract metadata: ${message}`);
    }
  }

  /**extractAndAddIfNew
   * Extrae la metadata de la página actual y la añade al proyecto especificado
   */
  async extractAndAddToProject(projectId: string): Promise<void> {
    projectsStore.setLoading(true);
    projectsStore.clearError();

    try {
      const tab = await this.getActiveTab();
      const metadata = await this.executeExtractionScript(tab.id!);
      const webpage = await this.metadataToWebpage(metadata);

      await projectsStore.addWebpage(projectId, webpage);
      // await extractPlainTextMarkdown(tab.url, projectId);
      //projectsStore.setStrippedMarkdown(plainTextMarkdownStore.content);

      console.log("Metadata extracted and added to project:", {
        projectId,
        webpage: {
          id: webpage.id,
          title: webpage.title,
          url: webpage.url,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      projectsStore.setError(message);
      console.error("Error extracting and adding metadata:", error);
      throw error;
    } finally {
      projectsStore.setLoading(false);
    }
  }

  /**
   * Verifica si una URL ya existe en un proyecto
   */
  isUrlInProject(projectId: string, url: string): boolean {
    let exists = false;

    projectsStore.subscribe((state) => {
      const project = state.projects.find((p) => p.id === projectId);
      if (project) {
        exists = project.webpages.some((webpage) => webpage.url === url);
      }
    })();

    return exists;
  }

  // const extractFullMarkdownPlain = async (url: string) => {
  //   try {
  //     console.log("URL extraida:", url);
  //     await extractPlainTextMarkdown(url);
  //     console.log("Markdown extraido:", $plainTextMarkdownStore.content);
  //   } catch (error) {
  //     console.error("Error extracting markdown:", error);
  //     return "";
  //   }
  // };

  /**
   * Extrae y añade metadata solo si la URL no existe en el proyecto
   */

  async extractAndAddIfNew(projectId: string): Promise<string> {
    try {
      const tab = await this.getActiveTab();
      const currentUrl = tab.url || "";

      if (this.isUrlInProject(projectId, currentUrl)) {
        console.log("URL already exists in project:", currentUrl);
        return "";
      }

      await this.extractAndAddToProject(projectId);
      // await extractPlainTextMarkdown(currentUrl);
      return currentUrl;
    } catch (error) {
      console.error("Error in extractAndAddIfNew:", error);
      throw error;
    }
  }
}

// Exportar una instancia singleton del servicio
export const projectPagesService = new MetadataExtractorService();

// Mantener exports de funciones para compatibilidad (deprecated)
/** @deprecated Use metadataExtractorService.extractFavicon() instead */
export const extractImageCurrentPage = () =>
  projectPagesService.extractFavicon();

/** @deprecated Use metadataExtractorService.extractAndAddToProject() instead */
export const extractAndAddMetadata = (projectId: string) =>
  projectPagesService.extractAndAddToProject(projectId);

/** @deprecated Use metadataExtractorService.extractMetadata() instead */
export const extractMetadataOnly = () => projectPagesService.extractMetadata();
// import { projectsStore, type Webpage } from "../stores/projectsStore";

// // Script que se ejecuta en el contexto de la página
// function extractMetadataScript() {
//   function getMetaContent(name: string): string {
//     const selectors = [
//       `meta[name="${name}"]`,
//       `meta[property="${name}"]`,
//       `meta[property="og:${name}"]`,
//       `meta[name="twitter:${name}"]`,
//     ];

//     for (const selector of selectors) {
//       const element = document.querySelector(selector);
//       if (element) {
//         const content = element.getAttribute("content");
//         if (content) return content;
//       }
//     }
//     return "";
//   }

//   const title =
//     getMetaContent("title") ||
//     getMetaContent("og:title") ||
//     document.title ||
//     "";

//   const description =
//     getMetaContent("description") ||
//     getMetaContent("og:description") ||
//     getMetaContent("twitter:description") ||
//     "";

//   const image =
//     getMetaContent("image") ||
//     getMetaContent("og:image") ||
//     getMetaContent("twitter:image") ||
//     "";

//   const author =
//     getMetaContent("author") || getMetaContent("article:author") || "";

//   const publishedDate =
//     getMetaContent("article:published_time") ||
//     getMetaContent("datePublished") ||
//     "";

//   // Extraer favicon
//   let favicon = "";
//   const faviconLink = document.querySelector(
//     'link[rel="icon"], link[rel="shortcut icon"]'
//   ) as HTMLLinkElement;
//   if (faviconLink && faviconLink.href) {
//     favicon = faviconLink.href;
//   } else {
//     // Fallback al favicon por defecto
//     favicon = `${window.location.origin}/favicon.ico`;
//   }

//   return {
//     title,
//     description,
//     image,
//     url: window.location.href,
//     favicon,
//     author,
//     publishedDate,
//   };
// }

// interface ExtractedMetadata {
//   title: string;
//   description: string;
//   image: string;
//   url: string;
//   favicon: string;
//   author: string;
//   publishedDate: string;
// }

// /**
//  * Servicio para extraer metadata de páginas web y gestionar su almacenamiento
//  */
// class MetadataExtractorService {
//   /**
//    * Obtiene el tab activo de Chrome
//    */
//   private async getActiveTab(): Promise<chrome.tabs.Tab> {
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       currentWindow: true,
//     });

//     if (!tab || !tab.id) {
//       throw new Error("No active tab found");
//     }

//     return tab;
//   }

//   /**
//    * Ejecuta el script de extracción en el tab actual
//    */
//   private async executeExtractionScript(
//     tabId: number
//   ): Promise<ExtractedMetadata> {
//     const results = await chrome.scripting.executeScript({
//       target: { tabId },
//       func: extractMetadataScript,
//     });

//     if (!results || !results[0] || !results[0].result) {
//       throw new Error("No se pudo extraer la metadata");
//     }

//     return results[0].result;
//   }

//   /**
//    * Convierte metadata extraída a formato Webpage
//    */
//   private metadataToWebpage(
//     metadata: ExtractedMetadata
//   ): Omit<Webpage, "id" | "addedAt"> {
//     return {
//       title: metadata.title,
//       url: metadata.url,
//       faviconUrl: metadata.favicon,
//       rawMarkdown: "",
//       strippedMarkdown: "",
//       refinedMarkdown: "",
//       markdownSummaryLong: "",
//       markdownSummaryMedium: "",
//       markdownSummaryShort: "",
//     };
//   }

//   /**
//    * Extrae solo el favicon de la página actual
//    */
//   async extractFavicon(): Promise<string> {
//     try {
//       const tab = await this.getActiveTab();
//       const metadata = await this.executeExtractionScript(tab.id!);
//       return metadata.favicon;
//     } catch (error) {
//       const message = error instanceof Error ? error.message : "Unknown error";
//       console.error("Error extracting favicon:", error);
//       throw new Error(`Failed to extract favicon: ${message}`);
//     }
//   }

//   /**
//    * Extrae metadata completa de la página actual sin añadirla al store
//    */
//   async extractMetadata(): Promise<ExtractedMetadata> {
//     try {
//       const tab = await this.getActiveTab();
//       return await this.executeExtractionScript(tab.id!);
//     } catch (error) {
//       const message = error instanceof Error ? error.message : "Unknown error";
//       console.error("Error extracting metadata:", error);
//       throw new Error(`Failed to extract metadata: ${message}`);
//     }
//   }

//   /**
//    * Extrae la metadata de la página actual y la añade al proyecto especificado
//    */
//   async extractAndAddToProject(projectId: string): Promise<void> {
//     projectsStore.setLoading(true);
//     projectsStore.clearError();

//     try {
//       const tab = await this.getActiveTab();
//       const metadata = await this.executeExtractionScript(tab.id!);
//       const webpage = this.metadataToWebpage(metadata);

//       await projectsStore.addWebpage(projectId, webpage);

//       console.log("Metadata extracted and added to project:", {
//         projectId,
//         webpage: {
//           title: webpage.title,
//           url: webpage.url,
//         },
//       });
//     } catch (error) {
//       const message = error instanceof Error ? error.message : "Unknown error";
//       projectsStore.setError(message);
//       console.error("Error extracting and adding metadata:", error);
//       throw error;
//     } finally {
//       projectsStore.setLoading(false);
//     }
//   }

//   /**
//    * Verifica si una URL ya existe en un proyecto
//    */
//   isUrlInProject(projectId: string, url: string): boolean {
//     let exists = false;

//     projectsStore.subscribe((state) => {
//       const project = state.projects.find((p) => p.id === projectId);
//       if (project) {
//         exists = project.webpages.some((webpage) => webpage.url === url);
//       }
//     })();

//     return exists;
//   }

//   /**
//    * Extrae y añade metadata solo si la URL no existe en el proyecto
//    */
//   async extractAndAddIfNew(projectId: string): Promise<boolean> {
//     try {
//       const tab = await this.getActiveTab();
//       const currentUrl = tab.url || "";

//       if (this.isUrlInProject(projectId, currentUrl)) {
//         console.log("URL already exists in project:", currentUrl);
//         return false;
//       }

//       await this.extractAndAddToProject(projectId);
//       return true;
//     } catch (error) {
//       console.error("Error in extractAndAddIfNew:", error);
//       throw error;
//     }
//   }
// }

// // Exportar una instancia singleton del servicio
// export const metadataExtractorService = new MetadataExtractorService();

// // Mantener exports de funciones para compatibilidad (deprecated)
// /** @deprecated Use metadataExtractorService.extractFavicon() instead */
// export const extractImageCurrentPage = () =>
//   metadataExtractorService.extractFavicon();

// /** @deprecated Use metadataExtractorService.extractAndAddToProject() instead */
// export const extractAndAddMetadata = (projectId: string) =>
//   metadataExtractorService.extractAndAddToProject(projectId);

// /** @deprecated Use metadataExtractorService.extractMetadata() instead */
// export const extractMetadataOnly = () =>
//   metadataExtractorService.extractMetadata();
