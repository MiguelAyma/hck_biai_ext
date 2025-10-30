import { projectStore, type PageMetadata } from "../stores/projectStore";
// metadataExtractor.service.ts

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

export async function extraImageCurrentPage(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractMetadataScript,
    });

    if (results && results[0] && results[0].result) {
      const metadata = results[0].result;

      return metadata.favicon;
    } else {
      throw new Error("No se pudo extraer la metadata");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error extracting metadata:", error);
    throw new Error(message);
  }
}

export async function extractAndAddMetadata(projectId: string): Promise<void> {
  projectStore.setLoading(true);
  projectStore.clearError();

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractMetadataScript,
    });

    if (results && results[0] && results[0].result) {
      const metadata = results[0].result;

      const pageMetadata: Omit<PageMetadata, "id" | "addedAt"> = {
        projectId,
        title: metadata.title,
        description: metadata.description,
        image: metadata.image,
        url: metadata.url,
        favicon: metadata.favicon,
        author: metadata.author,
        publishedDate: metadata.publishedDate,
      };

      await projectStore.addPage(pageMetadata);
      console.log("Metadata extracted and added:", pageMetadata);
    } else {
      throw new Error("No se pudo extraer la metadata");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    projectStore.setError(message);
    console.error("Error extracting metadata:", error);
  } finally {
    projectStore.setLoading(false);
  }
}
// import { metadataStore, type PageMetadata } from "../stores/metadataStore";
// //metadataExtractor.service.ts
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

// export async function extractAndAddMetadata(): Promise<void> {
//   metadataStore.setLoading(true);
//   metadataStore.clearError();

//   try {
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       currentWindow: true,
//     });

//     if (!tab.id) {
//       throw new Error("No active tab found");
//     }

//     const results = await chrome.scripting.executeScript({
//       target: { tabId: tab.id },
//       func: extractMetadataScript,
//     });

//     if (results && results[0] && results[0].result) {
//       const metadata = results[0].result;

//       const pageMetadata: PageMetadata = {
//         id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
//         title: metadata.title,
//         description: metadata.description,
//         image: metadata.image,
//         url: metadata.url,
//         favicon: metadata.favicon,
//         author: metadata.author,
//         publishedDate: metadata.publishedDate,
//         addedAt: Date.now(),
//       };

//       await metadataStore.addMetadata(pageMetadata);
//       console.log("Metadata extracted and added:", pageMetadata);
//     } else {
//       throw new Error("No se pudo extraer la metadata");
//     }
//   } catch (error) {
//     const message = error instanceof Error ? error.message : "Unknown error";
//     metadataStore.setError(message);
//     console.error("Error extracting metadata:", error);
//   } finally {
//     metadataStore.setLoading(false);
//   }
// }
