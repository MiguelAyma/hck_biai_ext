chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      floatingButtonEnabled: true,
      chatMessages: [],
      botsi_notifications: []
    });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['contentScript.js']
  }).catch(() => { });

  setTimeout(() => {
    chrome.tabs.sendMessage(tab.id, {
      action: 'toggleChat',
      source: 'extensionIcon'
    }).catch(err => console.log('Error:', err));
  }, 50);
});

// Función que genera la respuesta simulaxcion respuesta del bot
function generateBotResponse(userMessage) {
  const responses = [
    "Basándome en el contenido, puedo decirte que este artículo trata principalmente sobre desarrollo web y tecnología.",
    "Interesante pregunta. El contenido menciona varios puntos importantes sobre este tema.",
    "Según lo que he analizado, la página contiene información relevante sobre frameworks modernos.",
    "He revisado el contenido y encontré varios detalles importantes relacionados con tu consulta.",
    "Esa es una buena pregunta. Déjame explicarte lo que encontré en la página sobre ese tema.",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// Función que simula la generacion de contenido con gemini nano para el view de contenido 
//background.js
function generateAiAnalysis(content) {
  const analyses = [
    `
Este contenido presenta información clave sobre desarrollo web moderno y tecnologías emergentes.

## Puntos Principales

- **Arquitectura**: El documento describe una arquitectura basada en componentes
- **Tecnologías**: Se mencionan frameworks modernos como React, Vue y Svelte
- **Buenas Prácticas**: Incluye recomendaciones sobre optimización y rendimiento

##Insights Clave

El análisis revela que el contenido está orientado a desarrolladores con experiencia intermedia-avanzada. Las técnicas descritas son aplicables a proyectos de mediana y gran escala.

##Recomendaciones

1. Implementar las prácticas sugeridas gradualmente
2. Realizar pruebas exhaustivas antes de producción
3. Documentar los cambios realizados`,

    `## Análisis de Contenido

He procesado el contenido y encontré información valiosa sobre desarrollo de software.

## Temas Identificados

- Patrones de diseño
- Gestión de estado
- Optimización de rendimiento
- Arquitectura escalable`
  ];

  return analyses[Math.floor(Math.random() * analyses.length)];
}

// Función para agregar notificación
async function addNotification(view, data) {
  const result = await chrome.storage.local.get('botsi_notifications');
  let notifications = result.botsi_notifications || [];

  // Buscar si ya existe una notificación para este view
  const existingIndex = notifications.findIndex(n => n.view === view);

  if (existingIndex !== -1) {
    // Incrementar el contador
    notifications[existingIndex].count++;
    notifications[existingIndex].timestamp = Date.now();
    if (data) {
      notifications[existingIndex].data = data;
    }
  } else {
    // Crear nueva notificación
    notifications.push({
      id: `${view}_${Date.now()}`,
      view,
      count: 1,
      timestamp: Date.now(),
      data
    });
  }

  await chrome.storage.local.set({ botsi_notifications: notifications });
  return notifications;
}

// Función para verificar si el popup está abierto
async function isPopupOpen() {
  try {
    const views = chrome.extension.getViews({ type: 'popup' });
    return views.length > 0;
  } catch {
    return false;
  }
}

// Función para notificar a todos los tabs sobre cambios en notificaciones
async function notifyAllTabs(notifications) {
  try {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'updateNotifications',
          notifications: notifications
        }).catch(() => { });
      }
    });
  } catch (error) {
    console.error('Error notifying tabs:', error);
  }
}

