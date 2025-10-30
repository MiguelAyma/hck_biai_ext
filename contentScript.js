
//function injectImageOverlayStyles() {
function injectImageOverlayStyles() {
  if (document.getElementById('botsi-image-overlay-styles')) return;

  const style = document.createElement('style');
  style.id = 'botsi-image-overlay-styles';
  style.textContent = `
    .botsi-image-wrapper {
      position: relative !important;
      display: inline-block !important;
    }


    .botsi-image-analyze-btn {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      width: 36px !important;
      height: 36px !important;
      border: 1px solid rgba(255, 255, 255, 0.9) !important;
      border-radius: 100% !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 1 !important;
      transition: all 0.2s ease !important;
      z-index: 10000 !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
    }
      
    .botsi-image-analyze-btn:hover {
      transform: scale(1.1) !important;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4) !important;
    }

    .botsi-image-analyze-btn svg {
      width: 20px !important;
      height: 20px !important;
      color: white !important;
    }

    .botsi-image-popup {
      position: fixed !important;
      background: white !important;
      border-radius: 16px !important;
      width: 420px !important;
      max-height: 600px !important;
      overflow: hidden !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05) !important;
      display: flex !important;
      flex-direction: column !important;
      z-index: 999999 !important;
      animation: botsi-popupAppear 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }

    @keyframes botsi-popupAppear {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .botsi-popup-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 16px 20px !important;
      border-bottom: 1px solid #e5e7eb !important;
      background: #fafbfc !important;
    }

    .botsi-popup-title {
      font-size: 15px !important;
      font-weight: 600 !important;
      color: #111827 !important;
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }

    .botsi-popup-title svg {
      width: 18px !important;
      height: 18px !important;
      color: #6366f1 !important;
    }

    .botsi-popup-close {
      width: 28px !important;
      height: 28px !important;
      border: none !important;
      background: #f3f4f6 !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
    }

    .botsi-popup-close:hover {
      background: #e5e7eb !important;
      transform: scale(1.05) !important;
    }

    .botsi-popup-close svg {
      width: 16px !important;
      height: 16px !important;
      color: #6b7280 !important;
    }

    .botsi-popup-content {
      display: flex !important;
      flex-direction: column !important;
      flex: 1 !important;
      overflow: hidden !important;
    }

    .botsi-popup-image-section {
      background: #f9fafb !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 20px !important;
      border-bottom: 1px solid #e5e7eb !important;
      max-height: 280px !important;
    }

    .botsi-popup-image {
      max-width: 100% !important;
      max-height: 240px !important;
      object-fit: contain !important;
      border-radius: 8px !important;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
    }

    .botsi-popup-description-section {
      flex: 1 !important;
      background: white !important;
      overflow-y: auto !important;
      padding: 20px !important;
    }

    .botsi-description-label {
      font-size: 11px !important;
      font-weight: 600 !important;
      text-transform: uppercase !important;
      color: #6b7280 !important;
      letter-spacing: 0.5px !important;
      margin-bottom: 12px !important;
    }

    .botsi-description-text {
      font-size: 14px !important;
      line-height: 1.6 !important;
      color: #374151 !important;
      white-space: pre-wrap !important;
    }

    .botsi-error-text {
      font-size: 14px !important;
      line-height: 1.6 !important;
      color: #dc2626 !important;
      white-space: pre-wrap !important;
    }

    .botsi-token-info {
      font-size: 11px !important;
      color: #6b7280 !important;
      margin-top: 12px !important;
      padding-top: 12px !important;
      border-top: 1px solid #e5e7eb !important;
    }

    .botsi-skeleton {
      animation: botsi-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite !important;
    }

    @keyframes botsi-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .botsi-skeleton-line {
      background: #e5e7eb !important;
      border-radius: 4px !important;
      margin-bottom: 8px !important;
      height: 14px !important;
    }

    .botsi-skeleton-line:last-child {
      width: 70% !important;
    }

    .botsi-popup-description-section::-webkit-scrollbar {
      width: 6px !important;
    }

    .botsi-popup-description-section::-webkit-scrollbar-track {
      background: #f3f4f6 !important;
    }

    .botsi-popup-description-section::-webkit-scrollbar-thumb {
      background: #d1d5db !important;
      border-radius: 3px !important;
    }

    .botsi-popup-description-section::-webkit-scrollbar-thumb:hover {
      background: #9ca3af !important;
    }

    @media (max-width: 768px) {
      .botsi-image-popup {
        width: calc(100vw - 32px) !important;
        max-width: 420px !important;
      }
    }

    .botsi-button-icon {
    width: 24px !important;
    height: 24px !important;
    object-fit: contain !important;
    display: block !important;
}
  `;
  document.head.appendChild(style);
}

