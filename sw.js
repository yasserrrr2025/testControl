
const CACHE_NAME = 'exams-v1';
const ASSETS = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// دعم الإشعارات عندما يكون التطبيق في الخلفية أو مغلقاً
self.addEventListener('push', function(event) {
  let data = { title: 'تنبيه الكنترول المركزي', body: 'يوجد تحديث جديد في النظام الميداني.' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: 'https://www.raed.net/img?id=1488645',
    badge: 'https://www.raed.net/img?id=1488645',
    vibrate: [300, 100, 300, 100, 300],
    data: {
      url: '/'
    },
    actions: [
      { action: 'open', title: 'فتح التطبيق' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) { client = clientList[i]; }
        }
        return client.focus();
      }
      return clients.openWindow('/');
    })
  );
});
