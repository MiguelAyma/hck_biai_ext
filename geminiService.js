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

class GeminiNanoCleaner {
  constructor() {
    this.activeSessions = new Map();
  }

  /**
   * Cancela una solicitud (sesión de plantilla) en progreso.
   */
  cancelRequest(requestId) {
    const session = this.activeSessions.get(requestId);
    if (session && typeof session.destroy === 'function') {
      try {
        session.destroy();
        this.activeSessions.delete(requestId);
        console.log(`GeminiNano: Sesión de plantilla ${requestId} cancelada.`);
      } catch (e) {
        console.error("Error al destruir la sesión:", e);
      }
    }
  }

  /**
   * PASO 1: Genera el resumen de contexto.
   */
  async _generateContextSummary(structuredData, requestId) {
    let summarySession = null;
    let totalTokens = 0;
    let mainTopicSummary = "General Content";

    try {
      const mainTitleSection = structuredData.find(section => section.level === 1);
      let contextText = "";
      if (mainTitleSection) {
        contextText += mainTitleSection.title + "\n\n";
        const longParagraphs = mainTitleSection.paragraphs
          .filter(p => p.text.split(/\s+/).length > 15)
          .slice(-2);
        contextText += longParagraphs.map(p => p.text).join("\n\n");
      } else {
        contextText = (structuredData[0]?.title || "").substring(0, 500);
      }

      if (contextText.trim()) {
        // !!! RELLENA TU PROMPT DE RESUMEN AQUÍ !!!
        const summaryPrompt = `Analyze the following text, which starts with an H1 title.
Your goal is to identify and summarize the **main informational or academic topic** in one very short sentence (under 15 words).
**IMPORTANT:** Actively **IGNORE** any initial text that seems like:
- Lists of locations (e.g., "Madrid", "Sevilla", "Barcelona")
- Contact forms or privacy policy text
- Promotional offers or navigation links

Focus ONLY on summarizing the core subject suggested by the H1 title and the main descriptive paragraphs.
Example Output: "Entity-Relationship Models for databases."

Text to Analyze:
${contextText}`;

        summarySession = await self.LanguageModel.create({
          temperature: 0.2,
          topK: 3
        });
        this.activeSessions.set(requestId, summarySession);

        const usage = await summarySession.measureInputUsage({ prompt: summaryPrompt });
        totalTokens = usage.totalTokens;
        mainTopicSummary = await summarySession.prompt(summaryPrompt);
        mainTopicSummary = mainTopicSummary.replace(/^(The main topic is |Main topic: )/i, '').trim();
      }
    } catch (summaryError) {
      console.error("Error generating context summary:", summaryError);
    } finally {
      if (summarySession) {
        await summarySession.destroy();
        this.activeSessions.delete(requestId);
      }
    }
    return [mainTopicSummary, totalTokens];
  }

