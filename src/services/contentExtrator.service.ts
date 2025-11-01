import {
  fullMarkdownStore,
  textOnlyMarkdownStore,
  imagesStore,
  rawMarkdownStore,
  plainTextMarkdownStore,
} from "../stores/contentStore";
import type { ImageData } from "../types/types";

function extractFullMarkdownScript() {
  if (typeof TurndownService === "undefined") {
    return "Error: Turndown library not found.";
  }

  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });

  turndownService.remove([
    "script",
    "style",
    "noscript",
    "iframe",
    "nav",
    "footer",
    "button",
    "aside",
  ]);

  turndownService.addRule("images", {
    filter: "img",
    replacement: function (content, node) {
      const imgNode = node as HTMLImageElement;
      const alt = imgNode.alt || "";
      let src = imgNode.src || "";
      if (!src) return "";
      try {
        src = new URL(src, window.location.href).href;
      } catch (e) {
        return "";
      }
      return `![${alt}](${src})`;
    },
  });

  const contentElement =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector('[role="main"]') ||
    document.body;

  const clonedContent = contentElement.cloneNode(true) as HTMLElement; // Limpieza de selectores de anuncios (sin tocar h1-h3)

  const adSelectors =
    '.ads, .advertisement, #comments, .sidebar, .ad, [class*="banner"]';
  clonedContent.querySelectorAll(adSelectors).forEach((el) => {
    if (!el.closest("h1") && !el.closest("h2") && !el.closest("h3")) {
      el.remove();
    }
  });

  clonedContent.querySelectorAll("header").forEach((headerEl) => {
    // Busca CUALQUIER encabezado (h1, h2, h3, etc.)
    const headings = headerEl.querySelectorAll("h1, h2, h3, h4, h5, h6");

    if (headings.length > 0) {
      // Si encuentra encabezados, los guarda temporalmente
      const headingsToKeep = Array.from(headings); // Vacia el header
      while (headerEl.firstChild) {
        headerEl.removeChild(headerEl.firstChild);
      } // Vuelve a añadir solo los encabezados que encontró
      headingsToKeep.forEach((h) => headerEl.appendChild(h));
    } else {
      // Si no hay ningún encabezado, elimina el header
      headerEl.remove();
    }
  }); // Revisa si existe algún H1 en TODO el contenido clonado
  const hasH1 = clonedContent.querySelector("h1");

  if (!hasH1) {
    // Si NO hay H1, promueve todos los demás encabezados
    for (let i = 2; i <= 6; i++) {
      // Itera de h2 a h6
      const headingsToPromote = clonedContent.querySelectorAll(`h${i}`);
      headingsToPromote.forEach((oldHeading) => {
        // Crea el nuevo elemento de encabezado (ej. h2 -> h1)
        const newHeading = document.createElement(`h${i - 1}`); // Copia el contenido interno
        newHeading.innerHTML = oldHeading.innerHTML;
        for (const attr of oldHeading.attributes) {
          newHeading.setAttribute(attr.name, attr.value);
        } // Reemplaza el encabezado antiguo por el nuevo
        oldHeading.parentNode?.replaceChild(newHeading, oldHeading);
      });
    }
  }
  let markdown = turndownService.turndown(clonedContent);
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return markdown;
}

export async function extractFullMarkdown(): Promise<void> {
  fullMarkdownStore.setLoading(true);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["turndown.min.js"],
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractFullMarkdownScript,
    });

    if (results && results[0] && results[0].result) {
      fullMarkdownStore.setContent(results[0].result);
      console.log(
        "Full markdown extracted:",
        results[0].result.substring(0, 200) + "..."
      );
    } else {
      throw new Error("No se pudo extraer contenido");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    fullMarkdownStore.setError(message);
    console.error("Error extracting full markdown:", error);
  } finally {
    fullMarkdownStore.setLoading(false);
  }
}

