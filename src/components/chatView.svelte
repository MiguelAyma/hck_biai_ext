<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte';
  import { marked } from 'marked';
  
  // 1. Importa STORES y TIPOS
  import { chatStore, chatInitialState } from '../stores/chatStore';
  import type { ChatMessage } from '../stores/chatStore';
  import { activeProject, projectsStore, type Project } from '../stores/projectsStore';
  
  // (Si TypingIndicator está en español, puedes descomentar esta línea)
  // import TypingIndicator from './typingIndicator.svelte';

  // --- (Estado local de UI) ---
  let inputValue: string = "";
  let chatLogElement: HTMLDivElement;
  let textareaElement: HTMLTextAreaElement;
  
  // ¡NUEVO! Estado para la sidebar
  let isSidebarHidden: boolean = false;

  // --- (Valores del Store de CHAT) ---
  let statusInfo: string = chatInitialState.statusInfo;
  let rawMarkdown: string = chatInitialState.rawMarkdown;
  let chatHistory: ChatMessage[] = chatInitialState.chatHistory;
  let isLoading: boolean = chatInitialState.isLoading;
  let isSessionReady: boolean = chatInitialState.isSessionReady;
  let chatSessionId: string | null = chatInitialState.chatSessionId;
  let chatList: { id: string, title: string }[] = chatInitialState.chatList;

  // --- (Valores del Store de PROYECTOS) ---
  let allProjects: Project[] = [];
  let isLoadingProjects: boolean = true;
  let isLoading2 = false; // (Para el botón de seed)

  // --- (Suscripciones a Stores) ---
  
  chatStore.subscribe(state => {
    statusInfo = state.statusInfo;
    rawMarkdown = state.rawMarkdown;
    isLoading = state.isLoading;
    isSessionReady = state.isSessionReady;
    chatSessionId = state.chatSessionId;
    chatList = state.chatList;

    if (state.chatHistory !== chatHistory) {
      chatHistory = state.chatHistory;
      autoScroll();
    }
  });

  projectsStore.subscribe(state => {
    allProjects = state.projects;
    isLoadingProjects = state.isLoading;
  });

  // --- (Lógica de UI) ---
  
  // ¡NUEVO! Función para ocultar/mostrar la sidebar
  function toggleSidebar() {
    isSidebarHidden = !isSidebarHidden;
  }

  async function autoScroll() {
    await tick();
    if (chatLogElement) {
      chatLogElement.scrollTop = chatLogElement.scrollHeight;
    }
  }

  function adjustHeight() {
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

  function handleInput() {
    adjustHeight();
  }


  const misContenidos = [
    {
      titulo: "Guía de Estilo de JavaScript",
      contenido: "El código debe ser claro y legible..."
    }, 

  ];

  // Click en un Chat de la Sidebar (para chats ANTIGUOS)
  function handleLoadChat(id: string) {
    if (isLoading) return;
    console.log(`Svelte: Cargando chat ${id}`);
    chatStore.startLoading(id, false); 
    window.parent.postMessage({
      action: 'requestChatInit',
      requestId: id,
      misContenidos: $activeProject?.contentProject
    }, '*');
  }

  // Botón: "+ Nuevo Chat" (Vuelve a la pantalla de selección de proyecto)
  function handleNewChatClick() {
    console.log("Svelte: Preparando para nuevo chat...");
    chatStore.clearActiveChat();
  }
  
  // ¡NUEVO! Se llama al hacer clic en un Proyecto.
  function handleCreateSessionFromProject(project: Project) {
    if (isLoading) return;

    // const dynamicContenidos = project.webpages.map(webpage => ({
    //   titulo: webpage.title,
    //   contenido: webpage.markdownSummaryLong 
    // }));

    // if (dynamicContenidos.length === 0) {
    //   alert(`El proyecto "${project.name}" no tiene páginas para chatear.`);
    //   return;
    // }

    const newSessionId = `chat_proj_${project.id}_${Date.now()}`;
    console.log(`Svelte: Creando nuevo chat desde proyecto "${project.name}"`);
    chatStore.startLoading(newSessionId, true); 

    window.parent.postMessage({
      action: 'requestChatInit',
      requestId: newSessionId,
      misContenidos:  $activeProject?.contentProject
    }, '*');
  }

  onMount(() => {
    console.log("context iiy: ", $activeProject?.contentProject)
  });
  // Botón: "X" (para borrar)
  function handleDestroyClick(id: string) {
    if (isLoading) return;
    console.log(`Svelte: Solicitando destruir sesión ${id}`);
    chatStore.startLoading(id, false);
    chatStore.setError("Destruyendo sesión...");
    window.parent.postMessage({
      action: 'requestChatDestroy',
      requestId: id
    }, '*');
  }

  // Botón: "Enviar"
  function handleSend() {

    console.log("context: ", $activeProject?.contentProject)
    const userText = inputValue.trim();
    if (!userText || isLoading || !isSessionReady) return;
    chatStore.startSending(userText);
    window.parent.postMessage({
      action: 'requestChatSend',
      requestId: chatSessionId,
      userText: userText
    }, '*');
    inputValue = "";
    setTimeout(adjustHeight, 0);
  }
  
  // Tecla "Enter"
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  // --- 2. Lógica (Receptor de Mensajes) ---
  function handleWindowMessage(event: MessageEvent) {
    const { action } = event.data;
    if (action === 'chatListResponse') {
      chatStore.setChatList(event.data.chatList);
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
    if (requestId !== chatSessionId) {
      return; 
    }
    const { error, message, history, lastMessage, response } = event.data;
    switch (action) {
      case 'chatReady': chatStore.setSessionReady(); break;
      case 'chatHistoryRestored': chatStore.setHistoryRestored(history, lastMessage); break;
      case 'chatResponse': chatStore.setResponse(response); break;
      case 'chatQuotaOverflow': chatStore.setQuotaOverflow(message); break;
      
      // --- ¡ELIMINADO! ---
      // 'case 'chatSystemUpdated': ...' ha sido borrado.
      
      case 'chatError': chatStore.setError(error); break;
    }
  }

  // --- 3. Lógica (Ciclo de Vida) ---
  onMount(() => {
    window.addEventListener('message', handleWindowMessage);
    window.parent.postMessage({ action: 'getChatListRequest' }, '*');
  });
  
  onDestroy(() => {
    window.removeEventListener('message', handleWindowMessage);
  });


</script>

<style>
  :global(body, html) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }
  .layout-wrapper {
    display: flex;
    font-family: sans-serif;
    height: 100vh;
    width: 100vw;
    box-sizing: border-box;
    overflow: hidden;
  }

  /* --- Sidebar (Lista de Sesiones) --- */
  .sidebar {
    width: 240px;
    flex-shrink: 0;
    border-right: 1px solid #e0e0e0;
    background: #f7f7f7;
    display: flex;
    flex-direction: column;
    /* ¡NUEVO! Transición para colapsar */
    transition: width 0.2s ease, opacity 0.2s ease;
    opacity: 1;
  }
  /* ¡NUEVO! Estilo colapsado */
  .sidebar.hidden {
    width: 0;
    opacity: 0;
    overflow: hidden;
  }

  .sidebar-header {
    padding: 12px;
    border-bottom: 1px solid #e0e0e0;
  }
  .sidebar-header button {
    width: 100%;
    padding: 8px 12px;
    background-color: #333;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    cursor: pointer;
  }
  .sidebar-header button:hover {
    background-color: #555;
  }
  .sidebar-list {
    flex-grow: 1;
    overflow-y: auto;
  }
  .chat-list-item {
    padding: 12px;
    cursor: pointer;
    border-bottom: 1px solid #e0e0e0;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    word-break: break-word;
  }
  .chat-list-item.active {
    background: #e0e0e0;
    font-weight: 600;
  }
  .chat-list-item:hover {
    background: #ececec;
  }
  .chat-list-item button {
    flex-shrink: 0;
    background: #d9534f;
    color: white;
    border: none;
    cursor: pointer;
    font-size: 10px;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    margin-left: 8px;
  }
  .main-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    height: 100%; 
    overflow: hidden;
  }
  .welcome-placeholder {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    padding: 20px;
    box-sizing: border-box;
    text-align: center;
    color: #666;
  }
  .welcome-placeholder #status {
    margin-top: 15px;
    font-style: italic;
  }
  .chat-message .markdown-content > *:first-child {
    margin-top: 0;
  }
  .chat-message .markdown-content > *:last-child {
    margin-bottom: 0;
  }
  .chat-message .markdown-content ul,
  .chat-message .markdown-content ol {
    padding-left: 1.2em;
  }

  /* --- Estilos para la lista de proyectos (sin cambios) --- */
  .project-list {
    width: 100%;
    max-width: 360px;
    max-height: 300px;
    overflow-y: auto;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: #fff;
    margin-top: 20px;
  }
  .project-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 12px 16px;
    background: #fff;
    border: none;
    border-bottom: 1px solid #e0e0e0;
    cursor: pointer;
    box-sizing: border-box; 
  }
  .project-item:last-child {
    border-bottom: none;
  }
  .project-item:hover {
    background: #f9f9f9;
  }
  .project-item:disabled {
    opacity: 0.5;
    background: #f0f0f0;
  }
  .project-item .name {
    font-weight: 600;
    color: #333;
    font-size: 1em;
  }
  .project-item .count {
    font-size: 0.85em;
    color: #777;
    margin-top: 2px;
  }
  .seed-button {
    margin-top: 16px;
    padding: 8px 12px;
    background-color: #555;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }
  .seed-button:disabled {
    background-color: #aaa;
  }

  /* --- ¡NUEVO! Estilo para el botón de colapsar --- */
  .sidebar-toggle-btn {
    background: none;
    border: none;
    padding: 0 4px;
    cursor: pointer;
    margin-right: 10px;
    border-radius: 4px;
  }
  .sidebar-toggle-btn svg {
    width: 20px;
    height: 20px;
    color: #555;
    stroke-width: 2.5;
  }
  .sidebar-toggle-btn:hover {
    background-color: #f0f0f0;
  }
</style>

<div class="layout-wrapper content-container">

  <div class="sidebar" class:hidden={isSidebarHidden}>
    <div class="sidebar-header">
      <button on:click={handleNewChatClick}>
        + New Chat
      </button>
    </div>
    <div class="sidebar-list">
      {#each chatList as chat}
        <div 
          class="chat-list-item" 
          class:active={chat.id === chatSessionId} 
          on:click={() => handleLoadChat(chat.id)}
          title={chat.title}
        >
          <span style="flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            {chat.title}
          </span>
          <button 
            on:click|stopPropagation={() => handleDestroyClick(chat.id)}
            disabled={isLoading && chat.id === chatSessionId}
          >X</button>
        </div>
      {/each}
    </div>
  </div>

  <div class="main-content">
    
    {#if !chatSessionId}
      <div class="welcome-placeholder">
        <div class="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <img src="icon1.png" alt="Botsi" style="width: 64px; height: 64px;" />
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">
          Hola, soy Botsi
        </h3>
        <p class="text-sm text-gray-600">Selecciona un proyecto para comenzar a chatear:</p>
        
        <div class="project-list">
          {#if isLoadingProjects}
            <div style="padding: 20px; color: #888;">Cargando proyectos...</div>
          {:else if allProjects.length === 0}
            <div style="padding: 20px; color: #888;">
              No tienes proyectos.
            </div>
          {:else}
            {#each allProjects as project (project.id)}
              <button 
                class="project-item"
                on:click={() => handleCreateSessionFromProject(project)}
                disabled={isLoading}
              >
                <div class="name">{project.name}</div>
                <div class="count">{project.webpages.length} páginas</div>
              </button>
            {/each}
          {/if}
        </div>
        


        <div id="status" style="margin-top: 16px;">{statusInfo}</div>
      </div>
    
    {:else}
      <div class="flex flex-col h-full content-container" style="height: 100%;">
        
        <div class="px-4 py-2 border-b border-gray-200 bg-white text-sm text-gray-600 italic flex items-center">
          
          <button title="Ocultar/Mostrar chats" class="sidebar-toggle-btn" on:click={toggleSidebar}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <span>{statusInfo}</span>
        </div>

        <div class="chat-container flex-1 p-4 overflow-y-auto" bind:this={chatLogElement}>
          {#each chatHistory as message (message.content + Math.random())}
            {#if message.role === 'error' || message.role === 'system-warning'}
              <div class="text-center text-xs text-red-600 my-2 p-2 bg-red-50 rounded-md">
                {message.content}
              </div>
            {:else if message.role === 'user' || message.role === 'assistant'}
              <div class="chat-message flex w-full mb-4 {message.role === 'user' ? 'justify-end' : 'justify-start'}">
                <div 
                  class="px-5 py-3 rounded-2xl shadow-sm {message.role === 'user' ? 'bg-gray-800 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'}" 
                  style="max-width: 75%"
                >
                  {#if message.role === 'user'}
                    {message.content}
                  {:else}
                    <div class="markdown-content">
                      {@html marked.parse(message.content)}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          {/each}
          
          {#if isLoading}
             {/if}
        </div>

        <div class="bg-white border-t border-gray-200 px-4 py-3 flex gap-2 items-end">
          <textarea
            bind:this={textareaElement}
            bind:value={inputValue}
            on:input={handleInput}
            on:keydown={handleKeydown}
            placeholder={isSessionReady ? "Write your question..." : "Loading session..."}
            class="flex-1 p-2 text-gray-700 transition-colors resize-none"
            rows="1"
            style="border: none; outline: none; min-height: 40px; max-height: 120px; line-height: 1.5;"
            disabled={!isSessionReady || isLoading}
          />
          <button
            on:click={handleSend}
            class="px-5 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-700 transition-all flex-shrink-0 disabled:bg-gray-400"
            disabled={!isSessionReady || isLoading || !inputValue.trim()}
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>