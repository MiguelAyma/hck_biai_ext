<script>
  import { afterUpdate } from 'svelte';
  import TypingIndicator from './typingIndicator.svelte';

  export let messages = [];

  let chatContainer;
  let isTyping = false;

  afterUpdate(() => {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });

  $: {
    if (messages.length > 0 && messages[messages.length - 1].type === 'user') {
      isTyping = true;
      setTimeout(() => {
        isTyping = false;
      }, 1500);
    }
  }
</script>

<div class="chat-container p-4" bind:this={chatContainer}>
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