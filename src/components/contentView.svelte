<script>
  import { marked } from 'marked';
  import { onMount, onDestroy } from 'svelte';
  import {cleanMarkdownByIaStore} from '../stores/contentStore';
  export let content = '';

  let activeTab = 'content';
  let isProcessing = false;
  let aiContent = '';
  let aiRequestId = null;
  //let isCleaning = false;
  
  // Estados para traducción
  let isTranslating = false;
  let translatedContent = '';
  let sourceLanguage = 'es';
  let targetLanguage = 'en';
  let showLanguageSelector = false;
  let supportedLanguages = [];
  let translationError = null;
  let translatorAvailable = false;
  let translationProgress = 0;
  let translationStatus = '';

  let initialJsonOutput = null;
  let finalJsonOutput = null;
  
  let statusInfo = "Listo.";
  let tokenUsage = "Tokens: 0";
  let isCleaning = false;
  let currentCleanId = null;
  let structuredData = null;

  // --- NUEVAS VARIABLES DE ESTADO ---
  let finalMarkdownOutput = ""; // Almacena el markdown limpio (string)
  let renderedHtmlOutput = "...esperando limpieza..."; // Almacena el 
  // Estado para descarga PDF
  let isDownloadingPDF = false;

  class MarkdownSection {
    constructor(title, id, level) {
      this.id = id;
      this.level = level;
      this.title = title.trim();
      this.paragraphs = [];
      this.content = ''; 
      this.subsections = [];
    }
  }

  $: htmlContent = content ? marked.parse(content) : '';
  $: displayContent = translatedContent || aiContent;
  $: displayHtml = displayContent ? marked.parse(displayContent) : '';

  function handleParse() {
    statusInfo = "Estructurando markdown localmente...";
    finalJsonOutput = null;
    finalMarkdownOutput = ""; // Limpiar
    renderedHtmlOutput = "...esperando limpieza..."; // Limpiar
    tokenUsage = "Tokens: 0";
    // <-- CAMBIO: Reseteamos el store por si había un valor anterior
    cleanMarkdownByIaStore.reset();

    const text = content;
    const lines = text.split('\n');
    const root = new MarkdownSection("root", "root", 0);
    const path = [root];
    const counters = {};
    const pCounters = {};
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      const level = trimmedLine.match(/^(#+)\s/)?.[1].length || 0;
      let currentParent = path[path.length - 1];
      
      if (level > 0) {
        counters[level] = (counters[level] || 0);
        const newId = `h${level}_${counters[level]}`;
        const newSection = new MarkdownSection(trimmedLine, newId, level);
        while (currentParent.level >= level) {
          path.pop();
          currentParent = path[path.length - 1];
        }
        currentParent.subsections.push(newSection);
        path.push(newSection);
        counters[level]++;
      } else {
        if (currentParent.level === 1) { 
          pCounters[currentParent.id] = (pCounters[currentParent.id] || 0);
          const pId = `p_${currentParent.id}_${pCounters[currentParent.id]}`;
          currentParent.paragraphs.push({ id: pId, text: trimmedLine });
          pCounters[currentParent.id]++;
        } else { 
          currentParent.content += trimmedLine + '\n'; 
        }
      }
    }
    
    structuredData = root.subsections; 
    structuredData.forEach(s => {
      s.content = s.content.trim();
      s.subsections.forEach(sub => sub.content = sub.content.trim());
    });
    
    statusInfo = "Estructura generada. Listo para limpiar.";
    initialJsonOutput = JSON.stringify(structuredData, null, 2);
  }

  async function startAiClean() {
    if (!structuredData || structuredData.length === 0) {
      alert("Por favor, primero estructura el markdown.");
      return;
    }
    isCleaning = true;
    statusInfo = "Enviando petición de limpieza al content script...";
    tokenUsage = "Tokens: 0";
    finalJsonOutput = null;
    finalMarkdownOutput = "";
    renderedHtmlOutput = "...enviando petición...";
    currentCleanId = `clean_${Date.now()}`;

    // <-- CAMBIO: Actualizamos el estado de carga en el store
    cleanMarkdownByIaStore.setLoading(true);

    try {
      window.parent.postMessage({
        action: 'requestClean',
        structuredData: structuredData, 
        requestId: currentCleanId
      }, '*');
      console.log(`Petición 'requestClean' enviada (ID: ${currentCleanId})`);
    } catch (error) {
      console.error('Error al enviar petición de limpieza:', error);
      statusInfo = `Error: ${error.message}`;
      isCleaning = false;
      // <-- CAMBIO: Informamos al store del error
      cleanMarkdownByIaStore.setError(error.message);
    }
  }

  function jsonToMarkdown(sections) {
    let md = "";
    if (!sections) return md;

    for (const section of sections) {
      // 1. Añadir el título (ya tiene los #)
      md += section.title + "\n\n";

      // 2. Añadir párrafos (solo para H1)
      if (section.paragraphs && section.paragraphs.length > 0) {
        md += section.paragraphs.map(p => p.text).join("\n\n") + "\n\n";
      }

      // 3. Añadir contenido (para H2, H3... sin subsecciones)
      if (section.content) {
        md += section.content + "\n\n";
      }
      
      // 4. Recursión para subsecciones
      if (section.subsections && section.subsections.length > 0) {
        md += jsonToMarkdown(section.subsections);
      }
    }
    return md;
  }

  function handleWindowMessage(event) {
    const { action, requestId } = event.data;
    if (requestId !== currentCleanId) {
      return;
    }

    switch (action) {
      case 'cleanProgress':
        statusInfo = event.data.message;
        break;

      case 'cleanComplete':
        statusInfo = "¡Limpieza completada!";
        tokenUsage = `Total Tokens (Summed): ${event.data.totalTokens}`;
        isCleaning = false;
        currentCleanId = null;
        
        // --- MODIFICADO: Generar y renderizar el markdown ---
        const finalStructure = event.data.finalCleanedStructure;
        finalJsonOutput = JSON.stringify(finalStructure, null, 2);
        
        // 1. Convertir JSON a string Markdown
        finalMarkdownOutput = jsonToMarkdown(finalStructure);
        
        // 2. Renderizar Markdown a HTML
        renderedHtmlOutput = marked(finalMarkdownOutput);
        
        // <-- CAMBIO: ¡Aquí guardamos el contenido final en el store!
        cleanMarkdownByIaStore.setLoading(false);
        cleanMarkdownByIaStore.setContent(finalMarkdownOutput);

        break;

      case 'cleanError':
        statusInfo = `Error: ${event.data.error}`;
        renderedHtmlOutput = `Error al procesar: ${event.data.error}`;
        isCleaning = false;
        currentCleanId = null;

        // <-- CAMBIO: Informamos al store del error
        cleanMarkdownByIaStore.setError(event.data.error);
        break;
    }
  }

  // Handler para mensajes del content script
  function handleMessage(event) {
    const { action, requestId } = event.data;

    if (action === 'aiAnalysisComplete' && requestId === aiRequestId) {
      console.log("Markdown View: Análisis de IA completado");
      aiContent = event.data.aiContent;
      isProcessing = false;
    }

    if (action === 'translationProgress') {
      translationProgress = event.data.progress;
      translationStatus = event.data.status;
      console.log(`Progreso: ${event.data.status} - ${event.data.progress}%`);
    }

    if (action === 'translationComplete') {
      console.log("ContentView: Traducción completada");
      translatedContent = event.data.translation;
      isTranslating = false;
      translationError = null;
      translationProgress = 0;
      translationStatus = '';
    }

    if (action === 'translationError') {
      console.error("ContentView: Error en traducción:", event.data.error);
      translationError = event.data.error;
      isTranslating = false;
      translationProgress = 0;
      translationStatus = '';
    }

    if (action === 'translatorAvailabilityResult') {
      translatorAvailable = event.data.availability === 'readily' || event.data.availability === 'after-download';
      if (!translatorAvailable) {
        console.warn('Translator no está disponible:', event.data.availability);
      }
    }

    if (action === 'supportedLanguagesResult') {
      supportedLanguages = event.data.languages;
      console.log('Idiomas soportados recibidos:', supportedLanguages.length);
    }
  }

   onMount(() => {
    window.addEventListener('message', handleWindowMessage);
  });

  onDestroy(() => {
    window.removeEventListener('message', handleWindowMessage);
  });

  onMount(async () => {
    window.addEventListener('message', handleMessage);

    window.parent.postMessage({
      action: 'getSupportedLanguages'
    }, '*');

    chrome.runtime.onMessage.addListener((message) => {
      if (message.command === 'aiAnalysisComplete' && message.requestId === aiRequestId) {
        console.log("Markdown View: Análisis de IA completado");
        aiContent = message.aiContent;
        isProcessing = false;
      }
    });

    const data = await chrome.storage.local.get('aiAnalysisCache');
    if (data.aiAnalysisCache) {
      aiContent = data.aiAnalysisCache;
    }
  });

  onDestroy(() => {
    window.removeEventListener('message', handleMessage);
  });

  async function handleAiTab() {
    if (activeTab !== 'ai') {
      activeTab = 'ai';
      
      if (!aiContent) {
        isProcessing = true;
        //////////
        handleParse();
        startAiClean();
        // aiRequestId = Date.now();

        // chrome.runtime.sendMessage({
        //   command: 'startAiAnalysis',
        //   content: content,
        //   requestId: aiRequestId
        // });
      }
    }
  }

  async function handleTranslate() {
    if (sourceLanguage === targetLanguage) {
      translationError = 'Selecciona idiomas diferentes';
      return;
    }

    if (!aiContent) {
      translationError = 'No hay contenido para traducir';
      return;
    }

    isTranslating = true;
    translationError = null;
    translationProgress = 0;
    translationStatus = 'preparing';
    const requestId = `translate_${Date.now()}`;

    showLanguageSelector = false;

    window.parent.postMessage({
      action: 'requestTranslation',
      content: aiContent,
      sourceLanguage: sourceLanguage,
      targetLanguage: targetLanguage,
      requestId: requestId,
      streaming: false
    }, '*');
  }

  function resetTranslation() {
    translatedContent = '';
    translationError = null;
  }

  function toggleLanguageSelector() {
    showLanguageSelector = !showLanguageSelector;
  }

  async function checkTranslatorAvailability() {
    if (!sourceLanguage || !targetLanguage) return;

    const requestId = `check_${Date.now()}`;
    window.parent.postMessage({
      action: 'checkTranslatorAvailability',
      sourceLanguage,
      targetLanguage,
      requestId
    }, '*');
  }

  async function downloadAsPDF() {
    if (!displayContent) return;

    isDownloadingPDF = true;

    try {
      // Crear un nuevo documento HTML para el PDF
      const htmlDoc = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #374151;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #111827;
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.25em; }
            p { margin-bottom: 1em; }
            ul, ol { margin-bottom: 1em; padding-left: 2em; }
            li { margin-bottom: 0.5em; }
            code {
              background-color: #f3f4f6;
              padding: 2px 6px;
              border-radius: 4px;
              font-family: 'Courier New', monospace;
              font-size: 0.9em;
            }
            pre {
              background-color: #f3f4f6;
              padding: 1em;
              border-radius: 8px;
              overflow-x: auto;
            }
            pre code {
              background-color: transparent;
              padding: 0;
            }
            blockquote {
              border-left: 4px solid #e5e7eb;
              padding-left: 1em;
              margin-left: 0;
              color: #6b7280;
            }
            a {
              color: #ec4899;
              text-decoration: none;
            }
            a:hover {
              text-decoration: underline;
            }
            table {
              border-collapse: collapse;
              width: 100%;
              margin-bottom: 1em;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 8px 12px;
              text-align: left;
            }
            th {
              background-color: #f9fafb;
              font-weight: 600;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          ${marked.parse(displayContent)}
        </body>
        </html>
      `;

      // Crear un Blob con el HTML
      const blob = new Blob([htmlDoc], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Crear un iframe oculto para imprimir
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);

      printFrame.onload = function() {
        try {
          printFrame.contentWindow.print();
          
          // Limpiar después de un delay
          setTimeout(() => {
            document.body.removeChild(printFrame);
            URL.revokeObjectURL(url);
            isDownloadingPDF = false;
          }, 100);
        } catch (error) {
          console.error('Error al imprimir:', error);
          document.body.removeChild(printFrame);
          URL.revokeObjectURL(url);
          isDownloadingPDF = false;
        }
      };

      printFrame.src = url;

    } catch (error) {
      console.error('Error generando PDF:', error);
      isDownloadingPDF = false;
    }
  }

  $: if (sourceLanguage && targetLanguage && showLanguageSelector) {
    checkTranslatorAvailability();
  }
</script>

<div class="content-container">
  <div class="border-b border-gray-200 mb-4">
    <div class="flex gap-2">
      <button
        class="px-4 py-2 font-medium transition-colors {activeTab === 'content' ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-gray-700'}"
        on:click={() => activeTab = 'content'}
      >
        Contenido
      </button>
      <button
        class="px-4 py-2 font-medium transition-colors {activeTab === 'ai' ? 'text-black border-b-2 border-black' : 'text-gray-500 hover:text-gray-700'}"
        on:click={handleAiTab}
      >
        Análisis IA
      </button>
    </div>
  </div>

  {#if activeTab === 'content'}
    {#if !htmlContent}
      <div class="text-center py-20">
        <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
          <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <p class="text-gray-400 text-lg">No se encontró contenido relevante en la página.</p>
      </div>
    {:else}
      <div class="prose max-w-none text-gray-700 p-4">
        {@html htmlContent}
      </div>
    {/if}
  {:else}
    <!-- Tab de IA con traducción -->
    {#if isCleaning}
      <div class="flex flex-col items-center justify-center py-20 px-4">
        <div class="relative mb-8">
          <div class="flex gap-2">
            <div class="w-3 h-3 bg-black rounded-full animate-bounce" style="animation-delay: 0ms;"></div>
            <div class="w-3 h-3 bg-black rounded-full animate-bounce" style="animation-delay: 150ms;"></div>
            <div class="w-3 h-3 bg-black rounded-full animate-bounce" style="animation-delay: 300ms;"></div>
          </div>
        </div>
        <div class="w-full max-w-xs bg-gray-100 rounded-full h-1 overflow-hidden mb-4">
          <div class="h-full bg-gradient-to-r from-black to-black animate-pulse"></div>
        </div>
        <p class="text-gray-700 font-medium text-lg mb-1">Analizando contenido con IA</p>
        <p class="text-gray-500 text-sm">Esto puede tomar unos segundos...</p>
      </div>
    {:else}
      <div class="sticky top-0 bg-white border-b border-gray-200 p-3 z-10">
        <!-- <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 flex-1">
            {#if translatedContent}
              <div class="flex items-center gap-2 text-sm text-gray-600">
                <span class="inline-flex items-center gap-1">
                  <span>{supportedLanguages.find(l => l.code === targetLanguage)?.flag || '🌐'}</span>
                  <span class="font-medium">{supportedLanguages.find(l => l.code === targetLanguage)?.name || targetLanguage}</span>
                </span>
              </div>
              <button
                on:click={resetTranslation}
                class="text-sm text-black hover:text-black font-medium flex items-center gap-1"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Ver original
              </button>
            {:else}
              <button
                on:click={toggleLanguageSelector}
                disabled={isTranslating || !aiContent}
                class="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-black to-black text-white rounded-lg hover:from-black hover:to-black transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path>
                </svg>
                Traducir
              </button>
            {/if}          
            <button
              on:click={downloadAsPDF}
              disabled={isDownloadingPDF || !displayContent}
              class="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              title="Descargar como PDF"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              {#if isDownloadingPDF}
                Preparando...
              {:else}
                PDF
              {/if}
            </button>
          </div>

          {#if translationError}
            <div class="text-sm text-red-600 flex items-center gap-1">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path>
              </svg>
              {translationError}
            </div>
          {/if}
        </div>

       
        {#if showLanguageSelector}
          <div class="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fadeIn">
            <div class="grid grid-cols-2 gap-4 mb-4">
             
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-2">Desde</label>
                <select
                  bind:value={sourceLanguage}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                >
                  {#each supportedLanguages as lang}
                    <option value={lang.code}>{lang.flag} {lang.name}</option>
                  {/each}
                </select>
              </div>             
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-2">Hacia</label>
                <select
                  bind:value={targetLanguage}
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                >
                  {#each supportedLanguages as lang}
                    <option value={lang.code}>{lang.flag} {lang.name}</option>
                  {/each}
                </select>
              </div>
            </div>

            {#if !translatorAvailable && sourceLanguage && targetLanguage}
              <div class="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                ℹ️ El modelo puede necesitar descargarse la primera vez (esto puede tardar unos minutos).
              </div>
            {/if}

            <div class="flex gap-2">
              <button
                on:click={handleTranslate}
                disabled={isTranslating}
                class="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                {#if isTranslating}
                  <span class="flex items-center justify-center gap-2">
                    <svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Traduciendo...
                  </span>
                {:else}
                  Traducir ahora
                {/if}
              </button>
              <button
                on:click={toggleLanguageSelector}
                class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        {/if} -->
      </div>

      <!-- Contenido traducido o IA -->
      {#if isTranslating}
        <div class="flex flex-col items-center justify-center py-20 px-4">
          <div class="relative mb-8">
            <div class="w-16 h-16 border-4 border-black border-t-black rounded-full animate-spin"></div>
          </div>
          
          {#if translationStatus === 'downloading'}
            <p class="text-gray-700 font-medium text-lg mb-1">Descargando modelo de traducción</p>
            <p class="text-gray-500 text-sm mb-4">Esto solo ocurre la primera vez...</p>
          {:else if translationStatus === 'translating' || translationStatus === 'streaming'}
            <p class="text-gray-700 font-medium text-lg mb-1">Traduciendo contenido</p>
            <p class="text-gray-500 text-sm mb-4">Gemini Nano está trabajando en ello...</p>
          {:else}
            <p class="text-gray-700 font-medium text-lg mb-1">Preparando traducción</p>
            <p class="text-gray-500 text-sm mb-4">Iniciando proceso...</p>
          {/if}

          {#if translationProgress > 0}
            <div class="w-full max-w-xs">
              <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-black to-black transition-all duration-300"
                  style="width: {translationProgress}%"
                ></div>
              </div>
              <p class="text-xs text-gray-500 text-center mt-2">{translationProgress}%</p>
            </div>
          {/if}
        </div>
      {:else}
        <div class="prose max-w-none text-gray-700 p-4">
          <!-- {@html displayHtml} -->
          {@html renderedHtmlOutput}
        </div>
      {/if}
    {/if}
  {/if}
</div>

<style>
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fadeIn {
    animation: fadeIn 0.2s ease-out;
  }

  .prose :global(h1) {
    font-size: 1.875rem;
    font-weight: bold;
    margin-top: 1.5rem;
    margin-bottom: 1rem;
  }

  .prose :global(h2) {
    font-size: 1.5rem;
    font-weight: bold;
    margin-top: 1.25rem;
    margin-bottom: 0.75rem;
  }

  .prose :global(h3) {
    font-size: 1.25rem;
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  .prose :global(p) {
    margin-bottom: 1rem;
    line-height: 1.625;
  }

  .prose :global(ul),
  .prose :global(ol) {
    margin-left: 1.5rem;
    margin-bottom: 1rem;
  }

  .prose :global(li) {
    margin-bottom: 0.5rem;
  }

  .prose :global(code) {
    background: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }

  .prose :global(pre) {
    background: #1f2937;
    color: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin-bottom: 1rem;
  }

  .prose :global(a) {
    color: #3b82f6;
    text-decoration: underline;
  }
</style>