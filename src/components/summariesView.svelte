<script lang="ts">
  import { marked } from 'marked';
  import { onMount, onDestroy } from 'svelte';
  import SummaryCard from './summaryCard.svelte';
  import SkeletonCard from './skeletonCard.svelte';
  import { notificationStore } from '../stores/notificationStore';

  export let content: string = '';

  type SummaryLength = 'short' | 'medium' | 'long';
  const lengths: SummaryLength[] = ['short', 'medium', 'long'];

  interface Summary {
    title: string;
    content: string;
    htmlContent: string;
    icon: string;
    length: SummaryLength;
  }

  let generatingStates: Record<SummaryLength, boolean> = {
    short: false,
    medium: false,
    long: false
  };

  let summaries: Summary[] = [];
  let errorMessage: string = '';
  //let geminiAvailable: boolean = false;

  const summaryConfig = {
    short: { title: 'Resumen Corto', icon: '📄' },
    medium: { title: 'Resumen Medio', icon: '📋' },
    long: { title: 'Resumen Extenso', icon: '📚' }
  };

  // Listener para mensajes del content script
  function handleMessage(event: MessageEvent) {
    const { action, requestId, summary, length, error } = event.data;

    if (action === 'summaryComplete') {
      handleSummaryComplete(length, summary);
    } else if (action === 'summaryError') {
      handleSummaryError(length, error);
    }
  }

  async function handleSummaryComplete(length: SummaryLength, result: string) {
    try {
      const html = await marked.parse(result);

      const newSummary: Summary = {
        title: summaryConfig[length].title,
        content: result,
        htmlContent: html,
        icon: summaryConfig[length].icon,
        length,
      };

      const existingIndex = summaries.findIndex(s => s.length === length);
      
      if (existingIndex !== -1) {
        summaries[existingIndex] = newSummary;
      } else {
        summaries = [...summaries, newSummary];
      }

      // Guardar en storage para persistencia
      await chrome.storage.local.set({ 
        [`summary_${length}`]: newSummary 
      });

    } catch (error) {
      console.error('Error procesando resumen:', error);
      errorMessage = `Error al procesar resumen ${length}`;
    } finally {
      generatingStates[length] = false;
    }
  }

  function handleSummaryError(length: SummaryLength, error: string) {
    console.error(`Error en resumen ${length}:`, error);
    errorMessage = error || `Error al generar resumen ${length}`;
    generatingStates[length] = false;
  }

  async function generateSummary(length: SummaryLength) {
    // if (!geminiAvailable) {
    //   errorMessage = "Gemini Nano no está disponible en este navegador. Asegúrate de usar Chrome Canary o Dev con las flags habilitadas.";
    //   return;
    // }

    generatingStates[length] = true;
    errorMessage = '';

    try {
      if (!content || content.trim().length < 150) {
        throw new Error("El contenido de la página es demasiado corto para generar un resumen.");
      }

      const requestId = `summary_${length}_${Date.now()}`;

      // Enviar petición al content script via postMessage
      window.parent.postMessage({
        action: 'requestSummary', //requestSummary nombre del evento a ejecutar en contentScript.js
        content,
        length,
        requestId
      }, '*');

      console.log(`Petición de resumen ${length} enviada (ID: ${requestId})`);

    } catch (error) {
      console.error(`Error al solicitar resumen ${length}:`, error);
      errorMessage = error.message;
      generatingStates[length] = false;
    }
  }

  async function loadCachedSummaries() {
    try {
      const keys = lengths.map(l => `summary_${l}`);
      const data = await chrome.storage.local.get(keys);
      
      const cached: Summary[] = [];
      lengths.forEach(length => {
        const key = `summary_${length}`;
        if (data[key]) {
          cached.push(data[key]);
        }
      });
      
      if (cached.length > 0) {
        summaries = cached;
        console.log(`${cached.length} resúmenes cargados desde caché`);
      }
    } catch (error) {
      console.error('Error cargando resúmenes desde caché:', error);
    }
  }

  onMount(async () => {
    // Escuchar mensajes del content script
    window.addEventListener('message', handleMessage);
    
    // Verificar disponibilidad de Gemini
   // await checkGeminiAvailability();
    
    // Cargar resúmenes guardados
    await loadCachedSummaries();
    
    // Limpiar notificaciones de summaries
    await notificationStore.clear('summaries');
  });

  onDestroy(() => {
    window.removeEventListener('message', handleMessage);
  });
  
</script>

<div class="content-container p-4">
   <div class="grid grid-cols-3 gap-3">
    <button
      on:click={() => generateSummary('short')}
      disabled={generatingStates.short || !content}
      class="px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if generatingStates.short}
        <div class="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
      {:else}
        <span class="text-2xl">📄</span>
      {/if}
      <span class="text-sm">Corto</span>
    </button>

    <button
      on:click={() => generateSummary('medium')}
      disabled={generatingStates.medium || !content}
      class="px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if generatingStates.medium}
        <div class="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
      {:else}
        <span class="text-2xl">📋</span>
      {/if}
      <span class="text-sm">Medio</span>
    </button>

    <button
      on:click={() => generateSummary('long')}
      disabled={generatingStates.long || !content}
      class="px-4 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {#if generatingStates.long}
        <div class="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
      {:else}
        <span class="text-2xl">📚</span>
      {/if}
      <span class="text-sm">Extenso</span>
    </button>
  </div>

  {#if errorMessage}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl" role="alert">
      <strong class="font-bold">¡Error!</strong>
      <span class="block sm:inline mt-1">{errorMessage}</span>
    </div>
  {/if}
  <div>
  {#if summaries.length === 0 && !Object.values(generatingStates).some(state => state)}
    <div class="text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
        <svg class="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </div>
      <p class="text-slate-600 text-base">
        Selecciona un tipo de resumen para comenzar
      </p>
    </div>
  {:else}
    {#each lengths as length}
      {#if generatingStates[length]}
        <SkeletonCard />
      {:else}
        {#if summaries.find(s => s.length === length)}
          <SummaryCard 
            title={summaries.find(s => s.length === length)?.title}
            content={summaries.find(s => s.length === length)?.content}
            htmlContent={summaries.find(s => s.length === length)?.htmlContent}
            icon={summaries.find(s => s.length === length)?.icon}
          />
        {/if}
      {/if}
    {/each}
  {/if}
   </div>
</div>