// Escuchar mensajes desde la UI (Svelte) y Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // ========================================
  //INICIO DE SIMULACION EN SEGUNDO PLANO DE GENERACION DE CONTENIDO PARA LA VIEW DE content
  // ========================================
  if (message.command === 'startAiAnalysis') {
    const { content, requestId } = message;

    console.log(`Service Worker: Análisis de IA iniciado para requestId: ${requestId}`);
    console.log(`Simulando análisis de contenido (5 segundos)...`);

    // Simulamos un proceso de análisis (5 segundos)
    setTimeout(async () => {
      console.log("Service Worker: ¡Análisis de IA COMPLETADO!");

      // 1. Generar análisis de IA
      const aiAnalysis = generateAiAnalysis(content);

      // 2. Guardar en storage
      await chrome.storage.local.set({ aiAnalysisCache: aiAnalysis });

      // 3. Verificar si el popup está cerrado para mostrar notificación
      const popupOpen = await isPopupOpen();

      if (!popupOpen) {
        console.log("Popup cerrado - Creando notificación para análisis IA");

        // Agregar notificación
        const notifications = await addNotification('markdown', {
          message: 'Análisis de IA completado',
          timestamp: Date.now()
        });

        // Enviar notificación a todos los tabs
        await notifyAllTabs(notifications);
      } else {
        console.log("Popup abierto - No se crea notificación");
      }

      // 4. Notificar a la UI que el análisis terminó
      chrome.runtime.sendMessage({
        command: 'aiAnalysisComplete',
        aiContent: aiAnalysis,
        requestId: requestId
      }).catch(() => {
        console.log("UI no está abierta para recibir la actualización");
      });

    }, 5000); // 5 segundos de simulación

    sendResponse({ success: true, message: 'Análisis iniciado' });
    return true;
  }
  //FIN AI SIMULACION

  // ========================================
  //INICIO DE GENERACION DE RESUMEN CON GEMINI NANO
  // ========================================
  if (message.command === 'summaryComplete') {
    (async () => {
      const { requestId, length, summary } = message;

      console.log(`Service Worker: Resumen ${length} completado (ID: ${requestId})`);

      // Verificar si el popup está cerrado para mostrar notificación
      const popupOpen = await isPopupOpen();

      if (!popupOpen) {
        console.log("Popup cerrado - Creando notificación para resumen");

        // Agregar notificación
        const notifications = await addNotification('summaries', {
          message: `Resumen ${length} completado`,
          length: length,
          timestamp: Date.now()
        });

        // Enviar notificación a todos los tabs
        await notifyAllTabs(notifications);
      } else {
        console.log("Popup abierto - No se crea notificación");
      }

      sendResponse({ success: true });
    })();

    return true;
  }

  // ========================================
  // PROCESO DEL BOT (SIMULACIÓN DE CHAT AI)
  // ========================================
  if (message.command === 'startBotProcess') {
    const { userMessage, placeholderId } = message;

    console.log(`Service Worker: Proceso iniciado para el mensaje: "${userMessage}"`);
    console.log(`Simulando procesamiento de AI (10 segundos)...`);

    // Simulamos un proceso largo (ej. 10 segundos)
    // Este timeout mantiene el Service Worker vivo durante el procesamiento
    setTimeout(async () => {
      console.log(" Service Worker: ¡Proceso de AI COMPLETADO!");

      // 1. Generamos la respuesta final del bot
      const botResponseText = generateBotResponse(userMessage);
      const finalBotMessage = {
        id: placeholderId,
        text: botResponseText,
        type: 'bot'
      };

      // 2. Actualizamos el historial de mensajes en storage
      let { chatMessages } = await chrome.storage.local.get('chatMessages');

      // Reemplazamos el placeholder "..." con la respuesta final
      const updatedMessages = chatMessages.map(msg =>
        msg.id === placeholderId ? finalBotMessage : msg
      );

      await chrome.storage.local.set({ chatMessages: updatedMessages });

      // 3. Verificar si el popup está cerrado para mostrar notificación
      const popupOpen = await isPopupOpen();

      if (!popupOpen) {
        console.log("Popup cerrado - Creando notificación");

        // Agregar notificación solo si el popup está cerrado
        const notifications = await addNotification('chat', {
          message: botResponseText,
          messageId: placeholderId
        });

        // Enviar notificación a todos los tabs con content script
        await notifyAllTabs(notifications);
      } else {
        console.log("Popup abierto - No se crea notificación");
      }

      // 4. Notificar a la UI (si está abierta) que el proceso terminó
      chrome.runtime.sendMessage({
        command: 'botProcessComplete',
        updatedMessages: updatedMessages
      }).catch(() => {
        console.log("no está abierta para recibir la actualización");
      });

    }, 5000); // 10 segundos de simulación

    // Respondemos inmediatamente para mantener el canal abierto
    sendResponse({ success: true, message: 'Proceso iniciado' });
    return true; // Indica que la respuesta será asíncrona
  }

  // ========================================
  // LIMPIAR NOTIFICACIONES DE UN VIEW
  // ========================================
  if (message.command === 'clearNotifications') {
    (async () => {
      try {
        const result = await chrome.storage.local.get('botsi_notifications');
        let notifications = result.botsi_notifications || [];

        // Filtrar notificaciones del view especificado
        notifications = notifications.filter(n => n.view !== message.view);

        await chrome.storage.local.set({ botsi_notifications: notifications });

        // Notificar a todos los tabs
        await notifyAllTabs(notifications);

        console.log(`Notificaciones limpiadas para view: ${message.view}`);
        sendResponse({ success: true });
      } catch (error) {
        console.error('Error clearing notifications:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true; // Indica que la respuesta será asíncrona
  }

  // ========================================
  // ACTUALIZAR ESTADO DEL CHAT
  // ========================================
  if (message.action === 'updateChatState') {
    console.log(`Estado del chat: ${message.state}`);
    sendResponse({ success: true });
    return true;
  }

  // ========================================
  // OBTENER NOTIFICACIONES ACTUALES
  // ========================================
  if (message.command === 'getNotifications') {
    (async () => {
      try {
        const result = await chrome.storage.local.get('botsi_notifications');
        const notifications = result.botsi_notifications || [];
        sendResponse({ success: true, notifications });
      } catch (error) {
        console.error('Error getting notifications:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();

    return true;
  }
});

// ========================================
// MANTENER EL SERVICE WORKER VIVO
// ========================================
// Opcional: Si necesitas mantener el service worker activo por más tiempo
let keepAliveInterval;

chrome.runtime.onStartup.addListener(() => {
  console.log("Service Worker iniciado");
});

// Limpiar interval cuando sea necesario
chrome.runtime.onSuspend.addListener(() => {
  console.log("Service Worker suspendido");
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
});