function extractTextOnlyMarkdownScript() {
  if (typeof TurndownService === "undefined") {
    return "Error: Turndown library not found.";
  }

  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });

  turndownService.remove([
    "script",
    "style",
    "noscript",
    "iframe",
    "nav",
    "footer",
    "aside",
    "img",
  ]);

  const contentElement =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector('[role="main"]') ||
    document.body;

  const clonedContent = contentElement.cloneNode(true) as HTMLElement; // Limpieza de selectores de anuncios (sin tocar h1-h3)

  const adSelectors =
    '.ads, .advertisement, #comments, .sidebar, .ad, [class*="banner"]';
  clonedContent.querySelectorAll(adSelectors).forEach((el) => {
    if (!el.closest("h1") && !el.closest("h2") && !el.closest("h3")) {
      el.remove();
    }
  });

  clonedContent.querySelectorAll("header").forEach((headerEl) => {
    const headings = headerEl.querySelectorAll("h1, h2, h3, h4, h5, h6");
    if (headings.length > 0) {
      const headingsToKeep = Array.from(headings);
      while (headerEl.firstChild) {
        headerEl.removeChild(headerEl.firstChild);
      }
      headingsToKeep.forEach((h) => headerEl.appendChild(h));
    } else {
      headerEl.remove();
    }
  });
  const hasH1 = clonedContent.querySelector("h1");
  if (!hasH1) {
    for (let i = 2; i <= 6; i++) {
      const headingsToPromote = clonedContent.querySelectorAll(`h${i}`);
      headingsToPromote.forEach((oldHeading) => {
        const newHeading = document.createElement(`h${i - 1}`);
        newHeading.innerHTML = oldHeading.innerHTML;
        for (const attr of oldHeading.attributes) {
          newHeading.setAttribute(attr.name, attr.value);
        }
        oldHeading.parentNode?.replaceChild(newHeading, oldHeading);
      });
    }
  }
  let markdown = turndownService.turndown(clonedContent);
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return markdown;
}

export async function extractTextOnlyMarkdown(): Promise<void> {
  textOnlyMarkdownStore.setLoading(true);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["turndown.min.js"],
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractTextOnlyMarkdownScript,
    });

    if (results && results[0] && results[0].result) {
      textOnlyMarkdownStore.setContent(results[0].result);
      console.log(
        "Text-only markdown extracted:",
        results[0].result.substring(0, 200) + "..."
      );
    } else {
      throw new Error("No se pudo extraer contenido");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    textOnlyMarkdownStore.setError(message);
    console.error("Error extracting text-only markdown:", error);
  } finally {
    textOnlyMarkdownStore.setLoading(false);
  }
}

function extractImagesScript(): ImageData[] {
  const images: ImageData[] = [];
  const contentElement =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector('[role="main"]') ||
    document.body;

  const clonedContent = contentElement.cloneNode(true) as HTMLElement;

  // Eliminar header, nav, footer, aside, ads, sidebar
  clonedContent
    .querySelectorAll(
      "nav, footer, aside, " +
        ".ads, .advertisement, #comments, .sidebar, .ad, " +
        '[class*="logo"], [id*="logo"], ' +
        '[id*="menu"], ' +
        '[id*="navbar"], ' +
        '[class*="navigation"], [id*="navigation"], ' +
        '[id*="header"], ' +
        '[class*="footer"], [id*="footer"], ' +
        '[id*="sidebar"]'
    )
    .forEach((el) => el.remove());

  const imgElements = clonedContent.querySelectorAll("img");

  imgElements.forEach((img) => {
    let src = img.src || "";
    const alt = img.alt || "";

    if (!src) return;

    try {
      src = new URL(src, window.location.href).href;
    } catch (e) {
      return;
    }

    let description = "";

    // Buscar descripcion en figcaption
    const figcaption = img.closest("figure")?.querySelector("figcaption");
    if (figcaption) {
      description = figcaption.textContent?.trim() || "";
    }

    // Si no hay figcaption, buscar en el siguiente elemento solo si está dentro del mismo contenedor
    if (!description) {
      const figure = img.closest("figure");
      if (figure) {
        const nextElement = figure.nextElementSibling;
        if (nextElement && nextElement.tagName === "P") {
          const text = nextElement.textContent?.trim();
          if (text && text.length < 300) {
            description = text;
          }
        }
      } else {
        // Si no esta en un figure, buscar en el contenedor padre directo
        const parent = img.parentElement;
        if (parent) {
          const captionElement = parent.querySelector(
            '.caption, .image-caption, [class*="caption"]'
          );
          if (captionElement && captionElement !== img) {
            const text = captionElement.textContent?.trim();
            if (text && text.length < 300) {
              description = text;
            }
          }
        }
      }
    }

    images.push({
      src,
      alt,
      description,
    });
  });

  return images;
}

