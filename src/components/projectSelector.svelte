<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { projectsStore } from '../stores/projectsStore';
  import CircleCheckIcon from '../icons/circleCheckIcon.svelte';
  import { Project } from '../stores/projectsStore';

  export let projectChanged: (project: Project) => void;
  export let activeProject: Project | null ;

  const dispatch = createEventDispatcher();

  
  let showProjectsMenu = false;

  $: projectsWithCount = Object.entries($projectsStore.projects).map(([id, project]) => ({
    project
  }));

  function handleSelectProject(project: Project ): void {
    showProjectsMenu = false;
    projectChanged(project);
  }

  function handleClickOutside(event) {
    if (showProjectsMenu && !event.target.closest('.projects-menu-container')) {
      showProjectsMenu = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="relative projects-menu-container">
  <button
    on:click|stopPropagation={() => (showProjectsMenu = !showProjectsMenu)}
    class="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all"
  >       
    <div class="text-left">
      <div class="text-sm font-semibold text-gray-900 flex items-center gap-1">
        {activeProject?.name || "General"}
        <CircleCheckIcon className="w-4 h-4 text-gray-400"/>
      </div>
      <div class="text-xs text-gray-500">
        {activeProject?.webpages?.length || 0} páginas
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
        {#if activeProject}
        {#each projectsWithCount as project (project.project.id)}
          <button
            on:click={() => handleSelectProject(project.project)}
            class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
            class:bg-indigo-50={project.project.id === activeProject.id}
          >
            <div class="flex-1 text-left">
              <div class="text-sm font-medium text-gray-900 flex items-center gap-2">
                {project.project.name}
                {#if project.project.id === activeProject.id}
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
                {project.project.webpages.length} páginas
              </div>
            </div>
          </button>
        {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>