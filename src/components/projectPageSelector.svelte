<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { projectsStore } from '../stores/projectsStore';
  import type { Project, Webpage } from '../stores/projectsStore';
  import CircleCheckIcon from '../icons/circleCheckIcon.svelte';

  export let selectedProjectId: string | null = null;
  export let selectedWebpageId: string | null = null;

  const dispatch = createEventDispatcher();
  
  let showProjectsMenu = false;
  let showPagesMenu = false;
  let allProjects: Project[] = [];
  let selectedProject: Project | null = null;
  let selectedWebpage: Webpage | null = null;

  projectsStore.subscribe(state => {
    allProjects = state.projects;
    
    if (selectedProjectId) {
      selectedProject = allProjects.find(p => p.id === selectedProjectId) || null;
      
      if (selectedProject && selectedWebpageId) {
        selectedWebpage = selectedProject.webpages.find(w => w.id === selectedWebpageId) || null;
      }
    }
  });

  function handleSelectProject(projectId: string) {
    selectedProjectId = projectId;
    selectedProject = allProjects.find(p => p.id === projectId) || null;
    selectedWebpageId = null;
    selectedWebpage = null;
    showProjectsMenu = false;
    
    dispatch('projectChanged', { projectId });
  }

  function handleSelectWebpage(webpageId: string) {
    selectedWebpageId = webpageId;
    selectedWebpage = selectedProject?.webpages.find(w => w.id === webpageId) || null;
    showPagesMenu = false;
    
    dispatch('webpageChanged', { webpageId });
  }

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (showProjectsMenu && !target.closest('.projects-menu-container')) {
      showProjectsMenu = false;
    }
    if (showPagesMenu && !target.closest('.pages-menu-container')) {
      showPagesMenu = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="flex items-center gap-2">
  <!-- Project Selector -->
  <div class="relative projects-menu-container flex-1">
    <button
      on:click|stopPropagation={() => (showProjectsMenu = !showProjectsMenu)}
      class="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
    >       
      <div class="text-left flex-1 flex gap-1">
        <div class="text-sm font-semibold text-gray-900 flex items-center gap-1">
          {selectedProject?.name || "Seleccionar Proyecto"}
          <CircleCheckIcon className="w-4 h-4 text-gray-400"/>
        </div>
        <div class="text-xs text-gray-500">
          {selectedProject?.webpages.length || 0} páginas
        </div>
      </div>
    </button>

    {#if showProjectsMenu}
      <div
        class="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
      >
        <div class="p-2 border-b border-gray-100">
          <div class="text-xs font-semibold text-gray-500 px-2 py-1">
            MIS PROYECTOS
          </div>
        </div>

        <div class="max-h-64 overflow-y-auto">
          {#each allProjects as project (project.id)}
            <button
              on:click={() => handleSelectProject(project.id)}
              class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
              class:bg-indigo-50={project.id === selectedProjectId}
            >
              <div class="flex-1 text-left">
                <div class="text-sm font-medium text-gray-900 flex items-center gap-2">
                  {project.name}
                  {#if project.id === selectedProjectId}
                    <svg
                      class="w-4 h-4 text-black"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {/if}
                </div>
                <div class="text-xs text-gray-500">
                  {project.webpages.length} páginas
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <!-- Page Selector -->
  {#if selectedProject && selectedProject.webpages.length > 0}
    <div class="relative pages-menu-container flex-1">
      <button
        on:click|stopPropagation={() => (showPagesMenu = !showPagesMenu)}
        class="w-full flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
      >       
        <div class="text-left flex-1 min-w-0 grid">
          <div class="text-sm font-semibold text-gray-900 truncate">
            {selectedWebpage?.title || "Seleccionar Página"}
          </div>          
        </div>
        <svg class="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>

      {#if showPagesMenu}
        <div
          class="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
        >
          <div class="p-2 border-b border-gray-100">
            <div class="text-xs font-semibold text-gray-500 px-2 py-1">
              PÁGINAS DEL PROYECTO
            </div>
          </div>

          <div class="max-h-64 overflow-y-auto">
            {#each selectedProject.webpages as webpage (webpage.id)}
              <button
                on:click={() => handleSelectWebpage(webpage.id)}
                class="w-full items-start flex gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                class:bg-indigo-50={webpage.id === selectedWebpageId}
              >
                <img 
                  src={webpage.faviconUrl} 
                  alt="" 
                  class="w-4 h-4 mt-0.5 flex-shrink-0"
                  on:error={(e) => e.currentTarget.src = 'icon1.png'}
                />
                <div class="flex-1 text-left min-w-0 grid">
                  <div class="text-sm font-medium text-gray-900 truncate">
                    {webpage.title}
                  </div>
                  
                </div>
                {#if webpage.id === selectedWebpageId}
                  <svg
                    class="w-4 h-4 text-black flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clip-rule="evenodd"
                    />
                  </svg>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>