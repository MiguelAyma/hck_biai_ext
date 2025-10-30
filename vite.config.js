//vite.config.js

import { defineConfig } from 'vite';

import { svelte } from '@sveltejs/vite-plugin-svelte';

import { resolve } from 'path';

import { copyFileSync, existsSync } from 'fs';



export default defineConfig({

  plugins: [

    svelte(),

    {

      name: 'copy-extension-files',

      writeBundle() {

        // Copiar manifest.json

        try {

          copyFileSync('manifest.json', 'dist/manifest.json');
          copyFileSync('contentScript.js', 'dist/contentScript.js');
          copyFileSync('background.js', 'dist/background.js');
          copyFileSync('geminiService.js', 'dist/geminiService.js');
          copyFileSync('translatorService.js', 'dist/translatorService.js');

          console.log('manifest.json copiado');

        } catch (e) {

          console.error('Error copiando manifest.json:', e.message);

        }



        // Copiar turndown.min.js

        if (existsSync('turndown.min.js')) {

          copyFileSync('turndown.min.js', 'dist/turndown.min.js');

          console.log('turndown.min.js copiado');

        } else {

          console.warn('turndown.min.js no encontrado');

        }



        // Copiar icon1.png

        if (existsSync('icon1.png')) {

          copyFileSync('icon1.png', 'dist/icon1.png');

          console.log('icon1.png copiado');

        } else {

          console.warn('icon1.png no encontrado');

        }

      }

    }

  ],

  build: {

    outDir: 'dist',

    emptyOutDir: true,

    rollupOptions: {

      input: {

        popup: resolve(__dirname, 'popup.html')

      },

      output: {

        entryFileNames: 'popup.js',

        chunkFileNames: '[name].js',

        assetFileNames: 'popup.css'

      }

    }

  }

});