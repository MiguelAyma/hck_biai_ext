<script lang="ts">
  import { marked } from 'marked';
  import { onMount, onDestroy } from 'svelte';
  import SummaryCard from './summaryCard.svelte';
  import SkeletonCard from './skeletonCard.svelte';
  import { notificationStore } from '../stores/notificationStore';
  import { projectsStore } from '../stores/projectsStore';
  import type { Project, Webpage } from '../stores/projectsStore';
  import { localActiveProjectSummarie } from '../stores/activeProjectSummarieStore';
  import ProjectPageSelector from './projectPageSelector.svelte';

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

  let generatingProjectSummary: boolean = false;
  let summaries: Summary[] = [];
  let projectSummary: Summary | null = null;
  let errorMessage: string = '';
  
  // Estados de selección
  let selectedProjectId: string | null = null;
  let selectedWebpageId: string | null = null;
  let selectedProject: Project | null = null;
  let selectedWebpage: Webpage | null = null;
  let allProjects: Project[] = [];

  const summaryConfig = {
    short: { title: 'Resumen Corto', icon: '📄' },
    medium: { title: 'Resumen Medio', icon: '📋' },
    long: { title: 'Resumen Extenso', icon: '📚' }
  };

  // Suscripciones
  const unsubscribeProjects = projectsStore.subscribe(state => {
    allProjects = state.projects;
    
    if (selectedProjectId) {
      selectedProject = allProjects.find(p => p.id === selectedProjectId) || null;
      
      if (selectedProject && selectedWebpageId) {
        selectedWebpage = selectedProject.webpages.find(w => w.id === selectedWebpageId) || null;
      }
    }
  });

  const unsubscribeActiveProject = localActiveProjectSummarie.subscribe(project => {
    if (project && !selectedProjectId) {
      selectedProjectId = project.id;
      selectedProject = project;
    }
  });

  onDestroy(() => {
    unsubscribeProjects();
    unsubscribeActiveProject();
  });

  // Verificar si un resumen específico ya existe
  function isSummaryGenerated(length: SummaryLength): boolean {
    if (!selectedWebpage) return false;
    
    switch (length) {
      case 'short':
        return !!selectedWebpage.markdownSummaryShort;
      case 'medium':
        return !!selectedWebpage.markdownSummaryMedium;
      case 'long':
        return !!selectedWebpage.markdownSummaryLong;
      default:
        return false;
    }
  }

  // Verificar si el resumen del proyecto ya existe
  function isProjectSummaryGenerated(): boolean {
    return !!selectedProject?.summaryProject;
  }

  // Cargar resúmenes existentes cuando se selecciona una página
  function loadExistingSummaries() {
    if (!selectedWebpage) {
      summaries = [];
      return;
    }

    const newSummaries: Summary[] = [];

    if (selectedWebpage.markdownSummaryShort) {
      newSummaries.push({
        title: summaryConfig.short.title,
        content: selectedWebpage.markdownSummaryShort,
        htmlContent: marked.parse(selectedWebpage.markdownSummaryShort) as string,
        icon: summaryConfig.short.icon,
        length: 'short',
      });
    }

    if (selectedWebpage.markdownSummaryMedium) {
      newSummaries.push({
        title: summaryConfig.medium.title,
        content: selectedWebpage.markdownSummaryMedium,
        htmlContent: marked.parse(selectedWebpage.markdownSummaryMedium) as string,
        icon: summaryConfig.medium.icon,
        length: 'medium',
      });
    }

    if (selectedWebpage.markdownSummaryLong) {
      newSummaries.push({
        title: summaryConfig.long.title,
        content: selectedWebpage.markdownSummaryLong,
        htmlContent: marked.parse(selectedWebpage.markdownSummaryLong) as string,
        icon: summaryConfig.long.icon,
        length: 'long',
      });
    }

    summaries = newSummaries;
  }

  // Cargar resumen del proyecto existente
  function loadProjectSummary() {
    if (!selectedProject || !selectedProject.summaryProject) {
      projectSummary = null;
      return;
    }

    projectSummary = {
      title: 'Resumen del Proyecto',
      content: selectedProject.summaryProject,
      htmlContent: marked.parse(selectedProject.summaryProject) as string,
      icon: '📊',
      length: 'short',
    };
  }

  // Manejar cambio de proyecto
  function handleProjectChanged(event: CustomEvent<{ projectId: string }>) {
    selectedProjectId = event.detail.projectId;
    selectedProject = allProjects.find(p => p.id === selectedProjectId) || null;
    selectedWebpageId = null;
    selectedWebpage = null;
    summaries = [];
    errorMessage = '';
    
    loadProjectSummary();
  }

  // Manejar cambio de página
  function handleWebpageChanged(event: CustomEvent<{ webpageId: string }>) {
    selectedWebpageId = event.detail.webpageId;
    selectedWebpage = selectedProject?.webpages.find(w => w.id === selectedWebpageId) || null;
    errorMessage = '';
    
    loadExistingSummaries();
  }

  // Listener para mensajes del content script
  function handleMessage(event: MessageEvent) {
    const { action, requestId, summary, length, error, isProjectSummary } = event.data;

    if (action === 'summaryComplete') {
      if (isProjectSummary) {
        handleProjectSummaryComplete(summary);
      } else {
        handleSummaryComplete(length, summary);
      }
      console.log(`Resumen ${isProjectSummary ? 'del proyecto' : length} recibido:`, summary);
    } else if (action === 'summaryError') {
      if (isProjectSummary) {
        handleProjectSummaryError(error);
      } else {
        handleSummaryError(length, error);
      }
    }
  }

  async function handleSummaryComplete(length: SummaryLength, result: string) {
    try {
      const html = await marked.parse(result);

      const newSummary: Summary = {
        title: summaryConfig[length].title,
        content: result,
        htmlContent: html as string,
        icon: summaryConfig[length].icon,
        length,
      };

      const existingIndex = summaries.findIndex(s => s.length === length);
      
      if (existingIndex !== -1) {
        summaries[existingIndex] = newSummary;
      } else {
        summaries = [...summaries, newSummary];
      }

      // Guardar en el projectsStore
      if (selectedProjectId && selectedWebpageId) {
        switch (length) {
          case 'short':
            await projectsStore.setMarkdownSummaryShort(selectedProjectId, selectedWebpageId, result);
            break;
          case 'medium':
            await projectsStore.setMarkdownSummaryMedium(selectedProjectId, selectedWebpageId, result);
            break;
          case 'long':
            await projectsStore.setMarkdownSummaryLong(selectedProjectId, selectedWebpageId, result);
            break;
        }
      }

    } catch (error) {
      console.error('Error procesando resumen:', error);
      errorMessage = `Error al procesar resumen ${length}`;
    } finally {
      generatingStates[length] = false;
    }
  }

  async function handleProjectSummaryComplete(result: string) {
    try {
      const html = await marked.parse(result);

      projectSummary = {
        title: 'Resumen del Proyecto',
        content: result,
        htmlContent: html as string,
        icon: '📊',
        length: 'short',
      };

      // Guardar en el projectsStore
      if (selectedProjectId) {
        await projectsStore.setSummaryProject(selectedProjectId, result);
      }

    } catch (error) {
      console.error('Error procesando resumen del proyecto:', error);
      errorMessage = 'Error al procesar resumen del proyecto';
    } finally {
      generatingProjectSummary = false;
    }
  }

  function handleSummaryError(length: SummaryLength, error: string) {
    console.error(`Error en resumen ${length}:`, error);
    errorMessage = error || `Error al generar resumen ${length}`;
    generatingStates[length] = false;
  }

  function handleProjectSummaryError(error: string) {
    console.error('Error en resumen del proyecto:', error);
    errorMessage = error || 'Error al generar resumen del proyecto';
    generatingProjectSummary = false;
  }

  async function generateSummary(length: SummaryLength) {
    if (!selectedWebpage) {
      errorMessage = "Selecciona una página primero";
      return;
    }

    generatingStates[length] = true;
    errorMessage = '';

    try {
      const content = selectedWebpage.refinedMarkdown || selectedWebpage.strippedMarkdown || selectedWebpage.rawMarkdown;
      
      if (!content || content.trim().length < 150) {
        throw new Error("El contenido de la página es demasiado corto para generar un resumen.");
      }

      const requestId = `summary_${length}_${Date.now()}`;

      window.parent.postMessage({
        action: 'requestSummary',
        content,
        length,
        requestId,
        isProjectSummary: false
      }, '*');

      console.log(`Petición de resumen ${length} enviada (ID: ${requestId})`);

    } catch (error: any) {
      console.error(`Error al solicitar resumen ${length}:`, error);
      errorMessage = error.message;
      generatingStates[length] = false;
    }
  }

  async function generateProjectSummary() {
    if (!selectedProject || !selectedProject.contentProject) {
      errorMessage = "El proyecto no tiene contenido para resumir";
      return;
    }

    generatingProjectSummary = true;
    errorMessage = '';

    try {
      if (selectedProject.contentProject.trim().length < 150) {
        throw new Error("El contenido del proyecto es demasiado corto para generar un resumen.");
      }

      const requestId = `summary_project_${Date.now()}`;

      window.parent.postMessage({
        action: 'requestSummary',
        content: selectedProject.contentProject,
        length: 'short',
        requestId,
        isProjectSummary: true
      }, '*');

      console.log(`Petición de resumen del proyecto enviada (ID: ${requestId})`);

    } catch (error: any) {
      console.error('Error al solicitar resumen del proyecto:', error);
      errorMessage = error.message;
      generatingProjectSummary = false;
    }
  }

  onMount(async () => {
    window.addEventListener('message', handleMessage);
    await notificationStore.clear('summaries');
  });

  onDestroy(() => {
    window.removeEventListener('message', handleMessage);
  });