  /**
   * PASO 2: Ejecuta la limpieza secuencial con clone().
   */
  async _runSequentialCleaning(structuredData, contextSummary, requestId, progressCallback) {
    let templateSession = null;
    let totalTokens = 0;

    // !!! RELLENA TU PROMPT DE SISTEMA AQUÍ !!!
    const cleaningSystemPrompt = `You are a web content filter. Given the main topic, decide if the text fragment is "JUNK" (delete) or "CONTENT" (keep).

### DELETE IF (JUNK): ###
1.  **It's a Title (h2, h3...)** AND CONTAINS keywords: "Advertisement", "Promotion", "Links", "Related Articles", "News", "See also", "Notes", "References", "Bibliography".
2.  **It's a Paragraph (p_h1_...)** AND is NAVIGATION (e.g., "Home", "Blog", "[edit data...]"), METADATA (e.g., "Updated:"), or FILLER (e.g., "filler paragraph").

### KEEP IF (CONTENT): ###
* It does **NOT** meet any DELETE rule.
* It is relevant to the **Main Topic**. This includes titles about the topic (e.g., "## History") and paragraphs with real info.

Respond with "DELETE" or "KEEP".`;

    const jsonSchema = {
      "type": "object",
      "properties": { "decision": { "enum": ["KEEP", "DELETE"] } },
      "required": ["decision"]
    };

    try {
      progressCallback('Creating template session for cleaning...');
      templateSession = await self.LanguageModel.create({
        initialPrompts: [{ role: "system", content: cleaningSystemPrompt }],
        temperature: 0,
        topK: 1
      });
      this.activeSessions.set(requestId, templateSession);

      async function filterSequentially(sections, currentMainTopic) {
        let keptSections = [];
        for (const section of sections) {
          progressCallback(`Processing: ${section.title.substring(0, 20)}...`);

          let decision = "KEEP";
          if (section.level > 1) { // Solo filtra H2 en adelante
            const promptTitle = `Main Topic: "${currentMainTopic}"\nTitle Text: "${section.title}"`;
            let clonedSession = null;
            try {
              clonedSession = await templateSession.clone();
              const usage = await clonedSession.measureInputUsage({ prompt: promptTitle });
              totalTokens += usage.totalTokens;
              const resultStr = await clonedSession.prompt(promptTitle, { responseConstraint: jsonSchema });
              const result = JSON.parse(resultStr);
              decision = result.decision;
            } catch (e) {
              console.error(`Error processing title: ${section.title.substring(0, 50)}...`, e);
              decision = "KEEP";
            } finally {
              if (clonedSession) await clonedSession.destroy();
            }
          }

          if (decision === "KEEP") {
            if (section.level === 1) { // Solo filtra párrafos de H1
              let keptParagraphs = [];
              for (const para of section.paragraphs) {
                progressCallback(`Processing paragraph: ${para.text.substring(0, 20)}...`);
                const promptPara = `Main Topic: "${currentMainTopic}"\nParagraph Text: "${para.text}"`;
                let clonedSession = null;
                let paraDecision = "KEEP";
                try {
                  clonedSession = await templateSession.clone();
                  const usage = await clonedSession.measureInputUsage({ prompt: promptPara });
                  totalTokens += usage.totalTokens;
                  const resultStr = await clonedSession.prompt(promptPara, { responseConstraint: jsonSchema });
                  const result = JSON.parse(resultStr);
                  paraDecision = result.decision;
                } catch (e) {
                  console.error(`Error processing paragraph: ${para.text.substring(0, 50)}...`, e);
                  paraDecision = "KEEP";
                } finally {
                  if (clonedSession) await clonedSession.destroy();
                }

                if (paraDecision === "KEEP") {
                  keptParagraphs.push(para);
                }
              }
              section.paragraphs = keptParagraphs;
            }

            section.subsections = await filterSequentially(section.subsections, currentMainTopic);
            keptSections.push(section);
          }
        }
        return keptSections;
      }

      const dataToFilter = JSON.parse(JSON.stringify(structuredData));
      const finalCleanedStructure = await filterSequentially(dataToFilter, contextSummary);

      return [finalCleanedStructure, totalTokens];

    } catch (e) {
      console.error('Error during AI process:', e);
      throw e;
    } finally {
      if (templateSession) {
        await templateSession.destroy();
        this.activeSessions.delete(requestId);
        console.log('Template cleaning session destroyed.');
      }
    }
  }


  /**
   * Método público para orquestar todo el proceso de limpieza.
   */
  async cleanStructure(structuredData, cleaningRequestId, progressCallback = () => { }) {
    let totalTokens = 0;

    // --- PASO 1: GENERAR CONTEXTO ---
    progressCallback('Generating context summary...');
    const summaryRequestId = `summary-${cleaningRequestId}`;

    const [mainTopicSummary, summaryTokens] = await this._generateContextSummary(
      structuredData,
      summaryRequestId
    );
    totalTokens += summaryTokens;
    progressCallback(`Context: ${mainTopicSummary}. Starting sequential cleaning...`);
    console.log("Generated Context:", mainTopicSummary);

    // --- PASO 2: LIMPIEZA SECUENCIAL ---
    const [finalCleanedStructure, cleaningTokens] = await this._runSequentialCleaning(
      structuredData,
      mainTopicSummary,
      cleaningRequestId,
      progressCallback
    );
    totalTokens += cleaningTokens;

    return [finalCleanedStructure, totalTokens];
  }
}

