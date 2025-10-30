<script lang="ts">
  import { onMount } from 'svelte';
  import Header from './components/header.svelte';
  import ChatView from './components/chatView.svelte';
  import ContentView   from './components/contentView.svelte';
  import SummariesView from './components/summariesView.svelte';
  import Footer from './components/footer.svelte';
  import MetadataPagesView from './components/metadataPagesView.svelte';

  import { 
    fullMarkdownStore,
    plainTextMarkdownStore,
    textOnlyMarkdownStore,
  } from './stores/contentStore';

  import { notificationStore } from './stores/notificationStore';

  import { ChatMessage, ViewType } from './types/types';
  import { 
    extractFullMarkdown, 
    extractImages, 
    extractPlainTextMarkdown, 
    extractRawMarkdown, 
    extractTextOnlyMarkdown 
  } from './services/contentExtrator.service';
  import RawMarkdownView from './components/rawMarkdownView.svelte';


  let currentView: ViewType = 'chat';
  let chatMessages: ChatMessage[] = [];

  onMount(async () => {
    // Inicializar el store de notificaciones
    await notificationStore.init();

    // Cargar el historial de chat desde la "memoria"
    const data = await chrome.storage.local.get('chatMessages');
    if (data.chatMessages) {
      chatMessages = data.chatMessages;
    }

    // Escuchar mensajes DEL SERVICE WORKER
    chrome.runtime.onMessage.addListener((message) => {
      if (message.command === 'botProcessComplete') {
        console.log("Svelte UI: ¡Respuesta recibida del Service Worker!");
        chatMessages = message.updatedMessages;
      }
    });

    // Limpiar notificaciones del chat al abrir (ya que el usuario está viendo el chat)
    if (currentView === 'chat') {
      await clearViewNotifications('chat');
    }

    // Extraer contenido de la página
    extractFullMarkdown();
    extractTextOnlyMarkdown();
    extractRawMarkdown();
    extractImages();
    extractPlainTextMarkdown();
  });

  async function switchView(view: ViewType) {
    const previousView = currentView;
    currentView = view;
    
    // Limpiar notificaciones del view actual cuando el usuario lo abre
    await clearViewNotifications(view);

    // Si cambia desde 'markdown' y había un análisis en progreso, mantenerlo
    if (previousView === 'markdown' && view !== 'markdown') {
      // El análisis seguirá corriendo en background
      console.log("📊 Análisis de IA continuará en segundo plano");
    }
  }

  async function clearViewNotifications(view: ViewType) {
    await notificationStore.clear(view);
    
    // También notificar al background para que actualice todos los tabs
    chrome.runtime.sendMessage({
      command: 'clearNotifications',
      view: view
    }).catch(() => {});
  }

  async function handleSendMessage(event: CustomEvent<{ message: string }>) {
    const { message } = event.detail;
    
    const userMsg: ChatMessage = { 
      id: Date.now(),
      text: message, 
      type: 'user' 
    };
    
    const botPlaceholder: ChatMessage = {
      id: Date.now() + 1,
      text: '...',
      type: 'bot'
    };

    chatMessages = [...chatMessages, userMsg, botPlaceholder];

    await chrome.storage.local.set({ chatMessages: chatMessages });

    chrome.runtime.sendMessage({
      command: 'startBotProcess',
      userMessage: message,
      placeholderId: botPlaceholder.id
    });
  }

</script>

<div class="min-h-dvh flex flex-col">
  <Header />
    
  <main>
    {#if currentView === 'chat'}
      <ChatView messages={chatMessages} />
    {:else if currentView === 'markdown'}
    <!-- <RawMarkdownView content={$plainTextMarkdownStore.content} /> -->
      <ContentView content={$fullMarkdownStore.content} />
    {:else if currentView === 'summaries'}
      <SummariesView content={$textOnlyMarkdownStore.content} />
    {:else if currentView === 'investigation'}
      <MetadataPagesView />
    {/if}
  </main>
  
  <Footer 
    {currentView}
    on:switchView={(e) => switchView(e.detail.view)}
    on:sendMessage={handleSendMessage}
  />
</div>