</script>

<div class="content-container p-4">
  <!-- Selector de Proyecto y Página -->
  <div class="mb-4">
    <ProjectPageSelector 
      bind:selectedProjectId
      bind:selectedWebpageId
      on:projectChanged={handleProjectChanged}
      on:webpageChanged={handleWebpageChanged}
    />
  </div>

  {#if !selectedProjectId}
    <!-- Estado: No hay proyecto seleccionado -->
    <div class="text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
        <svg class="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
        </svg>
      </div>
      <p class="text-slate-600 text-base">
        Selecciona un proyecto para comenzar
      </p>
    </div>
  {:else}
    <!-- Botón de Resumen del Proyecto -->
    <div class="mb-4">
      <button
        on:click={generateProjectSummary}
        disabled={generatingProjectSummary || isProjectSummaryGenerated() || !selectedProject?.contentProject}
        class="w-full p-2 bg-black text-white rounded-xl hover:bg-gray-800 font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
      >
        {#if generatingProjectSummary}
          <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Generando Resumen del Proyecto...</span>
        {:else if isProjectSummaryGenerated()}
          <span class="text-2xl">✓</span>
          <span>Resumen del Proyecto Generado</span>
        {:else}
          <span>Generar Resumen del Proyecto</span>
        {/if}
      </button>
    </div>

    <!-- Mostrar resumen del proyecto si existe -->
    {#if projectSummary}
      <div class="mb-4 flex flex-col gap-2">
        <SummaryCard 
          title={projectSummary.title}
          content={projectSummary.content}
          htmlContent={projectSummary.htmlContent}
          icon={projectSummary.icon}
        />
      </div>
    {/if}

    <!-- Divisor -->
    <div class="flex items-center gap-4 my-6">
      <div class="flex-1 h-px bg-gray-200"></div>
      <span class="text-sm text-gray-500 font-medium">Resúmenes por Página</span>
      <div class="flex-1 h-px bg-gray-200"></div>
    </div>

    {#if !selectedWebpageId}
      <!-- Estado: No hay página seleccionada -->
      <div class="text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
          <svg class="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <p class="text-slate-600 text-base">
          Selecciona una página para generar resúmenes
        </p>
      </div>
    {:else}
      <!-- Botones de generación de resúmenes -->
      <div class="grid grid-cols-3 gap-3 mb-4">
        <button
          on:click={() => generateSummary('short')}
          disabled={generatingStates.short || isSummaryGenerated('short')}
          class="p-1.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {#if generatingStates.short}
            <div class="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
          {:else if isSummaryGenerated('short')}
            <span class="text-2xl">✓</span>
          {:else}
            <span class="text-2xl">📄</span>
          {/if}
          <span class="text-sm">Corto</span>
        </button>

        <button
          on:click={() => generateSummary('medium')}
          disabled={generatingStates.medium || isSummaryGenerated('medium')}
          class="p-1.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {#if generatingStates.medium}
            <div class="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
          {:else if isSummaryGenerated('medium')}
            <span class="text-2xl">✓</span>
          {:else}
            <span class="text-2xl">📋</span>
          {/if}
          <span class="text-sm">Medio</span>
        </button>

        <button
          on:click={() => generateSummary('long')}
          disabled={generatingStates.long || isSummaryGenerated('long')}
          class="p-1.5 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {#if generatingStates.long}
            <div class="w-5 h-5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin"></div>
          {:else if isSummaryGenerated('long')}
            <span class="text-2xl">✓</span>
          {:else}
            <span class="text-2xl">📚</span>
          {/if}
          <span class="text-sm">Extenso</span>
        </button>
      </div>

      {#if errorMessage}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4" role="alert">
          <strong class="font-bold">¡Error!</strong>
          <span class="block sm:inline mt-1">{errorMessage}</span>
        </div>
      {/if}

      <!-- Resúmenes generados -->
      <div class="flex flex-col gap-2">
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
    {/if}
  {/if}
</div>