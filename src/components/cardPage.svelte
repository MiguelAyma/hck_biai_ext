<script>
  import EyeIcon from '../icons/eyeIcon.svelte';
  import PhotoIcon from '../icons/photoIcon.svelte';
  import SparklesIcon from '../icons/sparklesIcon.svelte';
  import TrashIcon from '../icons/trashIcon.svelte';
  import EllipsisVerticalIcon from '../icons/ellipsisVerticaIcon.svelte';
  import { createEventDispatcher, onDestroy, onMount } from 'svelte';
  import { cleanMarkdownByIaStore, plainTextMarkdownStore } from '../stores/contentStore';
  import { extractPlainTextMarkdown } from '../services/contentExtrator.service';
  import { marked } from 'marked';
  import { activeProject, projectsStore } from '../stores/projectsStore';
  import CircleCheckIcon from '../icons/circleCheckIcon.svelte';


  export let webpage = {};
  export let isMenuOpen = false;
  export let ondelete = () => {};
  export let onviewContent = () => {};
  export let ongenerateAI = () => {};
  export let projectId = null;


  ////////////////////
  let initialJsonOutput = null;
  let finalJsonOutput = null; 
  let statusInfo = "Listo.";
  let tokenUsage = "Tokens: 0";
  let isCleaning = false;
  let isSummarise = false;
  let currentCleanId = null;
  let structuredData = null;

  // --- NUEVAS VARIABLES DE ESTADO ---
  let finalMarkdownOutput = ""; // Almacena el markdown limpio (string)
  let renderedHtmlOutput = "...esperando limpieza..."; // Almacena el HTML renderizado
  // --- Clase Markdown (Lógica Local) ---
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

  // --- BOTÓN 1: ESTRUCTURAR (Lógica Local) ---
  function handleParse() {
    statusInfo = "Estructurando markdown localmente...";
    finalJsonOutput = null;
    finalMarkdownOutput = ""; // Limpiar
    renderedHtmlOutput = "...esperando limpieza..."; // Limpiar
    tokenUsage = "Tokens: 0";
    // <-- CAMBIO: Reseteamos el store por si había un valor anterior
    cleanMarkdownByIaStore.reset();
   // console.log("webpage.strippedMarkdown", webpage.strippedMarkdown);
    const text = webpage.strippedMarkdown;
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
          // --- MODIFICACIÓN IMPORTANTE ---
          // Cambiamos ' ' por '\n' para preservar saltos de línea (ej. en listas)
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

  // --- BOTÓN 2: LIMPIAR (Lógica postMessage) ---
  // (Sin cambios aquí)
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

      // window.parent.postMessage({
      //   action: 'requestSummary', //requestSummary nombre del evento a ejecutar en contentScript.js
      //   content,
      //   length,
      //   requestId
      // }, '*');
    } catch (error) {
      console.error('Error al enviar petición de limpieza:', error);
      statusInfo = `Error: ${error.message}`;
      isCleaning = false;
      // <-- CAMBIO: Informamos al store del error
      cleanMarkdownByIaStore.setError(error.message);
    }
  }

  // --- NUEVA FUNCIÓN: Convertir JSON de vuelta a Markdown ---
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

  // --- OYENTE DE RESPUESTAS (Desde contentScript) ---
  async function handleWindowMessage(event) {
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
        //const summaryLong = event.data.summaryLong;
        finalJsonOutput = JSON.stringify(finalStructure, null, 2);
        
        // 1. Convertir JSON a string Markdown
        finalMarkdownOutput = jsonToMarkdown(finalStructure);
        console.log("finalMarkdownOutput", finalMarkdownOutput);

        //el contenido limpio por AI agregarlo al proyecto actual a la page
        projectsStore.setRefinedMarkdown(projectId, webpage.id, finalMarkdownOutput);

        await generateSummary(finalMarkdownOutput); 
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

  /////////////////////////
  //summary

  function handleMessage(event) {
    const { action, requestId, summary, length, error } = event.data;

    if (action === 'summaryComplete') {
      isSummarise = false;
      projectsStore.setMarkdownSummaryLong(projectId, webpage.id, summary);
      projectsStore.appendToProjectContent(projectId, webpage.title, summary);

       console.log("proyect current", $activeProject);

      console.log(`Resumen ${length} recibido:`, summary);
    } else if (action === 'summaryError') {
      handleSummaryError(length, error);
    }
  }

  async function generateSummary(content) { 
    console.log("content", content);
    try {
      isSummarise = true;
      if (!content || content.trim().length < 150) {
        throw new Error("El contenido de la página es demasiado corto para generar un resumen.");
      }
      const requestId = `summary_${length}_${Date.now()}`;

      // Enviar petición al content script via postMessage
      window.parent.postMessage({
        action: 'requestSummary', //requestSummary nombre del evento a ejecutar en contentScript.js
        content,
        length: 'long',
        requestId
      }, '*');

      console.log(`Petición de resumen long enviada (ID: ${requestId})`);

    } catch (error) {
      isSummarise = false;
      console.error(`Error al solicitar resumen long:`, error);
      errorMessage = error.message;
    } 
  }

  // onMount(() => {
  //   window.addEventListener('message', handleWindowMessage);
  // });

  // onDestroy(() => {
  //   window.removeEventListener('message', handleWindowMessage);
  // });
  // onMount(() => {
  //   window.addEventListener('message', handleMessage);
  // });

  // onDestroy(() => {
  //   window.removeEventListener('message', handleMessage);
  // });
onMount(() => {
  window.addEventListener('message', handleWindowMessage);
  window.addEventListener('message', handleMessage);

  return () => {
    window.removeEventListener('message', handleWindowMessage);
    window.removeEventListener('message', handleMessage);
  };
});
  ////////////FIN CLEAN CONTENT AI
  const dispatch = createEventDispatcher();

  function toggleMenu() {
    dispatch('toggleMenu', { id: webpage.id });
  }

  function handleDelete() {
    ondelete(webpage.id);
  }

  function handleViewContent() {
    onviewContent(webpage);
  }

  async function handleGenerateAI() {
    await handleParse();
    await startAiClean();

   // ongenerateAI(webpage.url);
  }

  // async function handleExtractContentPlainText() {
  //   await extractPlainTextMarkdown(urlPage, projectId)
  // }

  function handleClickOutside(event) {
    if (isMenuOpen && !event.target.closest('.dropdown-container')) {
      dispatch('closeMenu');
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div
  class="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all duration-200 relative"
>
  <div class="flex gap-3">
    <!-- Imagen/Favicon -->
    <div class="flex-shrink-0">
      {#if webpage.faviconUrl}
        <img
          src={webpage.faviconUrl}
          alt={webpage.title}
          class="w-20 h-20 object-cover rounded-lg"
          on:error={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      {:else}
        <div
          class="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center"
        >
          <PhotoIcon class="w-10 h-10 text-gray-400" />
        </div>
      {/if}
    </div>

    <!-- Contenido -->
    <div class="flex-1 min-w-0">
      <div class="flex items-start justify-between gap-2 mb-1">
        <h3 class="font-semibold text-gray-900 text-sm leading-snug line-clamp-2">
          {webpage.title || "Sin título"}
        </h3>
        
        <!-- Botón de menú (3 puntos) -->
        <div class="dropdown-container relative">
          
          <button
            on:click|stopPropagation={toggleMenu}
            class="flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Más opciones"
          >
            <EllipsisVerticalIcon class="w-5 h-5" />
          </button>

          <!-- Dropdown Menu -->
          {#if isMenuOpen}
            <div
              class="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-fade-in"
              on:click|stopPropagation
            >
              <button
                on:click={handleViewContent}
                class="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <EyeIcon class="w-4 h-4" />
                <span>Ver contenido</span>
              </button>
              <button
                on:click={handleDelete}
                class="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <TrashIcon class="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            </div>
          {/if}
        </div>
      </div>

      <!-- URL y Favicon -->
      <div class="flex items-center gap-2 flex-wrap mb-3">
        {#if webpage.faviconUrl}
          <img
            src={webpage.faviconUrl}
            alt=""
            class="w-4 h-4 rounded"
            on:error={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        {/if}
        {#if webpage.url}
          <a
            href={webpage.url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-blue-600 hover:underline truncate max-w-[200px]"
          >
            {(() => {
              try {
                return new URL(webpage.url).hostname;
              } catch {
                return webpage.url;
              }
            })()}
          </a>
        {:else}
          <span class="text-xs text-gray-400">Sin URL</span>
        {/if}
      </div>

      <!-- Botón Generar AI (abajo a la derecha) -->
      <div class="flex justify-end">
        <div class="flex justify-end">
        <button
          on:click={handleGenerateAI}
          disabled={isCleaning || isSummarise || webpage.markdownSummaryLong !==""}
          class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-900 hover:text-white border border-gray-200 hover:border-gray-900 rounded-lg transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-gray-50 disabled:hover:text-gray-700 disabled:hover:border-gray-200 min-w-[120px]"
        >
          {#if webpage.markdownSummaryLong !==""}
            <CircleCheckIcon class="w-4 h-4 text-light-green-500" />
            <span>content generated</span>
          {:else}
            {#if isCleaning || isSummarise}
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
               <span class="invisible">Generate AI</span>
              <span>Generating...</span>
              {:else}
                <SparklesIcon class="w-4 h-4" />
                <span>Generate AI</span>
            {/if}
          {/if}
        </button>
      </div>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.15s ease-out;
  }
</style>