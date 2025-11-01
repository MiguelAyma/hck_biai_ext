<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { marked } from 'marked';
  import { tick } from 'svelte';
  import TypingIndicator from './typingIndicator.svelte';
  // 1. Importa el ESTADO INICIAL y los TIPOS
  import { chatStore, chatInitialState } from '../stores/chatStore';
  import type { ChatMessage } from '../stores/chatStore';
  import { projectsStore } from '../stores/projectsStore';



  // --- (Estado local de UI) ---
  let inputValue: string = "";       // Para el input principal de chat
  let newContextTitle: string = "";  // Para el input de "Añadir Tema"
  let newContextBody: string = "";   // Para el textarea de "Añadir Tema"
  
  let chatLogElement: HTMLDivElement;     // Para el auto-scroll
  let textareaElement: HTMLTextAreaElement; // Para el auto-resize

  // --- (Valores del Store) ---
  // Declaramos todas las variables de estado que obtendremos del store
  let statusInfo: string = chatInitialState.statusInfo;
  let rawMarkdown: string = chatInitialState.rawMarkdown;
  let chatHistory: ChatMessage[] = chatInitialState.chatHistory;
  let isLoading: boolean = chatInitialState.isLoading;
  let isSessionReady: boolean = chatInitialState.isSessionReady;
  let chatSessionId: string | null = chatInitialState.chatSessionId;
  let chatList: { id: string, title: string }[] = chatInitialState.chatList;

  let isLoading2 = false;

  async function handleSeedData() {
    isLoading2 = true;
    console.log("Cargando datos de Diagramas UML...");
    
    // 2. Llama a la nueva función del store
    await projectsStore.seedUmlData();
    
    console.log("¡Datos cargados!");
    alert("¡Proyecto 'Diagramas UML' añadido!");
    isLoading2 = false;
  }

  // 2. Suscripción al Store
  chatStore.subscribe(state => {
    // Asignamos los nuevos valores del estado
    statusInfo = state.statusInfo;
    rawMarkdown = state.rawMarkdown;
    isLoading = state.isLoading;
    isSessionReady = state.isSessionReady;
    chatSessionId = state.chatSessionId;
    chatList = state.chatList;

    // Lógica de auto-scroll cuando el historial cambia
    if (state.chatHistory !== chatHistory) {
      chatHistory = state.chatHistory;
      autoScroll();
    }
  });

  // --- (Lógica de UI) ---

  async function autoScroll() {
    // Espera a que Svelte actualice el DOM
    await tick();
    if (chatLogElement) {
      chatLogElement.scrollTop = chatLogElement.scrollHeight;
    }
  }

  function adjustHeight() {
    if (!textareaElement) return;
    textareaElement.style.height = 'auto';
    const scrollHeight = textareaElement.scrollHeight;
    const maxHeight = 120; // Límite de altura del textarea

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

  // --- (Lógica de "Contenidos" y "postMessage") ---

  const misContenidos = [
    {
      titulo: "Guía de Estilo de JavaScript",
      contenido: "El código debe ser claro y legible. Usar 'const' y 'let' en lugar de 'var'. La indentación debe ser de 2 espacios. Evitar comentarios innecesarios."
    }, {
      titulo: "Optimización de Rendimiento Web",
      contenido: "Minimizar el CSS y JavaScript es crucial. Comprimir imágenes usando formatos modernos como WebP. Utilizar 'lazy loading' para imágenes fuera del 'viewport' inicial."
    }, {
      titulo: "Notas sobre la API de Gemini Nano",
      contenido: "La API 'LanguageModel' se ejecuta en el dispositivo (on-device). Es ideal para tareas de resumen y chat contextual sin depender de un servidor. El manejo de la cuota ('quota') es automático y borra el historial antiguo si se excede."
    }
  ];

  // --- 1. Lógica (Manejadores de Eventos) ---

  // Botón: "Añadir Tema al Chat"
  function handleUpdateSystemPrompt() {
    const title = newContextTitle.trim();
    const body = newContextBody.trim();

    if (!title || !body || isLoading || !isSessionReady || !chatSessionId) {
      console.warn("No se puede actualizar el contexto.");
      return;
    }

    // Formato correcto para añadir al prompt
    const systemContent = `Eres un asistente experto...`; // (Tu prompt base)
    const formattedContent = systemContent + `\n\n---\n\n# ${title}\n\n${body}`;
    
    console.log(`Svelte: Solicitando actualizar system prompt para ${chatSessionId}`);
    chatStore.setError("Actualizando contexto del sistema..."); 
    
    window.parent.postMessage({
      action: 'requestSystemUpdate',
      requestId: chatSessionId,
      newContent: formattedContent
    }, '*');
    
    newContextTitle = "";
    newContextBody = "";
  }
  
  // Click en un Chat de la Sidebar
  function handleLoadChat(id: string) {
    if (isLoading) return;
    console.log(`Svelte: Cargando chat ${id}`);
    chatStore.startLoading(id, false); 
    window.parent.postMessage({
      action: 'requestChatInit',
      requestId: id,
      misContenidos: misContenidos
    }, '*');
  }

  // Botón: "+ Nuevo Chat"
  function handleNewChatClick() {
    console.log("Svelte: Preparando para nuevo chat...");
    chatStore.clearActiveChat();
  }

  // Botón: "Cargar Documentos e Iniciar Chat"
  function handleCreateNewSession() {
    const newSessionId = `chat_${Date.now()}`;
    console.log(`Svelte: Creando nuevo chat ${newSessionId}`);
    chatStore.startLoading(newSessionId, true); 
    window.parent.postMessage({
      action: 'requestChatInit',
      requestId: newSessionId,
      misContenidos: misContenidos
    }, '*');
  }

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
    const userText = inputValue.trim();
    if (!userText || isLoading || !isSessionReady) return;
    
    chatStore.startSending(userText);
    
    window.parent.postMessage({
      action: 'requestChatSend',
      requestId: chatSessionId,
      userText: userText
    }, '*');

    inputValue = "";
    setTimeout(adjustHeight, 0); // Resetea la altura del textarea
  }
  
  // Tecla "Enter" en el Textarea
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
      return; // Ignora mensajes de chats no activos
    }
    
    const { error, message, history, lastMessage, response } = event.data;

    switch (action) {
      case 'chatReady':
        chatStore.setSessionReady();
        break;
      case 'chatHistoryRestored':
        chatStore.setHistoryRestored(history, lastMessage);
        break;
      case 'chatResponse':
        chatStore.setResponse(response);
        break;
      case 'chatQuotaOverflow':
        chatStore.setQuotaOverflow(message);
        break;
      case 'chatSystemUpdated':
        chatStore.setSystemUpdated(message);
        break;
      case 'chatError':
        chatStore.setError(error);
        break;
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

<!-- 
  ======================================================
  ESTILOS:
  CSS de la lógica de sesiones (para la sidebar)
  ======================================================
-->
<style>
  :global(body, html) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  }

  /* Contenedor principal que divide Sidebar / Chat */
  .layout-wrapper {
    display: flex;
    font-family: sans-serif;
    height: 100vh; /* Ocupa toda la altura de la ventana */
    width: 100vw;  /* Ocupa toda la anchura */
    box-sizing: border-box;
    overflow: hidden; /* Evita scrolls dobles */
  }

  /* --- Sidebar (Lista de Sesiones) --- */
  .sidebar {
    width: 240px; /* Un poco más ancho */
    flex-shrink: 0;
    border-right: 1px solid #e0e0e0;
    background: #f7f7f7;
    display: flex;
    flex-direction: column;
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

  /* --- Contenedor del Chat (Derecha) --- */
  .main-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    /* Importante: forzar que el hijo ocupe toda la altura */
    height: 100%; 
    overflow: hidden;
  }

  /* Estado de bienvenida (cuando no hay chat) */
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
  .welcome-placeholder button {
    padding: 12px 20px;
    font-size: 16px;
    background-color: #333;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 20px;
  }
  .welcome-placeholder button:disabled {
    background-color: #a0a0a0;
  }
  .welcome-placeholder #status {
    margin-top: 15px;
    font-style: italic;
  }

  /* Estilos para el markdown renderizado */
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

