<script lang="ts">
  import { ImageData } from "../types/types";

  export let images: ImageData[] = [];
</script>

<div class="p-4 space-y-4">
  <div class="grid grid-cols-2 gap-3">
    {#each images as image}
      <div class="bg-white mb-auto border-2 border-slate-200 text-slate-700 rounded-xl p-4 flex flex-col items-center justify-start gap-2">
        <img src={image.src} alt={image.alt || 'No alt'} class="w-full h-48 object-cover rounded-xl mb-2" />
        <p class="text-sm flex flex-col gap-2 text-start"><span class="font-bold">Alt:</span> {image.alt || 'No alt'}</p>
        <p class="text-sm flex flex-col gap-2 text-start"><span class="font-bold">Description:</span> {image.description || 'No description'}</p>
      </div>
    {/each}
  </div>
</div>
