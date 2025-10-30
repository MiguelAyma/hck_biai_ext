
<script>
  function closeChat() {
    // Enviar mensaje al content script para cerrar
    window.parent.postMessage({ action: 'closeChat' }, '*');
  }
</script>

<header class="bg-[#ECECEC] border-b border-gray-200 px-4 py-1 flex items-center justify-between">
  <div class="flex items-center">
    <button class="px-3 py-1.5 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors">
      BOTSI
    </button>
  </div>

  <div class="flex items-center gap-2">
    <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
      <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </button>

    <button class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
      <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
      </svg>
    </button>

    <button 
      on:click={closeChat}
      class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      title="Cerrar chat"
    >
      <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
      </svg>
    </button>
  </div>
</header>