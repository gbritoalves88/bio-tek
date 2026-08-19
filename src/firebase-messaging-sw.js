importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDJ3pK-rjBaLHNwR4abNXUGJO08gZHd78k",
  authDomain: "bliteca.firebaseapp.com",
  projectId: "bliteca",
  storageBucket: "bliteca.firebasestorage.app",
  messagingSenderId: "672632714788",
  appId: "1:672632714788:web:d638223f9f614b68500ab1",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Recebido em background:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: 'assets/icons/icon-192x192.png',
    badge: 'assets/icons/icon-96x96.png',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Verifica se já existe uma janela aberta
      for (let client of windowClients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Abre nova janela se não existir
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