/*********  INICIO DE CLASE GEMINI CHAT SERVICE  ********/
class GeminiChatService {
  constructor() {
    this.activeSessions = new Map();
    // Esta es la llave MAESTRA que guardará TODOS los chats
    this.STORAGE_KEY = 'geminiAllChatSessions'; 
  }

  // --- NUEVOS MÉTODOS DE AYUDA (ASÍNCRONOS) ---
  
  /** Obtiene el mapa completo de todas las sesiones guardadas */
  async _getAllSessions() {
    try {
      const result = await chrome.storage.local.get(this.STORAGE_KEY);
      return result[this.STORAGE_KEY] || {};
    } catch (e) {
      console.error("Error al leer chrome.storage:", e);
      return {};
    }
  }

  /** Guarda el mapa completo de todas las sesiones */
  async _saveAllSessions(sessionsMap) {
    try {
      await chrome.storage.local.set({ [this.STORAGE_KEY]: sessionsMap });
    } catch (e) {
      console.error("Error al guardar en chrome.storage:", e);
    }
  }

  // --- MÉTODOS PRINCIPALES (MODIFICADOS) ---

  /**
   * Inicializa una sesión de chat.
   * La crea o la restaura desde el almacenamiento global.
   */
  async initializeSession(requestId, misContenidos, callbacks) {
    console.log(`ChatService: Inicializando sesión (ID: ${requestId})`);

    const markdownText = misContenidos.map(doc => {
      return `# ${doc.titulo}\n\n${doc.contenido}`;
    }).join('\n\n---\n\n');
    


    const systemContent = `Eres un asistente experto cuya única función es responder preguntas basadas EXCLUSIVAMENTE en el contenido de los **múltiples temas** proporcionados.
    Se te ha proporcionado un conjunto de temas. Cada tema está claramente separado por '---' y comienza con su propio título (ej: '# Título del Tema').
    **REGLA MÁS IMPORTANTE:** Cuando respondas, DEBES citar de qué tema (usando su título) estás sacando la información. Si una pregunta compara temas, menciona ambos. Si la información está en varios, cítalos todos.
    --- REGLAS DE FORMATO DE RESPUESTA ---
    Tu respuesta DEBE ser en formato Markdown claro.
    **NO USES TÍTULOS NI SUBTÍTULOS** (es decir, no uses '#', '##', '###', etc.) en tus respuestas.
    Tu respuesta DEBE usar solamente los siguientes formatos:
    1.  **Listas:** Usa '*' o '-' para elementos.
    2.  **Negritas:** Usa '**' para resaltar términos clave.
    3.  **Cursiva:** Usa '*' o '_' para enfatizar texto.
    4.  **Párrafos:** Separa los párrafos con una línea en blanco para mayor claridad.
    --- INICIO DE LOS TEMAS ---
    ${markdownText}`;
    
    const sessionsMap = await this._getAllSessions();
    let sessionConfig;
    let sessionRestaurada = false;

    // Intentar restaurar
    if (sessionsMap[requestId]) {
      const savedConfig = sessionsMap[requestId];
      // Comprobar si el contexto es el mismo (si no, forzar nueva sesión)
      if (savedConfig.systemContent === systemContent) {
        sessionConfig = savedConfig;
        sessionRestaurada = true;
        console.log(`ChatService: Sesión ${requestId} restaurada.`);
      }
    }

    // Crear nueva si no se pudo restaurar
    if (!sessionRestaurada) {
      console.log(`ChatService: Creando nueva sesión ${requestId}.`);
      sessionConfig = {
        // Guardamos el systemContent para la comprobación
        systemContent: systemContent, 
        initialPrompts: [{
          role: "system",
          content: systemContent
        }]
      };
    }

    // --- Creación de la sesión ---
    try {
      if (typeof LanguageModel === 'undefined') { /*...*/ }
      const session = await LanguageModel.create(sessionConfig);

      session.onquotaoverflow = () => { /* ... (tu callback) ... */ };

      this.activeSessions.set(requestId, session);
      
      // Guardar el estado actual en el mapa
      sessionsMap[requestId] = sessionConfig;
      await this._saveAllSessions(sessionsMap);

      if (sessionRestaurada && callbacks.onHistoryRestored) {
        const history = sessionConfig.initialPrompts;
        const lastMessage = [...history].reverse().find(m => m.role === 'assistant');
        callbacks.onHistoryRestored(history, lastMessage ? lastMessage.content : '');
      }

      if (callbacks.onSessionReady) {
        callbacks.onSessionReady();
      }
      
    } catch (error) { console.log(`Error al inicializar ${error} `);}
  }