export async function extractImages(): Promise<void> {
  imagesStore.setLoading(true);

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
      func: extractImagesScript,
    });

    if (results && results[0] && results[0].result) {
      const extractedImages = results[0].result as ImageData[];

      imagesStore.setImages(extractedImages);
      console.log("Imágenes extraídas:", extractedImages);
      console.log(`${extractedImages.length} images extracted`);
    } else {
      throw new Error("No se pudo extraer imágenes");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    imagesStore.setError(message);
    console.error("Error extracting images:", error);
  } finally {
    imagesStore.setLoading(false);
  }
}

//////////////////
function extractRawMarkdownScript() {
  if (typeof TurndownService === "undefined") {
    return "Error: Turndown library not found.";
  }

  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
    linkStyle: "inlined",
  });

  turndownService.remove([
    "script",
    "style",
    "noscript",
    "iframe",
    "nav",
    "footer",
    "aside",
  ]);

  turndownService.addRule("images", {
    filter: "img",
    replacement: function (content, node) {
      const imgNode = node as HTMLImageElement;
      const alt = imgNode.alt || "";
      let src = imgNode.src || "";
      if (!src) return "";
      try {
        src = new URL(src, window.location.href).href;
      } catch (e) {
        return "";
      }
      return `![${alt}](${src})`;
    },
  });

  const contentElement =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector('[role="main"]') ||
    document.body;

  const clonedContent = contentElement.cloneNode(true) as HTMLElement; // Limpieza de selectores de anuncios (sin tocar h1-h3)

  const adSelectors =
    '.ads, .advertisement, #comments, .sidebar, .ad, [class*="banner"]';
  clonedContent.querySelectorAll(adSelectors).forEach((el) => {
    if (!el.closest("h1") && !el.closest("h2") && !el.closest("h3")) {
      el.remove();
    }
  });

  clonedContent.querySelectorAll("header").forEach((headerEl) => {
    const headings = headerEl.querySelectorAll("h1, h2, h3, h4, h5, h6");
    if (headings.length > 0) {
      const headingsToKeep = Array.from(headings);
      while (headerEl.firstChild) {
        headerEl.removeChild(headerEl.firstChild);
      }
      headingsToKeep.forEach((h) => headerEl.appendChild(h));
    } else {
      headerEl.remove();
    }
  });
  const hasH1 = clonedContent.querySelector("h1");
  if (!hasH1) {
    for (let i = 2; i <= 6; i++) {
      const headingsToPromote = clonedContent.querySelectorAll(`h${i}`);
      headingsToPromote.forEach((oldHeading) => {
        const newHeading = document.createElement(`h${i - 1}`);
        newHeading.innerHTML = oldHeading.innerHTML;
        for (const attr of oldHeading.attributes) {
          newHeading.setAttribute(attr.name, attr.value);
        }
        oldHeading.parentNode?.replaceChild(newHeading, oldHeading);
      });
    }
  }
  let markdown = turndownService.turndown(clonedContent);
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return markdown;
}

