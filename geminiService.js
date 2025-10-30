class GeminiService {
  //geminiService.js
  constructor() {
    this.activeRequests = new Map();
  }
  async generateSummary(content, length, requestId) {
    console.log(`Gemini: Generando resumen ${length} (ID: ${requestId})`);

    try {
      // Validar que el contenido sea suficiente
      if (!content || content.trim().length < 150) {
        throw new Error("El contenido es demasiado corto para generar un resumen.");
      }

      const sharedContext = "You are an expert AI assistant specializing in distilling web content from Markdown format into clear and concise summaries. Your goal is to help a user quickly grasp the core message, key arguments, and important conclusions of a webpage. Focus on extracting the most valuable information.";

      // Crear el summarizer
      const summarizer = await Summarizer.create({
        sharedContext,
        type: 'key-points',
        length,
        format: 'markdown'
      });

      // Guardar referencia para posible cancelación
      this.activeRequests.set(requestId, summarizer);

      // Generar el resumen
      const result = await summarizer.summarize(content);

      // Limpiar referencia
      this.activeRequests.delete(requestId);

      console.log(`Gemini: Resumen ${length} completado`);
      return result;

    } catch (error) {
      console.error(`Gemini: Error al generar resumen ${length}:`, error);
      this.activeRequests.delete(requestId);
      throw error;
    }
  }

  cancelRequest(requestId) {
    const request = this.activeRequests.get(requestId);
    if (request && typeof request.destroy === 'function') {
      request.destroy();
      this.activeRequests.delete(requestId);
      console.log(`Gemini: Petición ${requestId} cancelada`);
    }
  }
}

// Exportar instancia unica(injectar en window para que sea global)
window.geminiService = new GeminiService();