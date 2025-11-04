<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { marked } from 'marked';
  import { chatStore } from '../stores/chatStore';
  import type { ChatMessage, ChatListItem } from '../stores/chatStore';
  import { projectsStore } from '../stores/projectsStore';
  import type { Project } from '../stores/projectsStore';
  import { localActiveProject } from '../stores/activeProjectChat';
  import TypingIndicator from './typingIndicator.svelte';
  import Send2Icon from '../icons/send2Icon.svelte';
  import ProjectSelector from './projectSelector.svelte';

  // Estado del chat
  let chatContainer: HTMLDivElement;
  let textareaElement: HTMLTextAreaElement;
  let inputValue: string = '';
  let isSidebarOpen: boolean = false;

  // Valores del store de chat
  let statusInfo: string = '';
  let chatHistory: ChatMessage[] = [];
  let isLoading: boolean = false;
  let isSessionReady: boolean = false;
  let chatSessionId: string | null = null;
  let chatList: ChatListItem[] = [];

  // Valores del store de proyectos
  let allProjects: Project[] = [];
  let currentActiveProject: Project | null = null;

  // Suscripciones
  const unsubscribeChat = chatStore.subscribe(state => {
    statusInfo = state.statusInfo;
    isLoading = state.isLoading;
    isSessionReady = state.isSessionReady;
    chatSessionId = state.chatSessionId;
    chatList = state.chatList;

    if (state.chatHistory !== chatHistory) {
      chatHistory = state.chatHistory;
      autoScroll();
    }
  });

  const unsubscribeProjects = projectsStore.subscribe(state => {
    allProjects = state.projects;
    
    // Inicializar con el primer proyecto si no hay uno activo
    if (state.projects.length > 0) {
      localActiveProject.initializeWithFirstProject(state.projects);
    }
  });

  const unsubscribeActiveProject = localActiveProject.subscribe(project => {
    currentActiveProject = project;
  });

  onMount(() => {
    window.addEventListener('message', handleWindowMessage);
    window.parent.postMessage({ action: 'getChatListRequest' }, '*');
  });

  onDestroy(() => {
    window.removeEventListener('message', handleWindowMessage);
    unsubscribeChat();
    unsubscribeProjects();
    unsubscribeActiveProject();
  });

  async function autoScroll(): Promise<void> {
    await tick();
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  function adjustHeight(): void {
    if (!textareaElement) return;
    textareaElement.style.height = 'auto';
    const scrollHeight = textareaElement.scrollHeight;
    const maxHeight = 120;

    if (scrollHeight > maxHeight) {
      textareaElement.style.height = maxHeight + 'px';
      textareaElement.style.overflowY = 'auto';
    } else {
      textareaElement.style.height = scrollHeight + 'px';
      textareaElement.style.overflowY = 'hidden';
    }
  }

  function handleInput(): void {
    adjustHeight();
  }

  function handleSend(): void {
    const message = inputValue.trim();
    if (!message || isLoading || !isSessionReady) return;

    chatStore.startSending(message);
    window.parent.postMessage({
      action: 'requestChatSend',
      requestId: chatSessionId,
      userText: message
    }, '*');
    
    inputValue = '';
    setTimeout(adjustHeight, 0);
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // Crear nuevo chat con el proyecto activo actual
  function handleNewChat(): void {
    if (isLoading || !currentActiveProject) return;

    const newSessionId = currentActiveProject.id;
    console.log(`Creando nuevo chat con proyecto "${currentActiveProject.name}"`);
    
    chatStore.startLoading(newSessionId, true);
    
    // Agregar inmediatamente a la lista de chats con título temporal
    const tempChatItem: ChatListItem = {
      id: newSessionId,
      title: `Chat - ${currentActiveProject.name}`,
      projectId: currentActiveProject.id
    };
    chatStore.setChatList([tempChatItem, ...chatList]);
    
    window.parent.postMessage({
      action: 'requestChatInit',
      requestId: newSessionId,
      misContenidos: currentActiveProject.contentProject
    }, '*');

    isSidebarOpen = false;
  }

  // Cargar chat existente y cambiar el proyecto activo según el chat
  function handleLoadChat(id: string): void {
    if (isLoading) return;
    console.log(`Cargando chat ${id}`);
    
    // Encontrar el chat en la lista para obtener su projectId
    const chat = chatList.find(c => c.id === id);
    if (chat) {
      const project = allProjects.find(p => p.id === chat.projectId);
      if (!project) return;
      // Cambiar el proyecto activo local según el chat seleccionado
      localActiveProject.setActiveProject(project);
    }
    
    chatStore.startLoading(id, false);
    
    // Obtener el proyecto actual para enviar el contexto
    const project = allProjects.find(p => p.id === chat?.projectId);
    
    console.log("project sidbar",project?.contentProject);
    window.parent.postMessage({
      action: 'requestChatInit',
      requestId: id,
      misContenidos: project?.contentProject || ''
    }, '*');

    isSidebarOpen = false;
  }

  // Eliminar chat
  function handleDeleteChat(id: string): void {
    if (isLoading) return;
    console.log(`Eliminando chat ${id}`);
    
    chatStore.startLoading(id, false);
    window.parent.postMessage({
      action: 'requestChatDestroy',
      requestId: id
    }, '*');
  }

  // Toggle sidebar
  function toggleSidebar(): void {
    isSidebarOpen = !isSidebarOpen;
  }

  // Manejar cambio de proyecto desde el selector
  function handleProjectChanged(project: Project): void {
    localActiveProject.setActiveProject(project);
    
    // Si hay una sesión activa, crear una nueva con el proyecto seleccionado
    if (chatSessionId) {
      handleNewChat();
    }
  }

  // Manejar mensajes del background
  function handleWindowMessage(event: MessageEvent): void {
    const { action } = event.data;
    
    if (action === 'chatListResponse') {
      const receivedChatList: ChatListItem[] = event.data.chatList || [];
      chatStore.setChatList(receivedChatList);
      return;
    }

    const { requestId } = event.data;
    
    if (action === 'chatDestroyed') {
      if (requestId === chatSessionId) {
        chatStore.setDestroyed();
      }
      window.parent.postMessage({ action: 'getChatListRequest' }, '*');
      return;
    }

    if (requestId !== chatSessionId) return;

    const { error, message, history, lastMessage, response } = event.data;
    
    switch (action) {
      case 'chatReady':
        chatStore.setSessionReady();
        // Solicitar actualización de la lista de chats para obtener el título actualizado
        window.parent.postMessage({ action: 'getChatListRequest' }, '*');
        break;
      case 'chatHistoryRestored':
        chatStore.setHistoryRestored(history, lastMessage);
        break;
      case 'chatResponse':
        chatStore.setResponse(response);
        // Actualizar título del chat después de la primera respuesta
        if (chatHistory.length === 0) {
          window.parent.postMessage({ action: 'getChatListRequest' }, '*');
        }
        break;
      case 'chatQuotaOverflow':
        chatStore.setQuotaOverflow(message);
        break;
      case 'chatError':
        chatStore.setError(error);
        break;
    }
  }

  // Obtener el nombre del proyecto por ID
  function getProjectName(projectId: string): string {
    const project = allProjects.find(p => p.id === projectId);
    return project?.name || 'Proyecto';
  }
</script>

<div class="flex flex-col h-full content-container relative">

  {#if isSidebarOpen}
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 z-40"
      on:click={toggleSidebar}
      on:keydown={(e) => e.key === 'Escape' && toggleSidebar()}
      role="button"
      tabindex="0"
      aria-label="Cerrar sidebar"
    ></div>
  {/if}

  <div 
    class="fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out z-50 flex flex-col"
    class:translate-x-0={isSidebarOpen}
    class:-translate-x-full={!isSidebarOpen}
  >
    <div class="p-4 border-b border-gray-200">
      <button
        on:click={handleNewChat}
        disabled={isLoading || !currentActiveProject}
        class="w-full px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-700 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
        </svg>
        Nuevo Chat
      </button>
    </div>

    <!-- Chat List -->
    <div class="flex-1 overflow-y-auto p-2">
      {#if chatList.length === 0}
        <div class="text-center text-sm text-gray-500 py-8">
          No hay chats guardados
        </div>
      {:else}
        {#each chatList as chat (chat.id)}
          <div 
            class="group relative mb-2 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
            class:bg-indigo-50={chat.id === chatSessionId}
            on:click={() => handleLoadChat(chat.id)}
            on:keydown={(e) => e.key === 'Enter' && handleLoadChat(chat.id)}
            role="button"
            tabindex="0"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 truncate">
                  {chat.title}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  {getProjectName(chat.projectId)}
                </div>               
              </div>
              <button
                on:click|stopPropagation={() => handleDeleteChat(chat.id)}
                disabled={isLoading && chat.id === chatSessionId}
                class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                title="Eliminar chat"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 z-10">
   
    <button
      on:click={toggleSidebar}
      class="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors relative"
      title="Historial de chats"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>
    </button>

    <div class="flex-1">
      <ProjectSelector projectChanged={handleProjectChanged} activeProject={currentActiveProject} />
    </div>
  </div>

  <!-- Chat Container -->
  <div class="chat-container flex-1 p-4 overflow-y-auto" bind:this={chatContainer}>
    {#if !chatSessionId}
      <!-- Welcome Screen -->
      <div class="welcome-message text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <img src="icon1.png" alt="Botsi" />
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">
          Hola soy Botsi
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          {#if !currentActiveProject}
            Selecciona un proyecto para comenzar
          {:else}
            Haz clic en "Nuevo Chat" o en el menú para comenzar
          {/if}
        </p>
        {#if currentActiveProject}
          <button
            on:click={handleNewChat}
            disabled={isLoading}
            class="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-700 transition-all disabled:bg-gray-400 inline-flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
            </svg>
            Comenzar Chat
          </button>
        {/if}
      </div>
    {:else}
      <!-- Chat Messages -->
      {#if isLoading && chatHistory.length === 0}
        <div class="text-center py-12">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p class="mt-4 text-sm text-gray-600">{statusInfo}</p>
        </div>
      {:else}
        {#each chatHistory as message, index (message.content + index)}
          {#if message.role === 'error' || message.role === 'system-warning'}
            <div class="text-center text-xs text-red-600 my-2 p-2 bg-red-50 rounded-md">
              {message.content}
            </div>
          {:else if message.role === 'user' || message.role === 'assistant'}
            <div class="chat-message flex w-full mb-4 {message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in">
              <div 
                class="px-5 py-3 rounded-2xl shadow-sm {message.role === 'user' ? 'bg-gray-800 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'}" 
                style="max-width: 75%"
              >
                {#if message.role === 'user'}
                  {message.content}
                {:else}
                  <div class="markdown-content prose prose-sm max-w-none">
                    {@html marked.parse(message.content)}
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
        
        {#if isLoading}
          <TypingIndicator />
        {/if}
      {/if}
    {/if}
  </div>

  <!-- Input Area -->
  <div class="bg-white border-t border-gray-200 px-4 py-3 flex gap-2 items-end">
    <textarea
      bind:this={textareaElement}
      bind:value={inputValue}
      on:input={handleInput}
      on:keydown={handleKeydown}
      placeholder={chatSessionId ? (isSessionReady ? "Escribe tu pregunta..." : "Cargando sesión...") : "Selecciona un proyecto y crea un chat"}
      class="flex-1 p-2 text-gray-700 transition-colors resize-none"
      rows="1"
      style="border: none; outline: none; min-height: 40px; max-height: 120px; line-height: 1.5;"
      disabled={!isSessionReady || isLoading || !chatSessionId}
    />
    <button
      on:click={handleSend}
      class="px-5 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-700 transition-all flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed"
      disabled={!isSessionReady || isLoading || !inputValue.trim() || !chatSessionId}
    >
      <Send2Icon className="w-5 h-5" />
    </button>
  </div>
</div>

<style>
  .animate-slide-in {
    animation: slideIn 0.3s ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .markdown-content :global(p) {
    margin-bottom: 0.75rem;
  }

  .markdown-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin-left: 1.5rem;
    margin-bottom: 0.75rem;
  }

  .markdown-content :global(li) {
    margin-bottom: 0.25rem;
  }

  .markdown-content :global(code) {
    background-color: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
  }

  .markdown-content :global(pre) {
    background-color: #1f2937;
    color: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin-bottom: 0.75rem;
  }

  .markdown-content :global(pre code) {
    background-color: transparent;
    padding: 0;
    color: inherit;
  }

  .markdown-content :global(h1),
  .markdown-content :global(h2),
  .markdown-content :global(h3) {
    margin-top: 1rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .markdown-content :global(blockquote) {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin: 0.75rem 0;
    color: #6b7280;
  }
</style>