// Variable global para mantener la sesión de Gemini Nano
let geminiSession = null; //luego se creara su service

// Inicializar sesión de Gemini Nano
async function initGeminiSession() {
  if (geminiSession) return geminiSession;

  try {
    // Verificar disponibilidad de la API
    if (!self.LanguageModel) {
      throw new Error('La API de Gemini Nano no está disponible en este navegador');
    }

    geminiSession = await self.LanguageModel.create({
      initialPrompts: [{
        role: 'system',
        content: 'Eres un experto en describir imágenes de manera concisa y precisa. Describe lo que ves en la imagen de forma clara y objetiva.'
      }],
      expectedInputs: [{ type: 'image' }]
    });

    // Escuchar evento de desbordamiento
    geminiSession.addEventListener("quotaoverflow", () => {
      console.warn("¡Advertencia! La cuota de la sesión se ha desbordado. Se eliminarán mensajes antiguos.");
    });

    console.log('Sesión de Gemini Nano inicializada correctamente');
    return geminiSession;

  } catch (error) {
    console.error('Error al inicializar Gemini Nano:', error);
    throw error;
  }
}

// Generar descripción de imagen con Gemini Nano
async function generateImageDescription(imageUrl, altText = '') {
  try {
    const session = await initGeminiSession();

    // Cargar la imagen
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    // Crear el prompt con contexto del alt text si existe
    const contextText = altText
      ? `Describe esta imagen en detalle. El texto alternativo de la imagen es: "${altText}"`
      : 'Describe esta imagen en detalle de manera objetiva y precisa.';

    const prompt = [{
      role: 'user',
      content: [
        { type: 'text', value: contextText },
        { type: 'image', value: imageBitmap }
      ]
    }];

    // Medir uso de tokens
    const usage = await session.measureInputUsage(prompt);

    // Generar descripción
    const description = await session.prompt(prompt);
    console.log("description: generada", description);
    return {
      description,
      tokenUsage: usage,
      sessionUsage: session.inputUsage,
      sessionQuota: session.inputQuota
    };

  } catch (error) {
    console.error('Error al generar descripción:', error);
    throw error;
  }
}

// Inyectar botones en imágenes
function injectImageButtons() {
  const images = document.querySelectorAll('img');
  const iconUrl = chrome.runtime.getURL('icon1.png');

  images.forEach((img) => {
    if (
      img.classList.contains('botsi-processed') ||
      img.classList.contains('botsi-popup-image') ||
      img.closest('.botsi-image-popup') ||
      img.width < 100 ||
      img.height < 100
    ) {
      return;
    }

    if (img.parentElement?.classList.contains('botsi-image-wrapper')) {
      return;
    }

    img.classList.add('botsi-processed');

    const wrapper = document.createElement('div');
    wrapper.className = 'botsi-image-wrapper';

    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    const button = document.createElement('button');
    button.className = 'botsi-image-analyze-btn';
    button.innerHTML = `<img src="${iconUrl}" alt="Botsi" class="botsi-button-icon">`;

    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openImageModal(img);
    });

    wrapper.appendChild(button);
  });

  console.log(
    'Botones inyectados en',
    document.querySelectorAll('.botsi-image-analyze-btn').length,
    'imágenes'
  );
}

