const makeServiceWorkerEnv = require('service-worker-mock');
const makeFetchMock = require('service-worker-mock/fetch');
const path = require('path');

describe('serviceWorker', () => {
  beforeEach(() => {
    Object.assign(
      global,
      makeServiceWorkerEnv(),
//      makeFetchMock(),
      // If you're using sinon ur similar you'd probably use below instead of makeFetchMock
      // fetch: sinon.stub().returns(Promise.resolve())
    );
  });

  afterEach(() => {
    delete require.cache[path.resolve('./public/javascripts/service-worker.js')];
  });

  it('should add listeners', () => {
    require('../public/javascripts/service-worker.js');
    expect(self.listeners.has('install')).toBe(true);
    expect(self.listeners.has('activate')).toBe(true);
    expect(self.listeners.has('fetch')).toBe(true);
  });

  it('should delete old caches on activate', async done => {
    require('../public/javascripts/service-worker.js');

    // Create old cache
    await self.caches.open('OLD_CACHE');
    expect(self.snapshot().caches.OLD_CACHE).toBeDefined();

    // Activate and verify old cache is removed
    await self.trigger('activate');

    setTimeout(() => {
      expect(self.snapshot().caches.OLD_CACHE).toBeUndefined();
      done();
    }, 200);
  });
});
