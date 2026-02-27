// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA5SaxfpAPzbb3E8gSdBoWif5-0zVg77cw",
    authDomain: "security-glass-controle.firebaseapp.com",
    projectId: "security-glass-controle",
    storageBucket: "security-glass-controle.firebasestorage.app",
    messagingSenderId: "195223864994",
    appId: "1:195223864994:web:8226b616d49f5abe28f9fb"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('🔔 Notificação recebida em background:', payload);
    
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: payload.data?.tag || 'security-glass',
        requireInteraction: true,
        vibrate: [200, 100, 200],
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Notificação clicada:', event);
    
    event.notification.close();
    
    // Abrir ou focar no app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Se já tem uma janela aberta, focar nela
            for (const client of clientList) {
                if (client.url.includes('security-glass') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Senão, abrir nova janela
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});
