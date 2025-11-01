<script lang="ts">
  import {
    projectsStore,
    activeProject,
    activeWebpages,
  } from "../stores/projectsStore";
  import { projectPagesService } from "../services/proyectPages.service";
  import FolderIcon from "../icons/folderIcon.svelte";
  import TrashIcon from "../icons/trashIcon.svelte";
  import PlusIcon from "../icons/plusIcon.svelte";
  import PhotoIcon from "../icons/photoIcon.svelte";
  import { onMount } from "svelte";
  import { plainTextMarkdownStore } from "../stores/contentStore";
  import { extractPlainTextMarkdown } from "../services/contentExtrator.service";
  import { projectPageStore } from "../stores/projectStore";
  import SparklesIcon from "../icons/sparklesIcon.svelte";
  import CardPage from "./cardPage.svelte";
  import { createPageId } from "../utils/createPageId";

  let isAdding = false;
  let showProjectSelector = false;
  let showNewProjectModal = false;
  let showProjectsMenu = false;
  let newProjectName = "";
  let currentPageFavicon: string | null = null;

  async function handleAddPage(projectId: string) {
    isAdding = true;
    showProjectSelector = false;
    
    try {
      // Usar el método que verifica duplicados
      const urlPage = await projectPagesService.extractAndAddIfNew(projectId);
      console.log("urlPage", urlPage);
      const newIdPage = createPageId(urlPage);
      console.log("newIdPage", newIdPage);
      projectsStore.setStrippedMarkdown(projectId, newIdPage, $plainTextMarkdownStore.content);
      // await extractPlainTextMarkdown(urlPage, projectId)
      
      if (!urlPage) {
        alert("Esta página ya existe en el proyecto");
      }
    } catch (error) {
      console.error("Error adding page:", error);
    } finally {
      isAdding = false;
    }
  }

  async function handleRemovePage(projectId: string, webpageId: string) {
    await projectsStore.removeWebpage(projectId, webpageId);
  }

  async function handleCreateProject() {
    if (newProjectName.trim()) {
      await projectsStore.createProject(newProjectName.trim());
      newProjectName = "";
      showNewProjectModal = false;
    }
  }

  async function handleDeleteProject(id: string) {
    if (
      confirm(
        "¿Estás seguro? Se eliminarán todas las páginas de este proyecto."
      )
    ) {
      await projectsStore.deleteProject(id);
      showProjectsMenu = false;
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function truncateText(text: string, maxLength: number): string {
    if (!text) return "";
    return text.length > maxLength
      ? text.substring(0, maxLength) + "..."
      : text;
  }

  function handleClickOutsideProjectSelector(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".project-selector-container")) {
      showProjectSelector = false;
    }
  }

  function handleClickOutsideProjectsMenu(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest(".projects-menu-container")) {
      showProjectsMenu = false;
    }
  }

  $: if (showProjectSelector) {
    document.addEventListener("click", handleClickOutsideProjectSelector);
  } else {
    document.removeEventListener("click", handleClickOutsideProjectSelector);
  }

  $: if (showProjectsMenu) {
    document.addEventListener("click", handleClickOutsideProjectsMenu);
  } else {
    document.removeEventListener("click", handleClickOutsideProjectsMenu);
  }

  onMount(async () => {
    try {
      currentPageFavicon = await projectPagesService.extractFavicon();
    } catch (error) {
      console.error("Error extracting favicon:", error);
    }
  });

  const extractFullMarkdownPlain = async (url: string) => {
    try {
      console.log("URL extraida:", url);
      await extractPlainTextMarkdown(url);
      console.log("Markdown extraido:", $plainTextMarkdownStore.content);
    } catch (error) {
      console.error("Error extracting markdown:", error);
      return "";
    }
  };

  // Calcular el conteo de páginas para cada proyecto
  $: projectsWithCount = $projectsStore.projects.map(project => ({
    ...project,
    pageCount: project.webpages.length
  }));

  const handleSelectProject = (projectId: string) => {
    projectsStore.setActiveProject(projectId);
    projectPageStore.setIdProject(projectId);
    showProjectsMenu = false;
    console.log("Proyecto seleccionado:", $activeProject);
  };

  /////////////////////////
  let openMenuId: string | null = null;

  function handleToggleMenu(event: CustomEvent) {
    const { id } = event.detail;
    openMenuId = openMenuId === id ? null : id;
  }

  function handleCloseMenu() {
    openMenuId = null;
  }

  function handleDelete( idPage: string) {
    console.log('Eliminando webpage con id:', idPage);
    openMenuId = null;
    handleRemovePage($activeProject?.id || "", idPage)
  }

  function handleViewContent(webpage: any) {
    console.log('Ver contenido de:', webpage);
    openMenuId = null;
  }

  function handleGenerateAI(url: string) {
    console.log('Generar AI para URL:', url);
    openMenuId = null;
  }

</script>