// Abrir modal cerca de la imagen
async function openImageModal(img) {
  // Calcular posición de la imagen
  const imgRect = img.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const popup = document.createElement('div');
  popup.className = 'botsi-image-popup';

  popup.innerHTML = `
    <div class="botsi-popup-header">
      <div class="botsi-popup-title">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        Análisis de Imagen con Botsi
      </div>
      <button class="botsi-popup-close">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="botsi-popup-content">
      <div class="botsi-popup-image-section">
        <img class="botsi-popup-image" src="${img.src}" alt="${img.alt || 'Imagen'}">
      </div>
      <div class="botsi-popup-description-section">
        <div class="botsi-description-label">Descripción generada por IA</div>
        <div class="botsi-skeleton">
          <div class="botsi-skeleton-line"></div>
          <div class="botsi-skeleton-line"></div>
          <div class="botsi-skeleton-line"></div>
          <div class="botsi-skeleton-line"></div>
          <div class="botsi-skeleton-line"></div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Posicionar el popup cerca de la imagen
  const popupWidth = 420;
  const popupHeight = Math.min(600, viewportHeight - 40);

  let left, top;

  // Intentar posicionar a la derecha de la imagen
  if (imgRect.right + popupWidth + 20 < viewportWidth) {
    left = imgRect.right + 20;
    top = Math.max(20, Math.min(imgRect.top, viewportHeight - popupHeight - 20));
  }
  // Si no cabe a la derecha, intentar a la izquierda
  else if (imgRect.left - popupWidth - 20 > 0) {
    left = imgRect.left - popupWidth - 20;
    top = Math.max(20, Math.min(imgRect.top, viewportHeight - popupHeight - 20));
  }
  // Si no cabe a los lados, centrar horizontalmente
  else {
    left = Math.max(20, (viewportWidth - popupWidth) / 2);
    // Posicionar debajo de la imagen si es posible
    if (imgRect.bottom + popupHeight + 20 < viewportHeight) {
      top = imgRect.bottom + 20;
    } else {
      top = Math.max(20, (viewportHeight - popupHeight) / 2);
    }
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;

  const closePopup = () => {
    popup.style.animation = 'botsi-popupAppear 0.15s cubic-bezier(0.16, 1, 0.3, 1) reverse';
    setTimeout(() => popup.remove(), 150);
  };

  popup.querySelector('.botsi-popup-close').addEventListener('click', closePopup);

  // Cerrar al hacer click fuera del popup
  const handleClickOutside = (e) => {
    if (!popup.contains(e.target)) {
      closePopup();
      document.removeEventListener('click', handleClickOutside);
    }
  };

  // Agregar listener después de un pequeño delay para evitar que se cierre inmediatamente
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 100);

  // Generar descripción con Gemini Nano
  try {
    const result = await generateImageDescription(img.src, img.alt);

    const descriptionSection = popup.querySelector('.botsi-popup-description-section');
    if (descriptionSection) {
      descriptionSection.innerHTML = `
        <div class="botsi-description-label">Descripción:</div>
        <div class="botsi-description-text">${result.description}</div>
        ${img.alt ? `<div class="botsi-description-text" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 13px;"><b>Texto alternativo original:</b> "${img.alt}"</div>` : ''}
        <div class="botsi-token-info">
          Tokens usados: <b>${result.tokenUsage}</b> | 
          Cuota de sesión: <b>${result.sessionUsage} / ${result.sessionQuota}</b>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error al analizar imagen:', error);
    const descriptionSection = popup.querySelector('.botsi-popup-description-section');
    if (descriptionSection) {
      descriptionSection.innerHTML = `
        <div class="botsi-description-label">Error al generar descripción</div>
        <div class="botsi-error-text">
          No se pudo generar la descripción de la imagen. 
          ${error.message.includes('no está disponible')
          ? 'Asegúrate de estar usando Chrome/Edge Canary con la API de Gemini Nano habilitada.'
          : `Error: ${error.message}`}
        </div>
        ${img.alt ? `<div class="botsi-description-text" style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;"><b>Texto alternativo:</b> "${img.alt}"</div>` : ''}
      `;
    }
  }
}

// Limpiar sesión cuando se cierra/recarga la página
window.addEventListener('beforeunload', async () => {
  if (geminiSession) {
    try {
      await geminiSession.destroy();
      console.log('Sesión de Gemini Nano destruida correctamente');
    } catch (error) {
      console.error('Error al destruir sesión:', error);
    }
  }
});

// Inicializar sistema de imágenes
function initImageOverlay() {
  injectImageOverlayStyles();
  setTimeout(() => {
    injectImageButtons();
  }, 1000);

  const observer = new MutationObserver(() => {
    setTimeout(injectImageButtons, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Ejecutar después de que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImageOverlay);
} else {
  initImageOverlay();
}

// FIN SISTEMA DE OVERLAY PARA IMAGENES
// ========================================

let isChatOpen = false;
// Inyectar estilos al buton flotante
function injectStyles() {
  if (document.getElementById('botsi-styles')) return;

  const styles = `
    /* Botón Flotante estilo "oreja" */
    #botsi-floating-button {
      position: fixed;
      top: 50%;
      right: -20px;
      transform: translateY(-50%);
      width: 50px;
      height: 80px;
      background-color: black;
      border-radius: 20px 0 0 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999998;
      box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
      border: none;
      transition: all 0.3s ease;
      padding: 0;
      font-size: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      opacity: 1;
      pointer-events: auto;
    }

    #botsi-floating-button.hidden {
      opacity: 0;
      pointer-events: none;
      transform: translateY(-50%) translateX(30px);
    }

    #botsi-floating-button:hover {
      width: 55px;
      box-shadow: -6px 0 20px rgba(0, 0, 0, 0.25);
    }

    #botsi-floating-button:active {
      width: 50px;
    }

    #botsi-floating-button img {
      width: 24px;
      height: 24px;
      object-fit: contain;
      margin-right: 8px;
    }

    /* Badge de Notificación */
    #botsi-notification-badge {
      position: absolute;
      top: 8px;
      left: 5px;
      min-width: 20px;
      height: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      color: white;
      padding: 0 6px;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      animation: notificationPulse 2s ease-in-out infinite;
      z-index: 1;
    }

    @keyframes notificationPulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
      }
      50% {
        transform: scale(1.1);
        box-shadow: 0 2px 12px rgba(102, 126, 234, 0.6);
      }
    }

    /* Diferentes colores para cada tipo de notificación */
    #botsi-notification-badge.chat {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    #botsi-notification-badge.markdown {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    #botsi-notification-badge.summaries {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    #botsi-notification-badge.investigation {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
    }

    /* Animación de entrada del badge */
    @keyframes badgeIn {
      from {
        opacity: 0;
        transform: scale(0.5);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    /* Contenedor del Chat */
    #botsi-container {
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    #botsi-container.closing {
      animation: slideDown 0.3s ease-out forwards;
    }

    @keyframes slideDown {
      from {
        opacity: 1;
        transform: translateY(0);
      }
      to {
        opacity: 0;
        transform: translateY(20px);
      }
    }

    @keyframes pulse {
      0%, 100% {
        box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
      }
      50% {
        box-shadow: -4px 0 20px rgba(102, 126, 234, 0.4);
      }
    }

    #botsi-floating-button.pulse {
      animation: pulse 2s infinite;
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.id = 'botsi-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}

// Crear botón flotante
function createFloatingButton() {
  if (document.getElementById('botsi-floating-button')) return;

  injectStyles();

  const button = document.createElement('button');
  button.id = 'botsi-floating-button';
  button.title = 'Abrir Botsi Chat';
  button.setAttribute('aria-label', 'Abrir Botsi Chat');

  const iconUrl = chrome.runtime.getURL('icon1.png');
  button.innerHTML = `<img src="${iconUrl}" alt="Botsi">`;

  button.addEventListener('click', () => {
    toggleChat('floatingButton');
  });

  if (document.body) {
    document.body.appendChild(button);
    // Cargar notificaciones al crear el botón
    loadNotifications();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      if (document.body) {
        document.body.appendChild(button);
        loadNotifications();
      }
    });
  }
}

