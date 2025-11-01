export function createPageId(url: string): string {
  if (!url || typeof url !== "string") {
    throw new Error("URL inválida para generar ID");
  }
  try {
    // btoa() convierte la URL a Base64
    const base64 = btoa(url);
    return `page-${base64}`;
  } catch (error) {
    console.error("Error encoding URL to Base64:", error);
    throw new Error("No se pudo generar el ID de la página");
  }
}