export async function extractRawMarkdown(): Promise<void> {
  rawMarkdownStore.setLoading(true);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["turndown.min.js"],
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractRawMarkdownScript,
    });

    if (results && results[0] && results[0].result) {
      rawMarkdownStore.setContent(results[0].result);
      console.log(
        "Raw markdown extracted:",
        results[0].result.substring(0, 200) + "..."
      );
    } else {
      throw new Error("No se pudo extraer contenido markdown");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    rawMarkdownStore.setError(message);
    console.error("Error extracting raw markdown:", error);
  } finally {
    rawMarkdownStore.setLoading(false);
  }
}

////////////nuevo extract plain text
function extractPlainTextMarkdownScript() {
  if (typeof TurndownService === "undefined") {
    return "Error: Turndown library not found.";
  }

  const turndownService = new TurndownService({
    headingStyle: "atx",
    hr: "---",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
  });

  // Eliminar elementos innecesarios
  turndownService.remove([
    "script",
    "style",
    "noscript",
    "iframe",
    "nav",
    "footer",
    "aside",
    "img",
    "button",
    "a",
  ]);

  // Regla para eliminar imágenes completamente
  turndownService.addRule("removeImages", {
    filter: "img",
    replacement: () => "",
  });

  // Regla para eliminar enlaces completamente
  turndownService.addRule("removeLinks", {
    filter: "a",
    replacement: () => "",
  });

  const contentElement =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.querySelector('[role="main"]') ||
    document.body;

  const clonedContent = contentElement.cloneNode(true) as HTMLElement;

  // Limpieza de selectores de anuncios, sidebar, footer
  const removeSelectors =
    '.ads, .advertisement, #comments, .sidebar, .ad, [class*="banner"], footer, aside, nav, [class*="sidebar"], [id*="sidebar"]';
  clonedContent.querySelectorAll(removeSelectors).forEach((el) => {
    if (!el.closest("h1") && !el.closest("h2") && !el.closest("h3")) {
      el.remove();
    }
  });

  // Eliminar imágenes del DOM clonado
  clonedContent.querySelectorAll("img").forEach((img) => img.remove());

  // Eliminar enlaces completamente del DOM clonado
  clonedContent.querySelectorAll("a").forEach((link) => link.remove());

  // Procesar headers
  clonedContent.querySelectorAll("header").forEach((headerEl) => {
    const headings = headerEl.querySelectorAll("h1, h2, h3, h4, h5, h6");

    if (headings.length > 0) {
      const headingsToKeep = Array.from(headings);
      while (headerEl.firstChild) {
        headerEl.removeChild(headerEl.firstChild);
      }
      headingsToKeep.forEach((h) => headerEl.appendChild(h));
    } else {
      headerEl.remove();
    }
  });

  // Promover headings si no hay H1
  const hasH1 = clonedContent.querySelector("h1");

  if (!hasH1) {
    for (let i = 2; i <= 6; i++) {
      const headingsToPromote = clonedContent.querySelectorAll(`h${i}`);
      headingsToPromote.forEach((oldHeading) => {
        const newHeading = document.createElement(`h${i - 1}`);
        newHeading.innerHTML = oldHeading.innerHTML;
        for (const attr of oldHeading.attributes) {
          newHeading.setAttribute(attr.name, attr.value);
        }
        oldHeading.parentNode?.replaceChild(newHeading, oldHeading);
      });
    }
  }

  let markdown = turndownService.turndown(clonedContent);
  markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

  return markdown;
}

