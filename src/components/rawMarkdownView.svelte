<script>
  import { marked } from 'marked';

  export let content = '';

  $: htmlContent = content 
</script>

<div class="content-container">
  {#if !htmlContent}
    <div class="text-center py-20">
      <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
        </svg>
      </div>
      <p class="text-gray-400 text-lg">No se encontró contenido relevante en la página.</p>
    </div>
  {:else}
    <pre class="max-w-none text-gray-700 p-4">
      {@html htmlContent}
    </pre>
  {/if}
</div>
