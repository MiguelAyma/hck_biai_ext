<script>
  export let title = '';
  export let content = '';
  export let htmlContent = '';
  export let icon = '📄';
  export let gradient = 1;

  $: wordCount = content.split(' ').length;
  let copyButtonText = 'Copiar';

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(content);
      copyButtonText = '✓ Copiado';
      setTimeout(() => {
        copyButtonText = 'Copiar';
      }, 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  }
</script>

<div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover-lift">
  <div class="flex items-start justify-between mb-4">
    <div class="flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg">
        {icon}
      </div>
      <div>
        <h3 class="text-lg font-semibold text-gray-800">{title}</h3>
        <p class="text-sm text-gray-500">{wordCount} palabras aprox.</p>
      </div>
    </div>
    <button
      on:click={copyToClipboard}
      class="px-4 py-2 bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl text-sm font-semibold text-black transition-all hover:from-slate-100 hover:to-blue-100"
    >
      {copyButtonText}
    </button>
  </div>
  <div class="prose prose-sm max-w-none text-gray-700 leading-relaxed">
    {@html htmlContent}
  </div>
</div>

<style>
  .prose :global(h1) {
    font-size: 1.5rem;
    font-weight: bold;
    margin-top: 1rem;
    margin-bottom: 0.5rem;
  }

  .prose :global(h2) {
    font-size: 1.25rem;
    font-weight: bold;
    margin-top: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .prose :global(h3) {
    font-size: 1.125rem;
    font-weight: 600;
    margin-top: 0.5rem;
    margin-bottom: 0.25rem;
  }

  .prose :global(p) {
    margin-bottom: 0.75rem;
    line-height: 1.625;
  }

  .prose :global(ul),
  .prose :global(ol) {
    margin-left: 1.25rem;
    margin-bottom: 0.75rem;
  }

  .prose :global(li) {
    margin-bottom: 0.25rem;
  }

  .prose :global(strong) {
    font-weight: 600;
    color: #1f2937;
  }

  .prose :global(code) {
    background: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    font-family: monospace;
  }

  .prose :global(pre) {
    background: #1f2937;
    color: #f9fafb;
    padding: 0.75rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    margin-bottom: 0.75rem;
  }

  .prose :global(a) {
    color: #3b82f6;
    text-decoration: underline;
  }

  .prose :global(blockquote) {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    font-style: italic;
    color: #6b7280;
  }
</style>