// Función auxiliar para extraer contenido de una URL específica
async function fetchAndExtractFromUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    if (typeof TurndownService === "undefined") {
      throw new Error("Turndown library not found.");
    }

    const turndownService = new TurndownService({
      headingStyle: "atx",
      hr: "---",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
      emDelimiter: "*",
      strongDelimiter: "**",
    });

    turndownService.remove([
      "script",
      "style",
      "noscript",
      "iframe",
      "nav",
      "footer",
      "aside",
      "img",
      "button",
      "a",
    ]);

    turndownService.addRule("removeImages", {
      filter: "img",
      replacement: () => "",
    });

    turndownService.addRule("removeLinks", {
      filter: "a",
      replacement: () => "",
    });

    const contentElement =
      doc.querySelector("article") ||
      doc.querySelector("main") ||
      doc.querySelector('[role="main"]') ||
      doc.body;

    const clonedContent = contentElement.cloneNode(true) as HTMLElement;

    const removeSelectors =
      '.ads, .advertisement, #comments, .sidebar, .ad, [class*="banner"], footer, aside, nav, [class*="sidebar"], [id*="sidebar"]';
    clonedContent.querySelectorAll(removeSelectors).forEach((el) => {
      if (!el.closest("h1") && !el.closest("h2") && !el.closest("h3")) {
        el.remove();
      }
    });

    clonedContent.querySelectorAll("img").forEach((img) => img.remove());
    clonedContent.querySelectorAll("a").forEach((link) => link.remove());

    clonedContent.querySelectorAll("header").forEach((headerEl) => {
      const headings = headerEl.querySelectorAll("h1, h2, h3, h4, h5, h6");
      if (headings.length > 0) {
        const headingsToKeep = Array.from(headings);
        while (headerEl.firstChild) {
          headerEl.removeChild(headerEl.firstChild);
        }
        headingsToKeep.forEach((h) => headerEl.appendChild(h));
      } else {
        headerEl.remove();
      }
    });

    const hasH1 = clonedContent.querySelector("h1");
    if (!hasH1) {
      for (let i = 2; i <= 6; i++) {
        const headingsToPromote = clonedContent.querySelectorAll(`h${i}`);
        headingsToPromote.forEach((oldHeading) => {
          const newHeading = doc.createElement(`h${i - 1}`);
          newHeading.innerHTML = oldHeading.innerHTML;
          for (const attr of oldHeading.attributes) {
            newHeading.setAttribute(attr.name, attr.value);
          }
          oldHeading.parentNode?.replaceChild(newHeading, oldHeading);
        });
      }
    }

    let markdown = turndownService.turndown(clonedContent);
    markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

    return markdown;
  } catch (error) {
    throw new Error(
      `Error fetching URL: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

//USAR ESTA FUNCION PARA TRAER CONTENIDO MARKDOWN SIN IMAGENES, LINKS, ADS, FOOTER, SIDEBAR, ETC
// Función principal modificada para aceptar URL opcional
export async function extractPlainTextMarkdown(
  url?: string | null
): Promise<void> {
  plainTextMarkdownStore.setLoading(true);

  try {
    // Si se proporciona una URL, extraer de esa URL
    if (url && url.trim() !== "") {
      const markdown = await fetchAndExtractFromUrl(url);
      plainTextMarkdownStore.setContent(markdown);
      console.log(
        "Plain text markdown extracted from URL:",
        markdown.substring(0, 200) + "..."
      );
      return;
    }

    // Si no hay URL, extraer de la pestaña actual (comportamiento original)
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.id) {
      throw new Error("No active tab found");
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["turndown.min.js"],
    });

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPlainTextMarkdownScript,
    });

    if (results && results[0] && results[0].result) {
      plainTextMarkdownStore.setContent(results[0].result);
      console.log(
        "Plain text markdown extracted from current tab:",
        results[0].result.substring(0, 200) + "..."
      );
    } else {
      throw new Error("No se pudo extraer contenido");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    plainTextMarkdownStore.setError(message);
    console.error("Error extracting plain text markdown:", error);
  } finally {
    plainTextMarkdownStore.setLoading(false);
  }
}
// //contentScript.js
// function extractPlainTextMarkdownScript() {
//   if (typeof TurndownService === "undefined") {
//     return "Error: Turndown library not found.";
//   }

//   const turndownService = new TurndownService({
//     headingStyle: "atx",
//     hr: "---",
//     bulletListMarker: "-",
//     codeBlockStyle: "fenced",
//     emDelimiter: "*",
//     strongDelimiter: "**",
//   });

//   // Eliminar elementos innecesarios
//   turndownService.remove([
//     "script",
//     "style",
//     "noscript",
//     "iframe",
//     "nav",
//     "footer",
//     "aside",
//     "img",
//     "button",
//     "a",
//   ]);

//   // Regla para eliminar imágenes completamente
//   turndownService.addRule("removeImages", {
//     filter: "img",
//     replacement: () => "",
//   });

//   // Regla para eliminar enlaces completamente
//   turndownService.addRule("removeLinks", {
//     filter: "a",
//     replacement: () => "",
//   });

//   const contentElement =
//     document.querySelector("article") ||
//     document.querySelector("main") ||
//     document.querySelector('[role="main"]') ||
//     document.body;

//   const clonedContent = contentElement.cloneNode(true) as HTMLElement;

//   // Limpieza de selectores de anuncios, sidebar, footer
//   const removeSelectors =
//     '.ads, .advertisement, #comments, .sidebar, .ad, [class*="banner"], footer, aside, nav, [class*="sidebar"], [id*="sidebar"]';
//   clonedContent.querySelectorAll(removeSelectors).forEach((el) => {
//     if (!el.closest("h1") && !el.closest("h2") && !el.closest("h3")) {
//       el.remove();
//     }
//   });

//   // Eliminar imágenes del DOM clonado
//   clonedContent.querySelectorAll("img").forEach((img) => img.remove());

//   // Eliminar enlaces completamente del DOM clonado
//   clonedContent.querySelectorAll("a").forEach((link) => link.remove());

//   // Procesar headers
//   clonedContent.querySelectorAll("header").forEach((headerEl) => {
//     const headings = headerEl.querySelectorAll("h1, h2, h3, h4, h5, h6");

//     if (headings.length > 0) {
//       const headingsToKeep = Array.from(headings);
//       while (headerEl.firstChild) {
//         headerEl.removeChild(headerEl.firstChild);
//       }
//       headingsToKeep.forEach((h) => headerEl.appendChild(h));
//     } else {
//       headerEl.remove();
//     }
//   });

//   // Promover headings si no hay H1
//   const hasH1 = clonedContent.querySelector("h1");

//   if (!hasH1) {
//     for (let i = 2; i <= 6; i++) {
//       const headingsToPromote = clonedContent.querySelectorAll(`h${i}`);
//       headingsToPromote.forEach((oldHeading) => {
//         const newHeading = document.createElement(`h${i - 1}`);
//         newHeading.innerHTML = oldHeading.innerHTML;
//         for (const attr of oldHeading.attributes) {
//           newHeading.setAttribute(attr.name, attr.value);
//         }
//         oldHeading.parentNode?.replaceChild(newHeading, oldHeading);
//       });
//     }
//   }

//   let markdown = turndownService.turndown(clonedContent);
//   markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

//   return markdown;
// }

// export async function extractPlainTextMarkdown(): Promise<void> {
//   plainTextMarkdownStore.setLoading(true);

//   try {
//     const [tab] = await chrome.tabs.query({
//       active: true,
//       currentWindow: true,
//     });

//     if (!tab.id) {
//       throw new Error("No active tab found");
//     }

//     await chrome.scripting.executeScript({
//       target: { tabId: tab.id },
//       files: ["turndown.min.js"],
//     });

//     const results = await chrome.scripting.executeScript({
//       target: { tabId: tab.id },
//       func: extractPlainTextMarkdownScript,
//     });

//     if (results && results[0] && results[0].result) {
//       plainTextMarkdownStore.setContent(results[0].result);
//       console.log(
//         "Plain text markdown extracted:",
//         results[0].result.substring(0, 200) + "..."
//       );
//     } else {
//       throw new Error("No se pudo extraer contenido");
//     }
//   } catch (error) {
//     const message = error instanceof Error ? error.message : "Unknown error";
//     plainTextMarkdownStore.setError(message);
//     console.error("Error extracting plain text markdown:", error);
//   } finally {
//     plainTextMarkdownStore.setLoading(false);
//   }
// }
