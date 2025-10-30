class TranslatorService {
  constructor() {
    this.activeTranslators = new Map();
    this.supportedLanguages = [
      { code: 'en', name: 'English', flag: '🇬🇧' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'fr', name: 'Français', flag: '🇫🇷' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
      { code: 'it', name: 'Italiano', flag: '🇮🇹' },
      { code: 'pt', name: 'Português', flag: '🇵🇹' },
      { code: 'ja', name: '日本語', flag: '🇯🇵' },
      { code: 'ko', name: '한국어', flag: '🇰🇷' },
      { code: 'zh', name: '中文', flag: '🇨🇳' },
      { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      { code: 'ar', name: 'العربية', flag: '🇸🇦' },
      { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }
    ];
  }

  async checkAvailability(sourceLanguage, targetLanguage) {
    try {
      const availability = await Translator.availability({
        sourceLanguage,
        targetLanguage
      });
      return availability;
    } catch (error) {
      console.error('Translator: Error checking availability:', error);
      throw error;
    }
  }

  async translate(content, sourceLanguage, targetLanguage, requestId, streaming = false, onProgress = null) {
    console.log(`Translator: Iniciando traducción ${sourceLanguage} -> ${targetLanguage} (ID: ${requestId})`);

    try {
      // Validar contenido
      if (!content || content.trim().length === 0) {
        throw new Error("El contenido está vacío.");
      }

      // Verificar disponibilidad
      const availability = await this.checkAvailability(sourceLanguage, targetLanguage);
      console.log(`Translator: Disponibilidad del modelo: ${availability}`);

      if (availability === 'no') {
        throw new Error('El modelo de traducción no está soportado para esta combinación de idiomas.');
      }

      // Crear el translator (esto descargará el modelo si es necesario)
      console.log('Translator: Creando instancia del traductor...');

      // Notificar si el modelo necesita descargarse
      if (availability === 'after-download' && onProgress) {
        onProgress('downloading', 0);
      }

      const translator = await Translator.create({
        sourceLanguage,
        targetLanguage
      });

      console.log('Translator: Instancia creada exitosamente');

      // Guardar referencia
      this.activeTranslators.set(requestId, translator);

      let result;

      if (streaming) {
        // Traducción por streaming
        result = await this.translateStreaming(translator, content, onProgress);
      } else {
        // Traducción directa
        if (onProgress) {
          onProgress('translating', 50);
        }
        result = await translator.translate(content);
      }

      if (onProgress) {
        onProgress('complete', 100);
      }

      console.log(`Translator: Traducción completada exitosamente`);
      return result;

    } catch (error) {
      console.error(`Translator: Error en traducción:`, error);
      this.activeTranslators.delete(requestId);
      throw error;
    }
  }

  async translateStreaming(translator, content, onProgress = null) {
    const stream = translator.translateStreaming(content);
    let translation = "";
    let chunkCount = 0;

    for await (const chunk of stream) {
      translation += chunk;
      chunkCount++;

      if (onProgress && chunkCount % 5 === 0) {
        // Actualizar progreso cada 5 chunks
        onProgress('streaming', Math.min(90, 50 + chunkCount * 2));
      }
    }

    return translation;
  }

  async measureInputUsage(content, sourceLanguage, targetLanguage) {
    try {
      const translator = await Translator.create({
        sourceLanguage,
        targetLanguage
      });

      const usage = await translator.measureInputUsage(content);
      translator.destroy();

      return usage;
    } catch (error) {
      console.error('Translator: Error measuring input usage:', error);
      throw error;
    }
  }

  cancelTranslation(requestId) {
    const translator = this.activeTranslators.get(requestId);
    if (translator && typeof translator.destroy === 'function') {
      translator.destroy();
      this.activeTranslators.delete(requestId);
      console.log(`Translator: Traducción ${requestId} cancelada`);
    }
  }

  getSupportedLanguages() {
    return this.supportedLanguages;
  }

  getLanguageName(code) {
    const lang = this.supportedLanguages.find(l => l.code === code);
    return lang ? lang.name : code;
  }

  getLanguageFlag(code) {
    const lang = this.supportedLanguages.find(l => l.code === code);
    return lang ? lang.flag : '🌐';
  }
}

// Exportar instancia única (inyectar en window para que sea global)
window.translatorService = new TranslatorService();