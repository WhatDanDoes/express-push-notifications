/**
 * `self` is an instance of `ServiceWorkerGlobalScope`
 *
 */
console.log('Hello! From worker.js');
console.log(self);

self.addEventListener('push', ev => {
  console.log('worker.js: Incoming message...');
  const data = ev.data.json();
  console.log(JSON.stringify(data));
  self.registration.showNotification(data.title, {
    body: 'Hello, World!',
    icon: 'http://mongoosejs.com/docs/images/mongoose5_62x30_transparent.png'
  });
});
