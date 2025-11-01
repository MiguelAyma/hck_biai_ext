<script>
  import { afterUpdate } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import TypingIndicator from './typingIndicator.svelte';

  export let messages = [];

  const dispatch = createEventDispatcher();

  let chatContainer;
  let textareaElement;
  let inputValue = '';
  let isTyping = false;

  afterUpdate(() => {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  function handleSend() {
    const message = inputValue.trim();
    if (!message) return;

    dispatch('sendMessage', { message });
    inputValue = '';
    setTimeout(adjustHeight, 0);
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleInput() {
    adjustHeight();
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
</script>

<div class="flex flex-col h-full content-container">
  <!-- Área de mensajes -->
  <div class="chat-container flex-1 p-4 overflow-y-auto" bind:this={chatContainer}>
    {#if messages.length === 0}
      <div class="welcome-message text-center py-12">
        <div class="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <img src="icon1.png" alt="Botsi" />
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mb-2">
          Hola soy Botsi
        </h3>
        <p class="text-sm text-gray-600">Preguntame lo que quieras</p>
      </div>
    {:else}
      {#each messages as message}
        <div class="chat-message flex w-full mb-4 {message.type === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in">
          <div class="px-5 py-3 rounded-2xl shadow-sm {message.type === 'user' ? 'bg-gray-800 text-white rounded-br-md' : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'}" style="max-width: 75%">
            {message.text}
          </div>
        </div>
      {/each}
      {#if isTyping}
        <TypingIndicator />
      {/if}
    {/if}
  </div>

  <!-- Área de Input (fija en la parte inferior) -->
  <div class="bg-white border-t border-gray-200 px-4 py-3 flex gap-2 items-end">
    <textarea
      bind:this={textareaElement}
      bind:value={inputValue}
      on:input={handleInput}
      on:keydown={handleKeydown}
      placeholder="Escribe tu pregunta..."
      class="flex-1 p-2 text-gray-700 transition-colors resize-none"
      rows="1"
      style="border: none; outline: none; min-height: 40px; max-height: 120px; line-height: 1.5;"
    />
    <button
      on:click={handleSend}
      class="px-5 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-700 transition-all flex-shrink-0"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
      </svg>
    </button>
  </div>
</div>