// Handles push notifications when the app/browser tab isn't open. This file must live at the site
// root (not under /src) so it can control the whole origin, per Firebase Cloud Messaging's own
// requirement. Purely additive — nothing else in the app references or depends on this file.
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// These are the same public Firebase client config values already used in src/firebase/firebase.js
// (not secrets — protected by Firestore/Storage security rules, not by hiding them). A service
// worker is a separate static file the bundler doesn't process, so it can't read import.meta.env.
firebase.initializeApp({
  apiKey: 'AIzaSyDAA2OqR4SegocUia51k1jWY313q70kXL8',
  authDomain: 'aarogyasandesh-1e4b8.firebaseapp.com',
  projectId: 'aarogyasandesh-1e4b8',
  storageBucket: 'aarogyasandesh-1e4b8.firebasestorage.app',
  messagingSenderId: '403782107693',
  appId: '1:403782107693:web:befb59792be1664c08eea4'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'AarogyaSandesh';
  const options = {
    body: payload.notification?.body || payload.data?.body || '',
    icon: '/src/assets/Logo.png',
    badge: '/src/assets/Logo.png',
    data: payload.data || {}
  };
  self.registration.showNotification(title, options);
});