</style>

<!-- 
  ======================================================
  HTML:
  Estructura Híbrida (Sidebar + Chat UI)
  ======================================================
-->
<div class="layout-wrapper">

  <!-- 1. Sidebar (de la lógica de sesiones) -->
  <div class="sidebar">
    <div class="sidebar-header">
      <button on:click={handleNewChatClick}>
        + Nuevo Chat
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

  <!-- 2. Contenido Principal -->
  <div class="main-content">
    
    {#if !chatSessionId}
      <!-- 2A. Pantalla de Bienvenida (fusionada) -->
      <div class="welcome-placeholder">
        <div class="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <!-- (Asegúrate de que esta imagen esté en tu carpeta 'public') -->
          <img src="icon1.png" alt="Botsi" style="width: 64px; height: 64px;" />
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">
          Hola soy Botsi
        </h3>
        <p class="text-sm text-gray-600">Crea un nuevo chat o carga tus documentos.</p>
        
        <button on:click={handleCreateNewSession} disabled={isLoading}>
          {isLoading ? 'Cargando...' : 'Cargar Documentos e Iniciar Chat'}
        </button>
        <div id="status">{statusInfo}</div>
      </div>
    
    {:else}
      <!-- 2B. Interfaz de Chat Activa (del componente 1) -->
      <div class="flex flex-col h-full content-container" style="height: 100%;">
        
        <!-- Estado (arriba) -->
        <div class="px-4 py-2 border-b border-gray-200 bg-white text-sm text-gray-600 italic">
          {statusInfo}
        </div>

        <!-- Área de mensajes -->
        <div class="chat-container flex-1 p-4 overflow-y-auto" bind:this={chatLogElement}>
          {#each chatHistory as message (message.content + Math.random())}
            
            <!-- Mensajes del Sistema (Errores, etc.) -->
            {#if message.role === 'error' || message.role === 'system-warning'}
              <div class="text-center text-xs text-red-600 my-2 p-2 bg-red-50 rounded-md">
                {message.content}
              </div>
            
            <!-- Mensajes de Chat (Usuario y Asistente) -->
            {:else if message.role === 'user' || message.role === 'assistant'}
              <div class="chat-message flex w-full mb-4 {message.role === 'user' ? 'justify-end' : 'justify-start'}">
                <div 
                  class="px-5 py-3 rounded-2xl shadow-sm {message.role === 'user' ? 'bg-gray-800 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'}" 
                  style="max-width: 75%"
                >
                  {#if message.role === 'user'}
                    {message.content}
                  {:else}
                    <!-- Renderiza el Markdown del Asistente -->
                    <div class="markdown-content">
                      {@html marked.parse(message.content)}
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          {/each}
          
          <!-- Indicador de "Escribiendo..." -->
          {#if isLoading}
             <!-- (Asegúrate de que 'TypingIndicator.svelte' exista) -->
             <TypingIndicator />
          {/if}
        </div>

        <!-- Formulario "Añadir Tema" (integrado) -->
        <div class="bg-gray-50 p-3 border-t border-b border-gray-200">
          <input 
            type="text" 
            placeholder="Título del nuevo tema" 
            bind:value={newContextTitle}
            disabled={!isSessionReady || isLoading}
            class="w-full p-2 border border-gray-300 rounded mb-2 text-sm"
          >
          <textarea 
            placeholder="Contenido del nuevo tema..." 
            bind:value={newContextBody}
            disabled={!isSessionReady || isLoading}
            rows="2"
            class="w-full p-2 border border-gray-300 rounded mb-2 text-sm"
          ></textarea>
          <button 
            on:click={handleUpdateSystemPrompt} 
            disabled={!isSessionReady || isLoading || !newContextTitle || !newContextBody}
            class="w-full px-4 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 disabled:bg-gray-300"
          >
            Añadir Tema al Chat
          </button>
        </div>

        <!-- Área de Input (fija en la parte inferior) -->
        <div class="bg-white border-t border-gray-200 px-4 py-3 flex gap-2 items-end">
          <textarea
            bind:this={textareaElement}
            bind:value={inputValue}
            on:input={handleInput}
            on:keydown={handleKeydown}
            placeholder={isSessionReady ? "Escribe tu pregunta..." : "Cargando sesión..."}
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
          <button on:click={handleSeedData} disabled={isLoading}>
  {isLoading ? 'Cargando...' : 'Cargar Proyecto de Prueba (UML)'}
</button>
        </div>

      </div>
    {/if}
    
  </div>
</div>>