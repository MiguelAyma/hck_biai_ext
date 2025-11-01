<script>
  import { createEventDispatcher } from 'svelte';
  import { 
    chatNotifications, 
    markdownNotifications, 
    summariesNotifications, 
    investigationNotifications 
  } from '../stores/notificationStore';

  export let currentView = 'chat';

  const dispatch = createEventDispatcher();

  function switchView(view) {
    dispatch('switchView', { view });
  }
</script>

<div class="bg-white border-t border-gray-200">
  <!-- Botones de Navegación -->
  <div class="px-4 py-3 flex items-center justify-between gap-2">  
    <button
      on:click={() => switchView('investigation')}
      class="relative px-3 py-1.5 {currentView === 'investigation' ? 'bg-[#ECECEC]' : 'bg-white border border-gray-300'} text-gray-700 rounded-2xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center gap-1"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      invest
      {#if $investigationNotifications && $investigationNotifications.count > 0}
        <span class="notification-badge investigation">
          {$investigationNotifications.count > 9 ? '9+' : $investigationNotifications.count}
        </span>
      {/if}
    </button>
    <button
      on:click={() => switchView('markdown')}
      class="relative px-3 py-1.5 {currentView === 'markdown' ? 'bg-[#ECECEC]' : 'bg-white border border-gray-300'} text-gray-700 rounded-2xl font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-1"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
      </svg>
      content
      {#if $markdownNotifications && $markdownNotifications.count > 0}
        <span class="notification-badge markdown">
          {$markdownNotifications.count > 9 ? '9+' : $markdownNotifications.count}
        </span>
      {/if}
    </button> 
    <button
      on:click={() => switchView('summaries')}
      class="relative px-3 py-1.5 {currentView === 'summaries' ? 'bg-[#ECECEC]' : 'bg-white border border-gray-300'} text-gray-700 rounded-2xl font-medium text-sm hover:bg-gray-50 transition-colors flex items-center gap-1"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
      </svg>
      summaries
      {#if $summariesNotifications && $summariesNotifications.count > 0}
        <span class="notification-badge summaries">
          {$summariesNotifications.count > 9 ? '9+' : $summariesNotifications.count}
        </span>
      {/if}
    </button> 
    <button
      on:click={() => switchView('chat')}
      class="relative px-3 py-1.5 {currentView === 'chat' ? 'bg-[#ECECEC]' : 'bg-white border border-gray-300'} text-gray-700 rounded-2xl font-medium text-sm hover:bg-gray-200 transition-colors flex items-center gap-1"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
      </svg>
      Chat
      {#if $chatNotifications && $chatNotifications.count > 0}
        <span class="notification-badge chat">
          {$chatNotifications.count > 9 ? '9+' : $chatNotifications.count}
        </span>
      {/if}
    </button>
  </div>
</div>
<style>
  .notification-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: white;
    padding: 0 5px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    animation: badgeAppear 0.3s ease-out;
  }

  .notification-badge.chat {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .notification-badge.markdown {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  }

  .notification-badge.summaries {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  }

  .notification-badge.investigation {
    background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  }

  @keyframes badgeAppear {
    from {
      opacity: 0;
      transform: scale(0.5);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>