<div class="content-container p-4">
  <div class="mb-4">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2 flex-1">
        <div class="relative projects-menu-container">
          <button
            on:click={() => (showProjectsMenu = !showProjectsMenu)}
            class="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <!-- <span class="text-2xl">📁</span> -->
            <div class="text-left">
              <div
                class="text-sm font-semibold text-gray-900 flex items-center gap-1"
              >
                {$activeProject?.name || "General"}
                <svg
                  class="w-4 h-4 text-gray-400 transition-transform"
                  class:rotate-180={showProjectsMenu}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <div class="text-xs text-gray-500">
                {$activeProject?.webpages.length || 0} páginas
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
                {#each projectsWithCount as project (project.id)}
                  <button
                    on:click={() => handleSelectProject(project.id)}
                    class="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors group"
                    class:bg-indigo-50={project.id ===
                      $projectsStore.activeProjectId}
                  >
                    <!-- <span class="text-2xl">📁</span> -->
                    <div class="flex-1 text-left">
                      <div
                        class="text-sm font-medium text-gray-900 flex items-center gap-2"
                      >
                        {project.name}
                        {#if project.id === $projectsStore.activeProjectId}
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
                        {project.pageCount} páginas
                      </div>
                    </div>
                    {#if project.id !== "default-project"}
                      <button
                        on:click|stopPropagation={() =>
                          handleDeleteProject(project.id)}
                        class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="Eliminar proyecto"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    {/if}
                  </button>
                {/each}
              </div>

              <div class="p-2 border-t border-gray-100">
                <button
                  on:click={() => {
                    showNewProjectModal = true;
                    showProjectsMenu = false;
                  }}
                  class="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  Crear Nuevo Proyecto
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>
      <div class="relative project-selector-container">
        <button
          on:click={() => (showProjectSelector = !showProjectSelector)}
          disabled={isAdding}
          class="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {#if isAdding}
            <div class="flex gap-1">
              <div
                class="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                style="animation-delay: 0ms;"
              ></div>
              <div
                class="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                style="animation-delay: 150ms;"
              ></div>
              <div
                class="w-1.5 h-1.5 bg-white rounded-full animate-bounce"
                style="animation-delay: 300ms;"
              ></div>
            </div>
            <span>Agregando...</span>
          {:else}
            {#if currentPageFavicon}
              <img class="w-4 h-4" src={currentPageFavicon} alt="" />
            {/if}
            <PlusIcon className="w-5 h-5" />
            <span>Add this website</span>
          {/if}
        </button>

        {#if showProjectSelector && !isAdding}
          <div
            class="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
          >
            <div class="p-2">
              <div class="text-xs font-semibold text-gray-500 px-2 py-1 mb-1">
                AGREGAR A PROYECTO
              </div>
              {#each projectsWithCount as project (project.id)}
                <button
                  on:click={() => handleAddPage(project.id)}
                  class="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <div class="flex-1">
                    <div class="text-sm font-medium text-gray-900">
                      {project.name}
                    </div>
                    <div class="text-xs text-gray-500">
                      {project.pageCount} páginas
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if $projectsStore.hasError}
    <div
      class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
    >
      <p class="font-medium">Error:</p>
      <p>{$projectsStore.errorMessage}</p>
    </div>
  {/if}

  {#if $activeWebpages.length === 0}
    <div class="text-center py-16">
      <div
        class="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl flex items-center justify-center"
      >
        <FolderIcon className="w-10 h-10 text-gray-400" />
      </div>
      <p class="text-gray-500 text-base mb-2">
        No hay páginas en este proyecto
      </p>
      <p class="text-gray-400 text-sm">
        Haz clic en "Agregar" para guardar una página
      </p>
    </div>
  {:else}
    <div class="space-y-3">
      {#each $activeWebpages as webpage (webpage.id)}
      <!-- {console.log("webpage", webpage)} -->
        <CardPage 
          {webpage}
          isMenuOpen={openMenuId === webpage.id}
          on:toggleMenu={handleToggleMenu}
          on:closeMenu={handleCloseMenu}
          ondelete={() => handleDelete(webpage.id)}
          onviewContent={() => handleViewContent(webpage)}
          ongenerateAI={() => handleGenerateAI(webpage.url)}
          projectId={$activeProject?.id}
        />
      {/each}
    </div>
  {/if}
</div>

{#if showNewProjectModal}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
    on:click={(e) => {
      if (e.target === e.currentTarget) showNewProjectModal = false;
    }}
  >
    <div
      class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      on:click|stopPropagation
    >
      <div class="p-6 border-b border-gray-100">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold text-gray-900">Nuevo Proyecto</h3>
          <button
            on:click={() => (showNewProjectModal = false)}
            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              class="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      <div class="p-6">
        <label
          for="project-name"
          class="block text-sm font-medium text-gray-700 mb-2"
        >
          Nombre del proyecto
        </label>
        <input
          id="project-name"
          type="text"
          bind:value={newProjectName}
          placeholder="Ej: Proyecto Personal, Trabajo, etc."
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
          on:keydown={(e) => {
            if (e.key === "Enter") handleCreateProject();
          }}
          autofocus
        />
      </div>

      <div class="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
        <button
          on:click={() => (showNewProjectModal = false)}
          class="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          on:click={handleCreateProject}
          disabled={!newProjectName.trim()}
          class="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Crear Proyecto
        </button>
      </div>
    </div>
  </div>
{/if}
<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>