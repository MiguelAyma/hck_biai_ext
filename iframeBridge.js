// iframeBridge.js - Ponte de comunicación entre iframe y content script
// Agregar esto al inicio de tu popup.html antes de ./src/main.js

window.addEventListener('message', (event) => {
  // Solo aceptar mensajes del mismo origen (la extensión)
  if (event.data.action === 'closeChat') {
    const iframe = document.getElementById('botsi-container');
    if (iframe) {
      iframe.classList.add('closing');
      setTimeout(() => {
        iframe.remove();
      }, 300);
    }
  }
});