  /**
   * Envía un mensaje y guarda el historial en el mapa global.
   */
  async sendMessage(requestId, userText) {
    const session = this.activeSessions.get(requestId);
    if (!session) { throw new Error("Sesión no inicializada."); }
    
    try {
      const response = await session.prompt(userText);
      
      // Guardar la conversación en el mapa de chrome.storage
      const sessionsMap = await this._getAllSessions();
      if (sessionsMap[requestId]) {
        sessionsMap[requestId].initialPrompts.push({ role: 'user', content: userText });
        sessionsMap[requestId].initialPrompts.push({ role: 'assistant', content: response });
        await this._saveAllSessions(sessionsMap);
      }
      
      return { response };

    } catch (error) { console.log(`Error al enviar mensaje ${error} `);}
  }

  /**
   * Destruye una sesión Y la elimina del mapa global.
   */
  async destroySession(requestId, onComplete) {
    // Destruir la sesión activa
    const session = this.activeSessions.get(requestId);
    if (session && typeof session.destroy === 'function') {
      try {
        await session.destroy();
        this.activeSessions.delete(requestId);
      } catch (e) { console.log(`Error al destruir sesión ${error} `); }
    }
    
    // Eliminar del almacenamiento persistente
    const sessionsMap = await this._getAllSessions();
    if (sessionsMap[requestId]) {
      delete sessionsMap[requestId];
      await this._saveAllSessions(sessionsMap);
      console.log(`ChatService: Sesión ${requestId} destruida y limpiada.`);
    }

    if (onComplete) {
      onComplete();
    }
  }

  /**
   * ¡NUEVO! Obtiene una lista simple de todos los chats guardados.
   */
  async getChatList() {
    const sessionsMap = await this._getAllSessions();
    const chatList = [];
    
    for (const id in sessionsMap) {
      const config = sessionsMap[id];
      // Intenta encontrar el primer mensaje del usuario como título
      const firstUserMessage = config.initialPrompts.find(m => m.role === 'user');
      chatList.push({
        id: id,
        // Título = primer mensaje, o "Nuevo Chat" si está vacío
        title: firstUserMessage ? firstUserMessage.content.substring(0, 40) + '...' : "Chat Nuevo"
      });
    }
    return chatList;
  }


  async updateSystemPrompt(requestId, newContent) {
    console.log(`ChatService: Solicitado actualizar system prompt para ${requestId}`);
    
    // 1. Obtener TODAS las sesiones (el mapa completo)
    const sessionsMap = await this._getAllSessions();
    
    // 2. Encontrar la sesión específica
    const sessionConfig = sessionsMap[requestId];

    if (!sessionConfig) {
      throw new Error(`Sesión ${requestId} no encontrada en storage.`);
    }

    // 3. Encontrar el prompt del sistema
    const systemPrompt = sessionConfig.initialPrompts.find(p => p.role === 'system');

    if (!systemPrompt) {
      throw new Error(`No se encontró 'system prompt' para la sesión ${requestId}.`);
    }
    
    // 4. ¡AÑADIR el nuevo SystemContent con los nuevos Contextos!
    systemPrompt.content = newContent;
    
    // 5. Guardar el mapa COMPLETO (con la sesión modificada)

    await this._saveAllSessions(sessionsMap);
    
    console.log(`ChatService: System prompt for ${requestId} actualizado y guardado.`);
    
    // 6. Devolver éxito
    return { success: true, message: 'Contexto del sistema actualizado.' };
  }
}



window.geminiChatService = new GeminiChatService();
/*********  FIN DE CLASE GEMINI CHAT SERVICE  ********/


// Exportar instancia unica(injectar en window para que sea global)
window.geminiService = new GeminiService();
window.geminiNanoCleaner = new GeminiNanoCleaner();