// Cargar y mostrar notificaciones
async function loadNotifications() {
  try {
    const result = await chrome.storage.local.get('botsi_notifications');
    const notifications = result.botsi_notifications || [];
    updateNotificationBadge(notifications);
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

// Actualizar el badge de notificación
function updateNotificationBadge(notifications) {
  const button = document.getElementById('botsi-floating-button');
  if (!button) return;

  // Remover badge existente
  const existingBadge = document.getElementById('botsi-notification-badge');
  if (existingBadge) {
    existingBadge.remove();
  }

  // Calcular total de notificaciones
  const totalCount = notifications.reduce((sum, n) => sum + n.count, 0);

  if (totalCount > 0) {
    const badge = document.createElement('div');
    badge.id = 'botsi-notification-badge';
    badge.className = 'new';

    // Determinar el tipo principal de notificación (la más reciente)
    const latestNotification = notifications.sort((a, b) => b.timestamp - a.timestamp)[0];
    badge.classList.add(latestNotification.view);

    // Mostrar el número o un indicador
    badge.textContent = totalCount > 99 ? '99+' : totalCount.toString();

    button.appendChild(badge);

    // Remover clase 'new' después de la animación
    setTimeout(() => {
      badge.classList.remove('new');
    }, 300);
  }
}

// Alternar chat abierto/cerrado
function toggleChat(source) {
  if (isChatOpen) {
    closeChat();
  } else {
    openChat();
  }
}

// Abrir chat
function openChat() {
  if (isChatOpen) return;

  const iframe = document.createElement('iframe');
  iframe.id = 'botsi-container';
  iframe.src = chrome.runtime.getURL('popup.html');
  iframe.style.position = 'fixed';
  iframe.style.bottom = '20px';
  iframe.style.right = '20px';
  iframe.style.width = '420px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '999999';
  iframe.style.borderRadius = '12px';
  iframe.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
  iframe.style.background = 'white';
  iframe.style.overflow = 'hidden';
  iframe.allow = "attribution-reporting *; private-state-token-redemption *; private-state-token-issuance *";

  document.body.appendChild(iframe);
  isChatOpen = true;

  const floatingButton = document.getElementById('botsi-floating-button');
  if (floatingButton) {
    floatingButton.classList.add('hidden');
  }

  chrome.runtime.sendMessage({
    action: 'updateChatState',
    state: 'open'
  }).catch(() => { });
}

// Cerrar chat
function closeChat() {
  const iframe = document.getElementById('botsi-container');
  if (!iframe) {
    isChatOpen = false;
    return;
  }

  iframe.classList.add('closing');

  const floatingButton = document.getElementById('botsi-floating-button');
  if (floatingButton) {
    floatingButton.classList.remove('hidden');
  }

  setTimeout(() => {
    iframe.remove();
    isChatOpen = false;

    chrome.runtime.sendMessage({
      action: 'updateChatState',
      state: 'closed'
    }).catch(() => { });
  }, 300);
}

// Escuchar mensajes del background
//contentScript.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleChat') {
    toggleChat(message.source);
    sendResponse({ success: true });
  }
  if (message.action === 'closeChat') {
    closeChat();
    sendResponse({ success: true });
  }
  if (message.action === 'updateNotifications') {
    updateNotificationBadge(message.notifications);
    sendResponse({ success: true });
  }

  //INICIO GEMINI NANO - Manejar peticiones de resumen con Gemini Nano
  if (message.action === 'generateSummary') {
    (async () => {
      try {
        const { content, length, requestId } = message;

        if (!window.geminiService) {
          throw new Error('Gemini Service no está disponible');
        }

        const summary = await window.geminiService.generateSummary(content, length, requestId);

        sendResponse({ success: true, summary });
      } catch (error) {
        console.error('Error generando resumen:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Indica respuesta asíncrona
  }

  // Verificar disponibilidad de Gemini
  // if (message.action === 'checkGeminiAvailability') {
  //   (async () => {
  //     try {
  //       const available = window.geminiService
  //         ? await window.geminiService.isAvailable()
  //         : false;

  //       sendResponse({ success: true, available });
  //     } catch (error) {
  //       sendResponse({ success: false, available: false });
  //     }
  //   })();

  //   return true;
  // }
});

// Escuchar mensajes del iframe (postMessage)
window.addEventListener('message', (event) => {
  if (event.data.action === 'closeChat') {
    closeChat();
  }

  // Manejar petición de resumen desde el iframe(desde el componente summariesView.svelte)
  if (event.data.action === 'requestSummary') {
    (async () => {
      const { content, length, requestId } = event.data;

      try {

        //verificamos si geminiService está disponible(inyectado en window por background.js)
        if (!window.geminiService) {
          throw new Error('Gemini Service no está disponible');
        }

        //generamos el resumen llamando al método generateSummary del geminiService
        console.log('Generando resumen...content:', content);
        const summary = await window.geminiService.generateSummary(content, length, requestId);

        // Enviar resultado al iframe
        const iframe = document.getElementById('botsi-container');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'summaryComplete',
            requestId,
            summary,
            length
          }, '*');
        }

        // También notificar al background para manejar notificaciones
        chrome.runtime.sendMessage({
          command: 'summaryComplete',
          requestId,
          length,
          summary
        }).catch(() => { });

      } catch (error) {
        console.error('Error generando resumen:', error);

        // Enviar error al iframe
        const iframe = document.getElementById('botsi-container');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'summaryError',
            requestId,
            error: error.message,
            length
          }, '*');
        }
      }
    })();
  }
  //FIN GEMINI NANO
  //INICIO TRANSLATOR - Manejar peticiones de traducción desde el iframe
  if (event.data.action === 'requestTranslation') {
    (async () => {
      const { content, sourceLanguage, targetLanguage, requestId, streaming } = event.data;

      try {
        // Verificar si translatorService está disponible
        if (!window.translatorService) {
          throw new Error('Translator Service no está disponible');
        }

        console.log(`ContentScript: Iniciando traducción ${sourceLanguage} -> ${targetLanguage}`);

        // Función callback para reportar progreso
        const onProgress = (status, progress) => {
          const iframe = document.getElementById('botsi-container');
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              action: 'translationProgress',
              requestId,
              status,
              progress
            }, '*');
          }
        };

        // Generar traducción usando el translatorService
        const translation = await window.translatorService.translate(
          content,
          sourceLanguage,
          targetLanguage,
          requestId,
          streaming || false,
          onProgress
        );

        // Enviar resultado al iframe
        const iframe = document.getElementById('botsi-container');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'translationComplete',
            requestId,
            translation,
            sourceLanguage,
            targetLanguage
          }, '*');
        }

      } catch (error) {
        console.error('Error generando traducción:', error);

        // Enviar error al iframe
        const iframe = document.getElementById('botsi-container');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'translationError',
            requestId,
            error: error.message
          }, '*');
        }
      }
    })();
  }

  // Verificar disponibilidad del servicio de traducción
  if (event.data.action === 'checkTranslatorAvailability') {
    (async () => {
      const { sourceLanguage, targetLanguage, requestId } = event.data;

      try {
        if (!window.translatorService) {
          throw new Error('Translator Service no está disponible');
        }

        const availability = await window.translatorService.checkAvailability(
          sourceLanguage,
          targetLanguage
        );

        const iframe = document.getElementById('botsi-container');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'translatorAvailabilityResult',
            requestId,
            availability,
            sourceLanguage,
            targetLanguage
          }, '*');
        }

      } catch (error) {
        console.error('Error verificando disponibilidad:', error);

        const iframe = document.getElementById('botsi-container');
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            action: 'translatorAvailabilityResult',
            requestId,
            availability: 'no',
            error: error.message
          }, '*');
        }
      }
    })();
  }

  // Obtener idiomas soportados
  if (event.data.action === 'getSupportedLanguages') {
    const iframe = document.getElementById('botsi-container');
    if (iframe && iframe.contentWindow) {
      const languages = window.translatorService
        ? window.translatorService.getSupportedLanguages()
        : [];

      iframe.contentWindow.postMessage({
        action: 'supportedLanguagesResult',
        languages
      }, '*');
    }
  }
  //FIN TRANSLATOR
});



// Escuchar mensajes del iframe (postMessage) OTRAS FUNCIONES QUE NO TIENEN QUE VER CON GEMINI NANO
window.addEventListener('message', (event) => {
  if (event.data.action === 'closeChat') {
    closeChat();
  }
});

// Inicializar cuando el documento esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    createFloatingButton();
  });
} else {
  createFloatingButton();
}
