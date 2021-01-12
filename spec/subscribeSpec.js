//const path = require('path');
const atob = require('atob');
const request = require('supertest');
const Browser = require('zombie');
const webpush = require('web-push');
const conversions = require("webidl-conversions");

const makeServiceWorkerEnv = require('service-worker-mock');


const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001;
Browser.localhost('example.com', PORT);
const app = require('../app');

/**
 * 2021-1-11
 *
 * https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
 *
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

describe('subscribeSpec', () => {

  describe('api', () => {

    let subscription;
    beforeEach(() => {
      subscription = {
        userVisibleOnly: true,
        // The `urlBase64ToUint8Array()` function is the same as in
        // https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
        applicationServerKey: urlBase64ToUint8Array(process.env.PUBLIC_VAPID_KEY),
        endpoint: conversions['USVString']('https://some-fully-qualified-url.com'),

        // Most of this won't be coming from the browser... how does it work? Stay tuned...
        keys: {
          p256dh: process.env.PUBLIC_VAPID_KEY,
          auth: process.env.PRIVATE_VAPID_KEY,
        }
      };
    });

    it('returns 201 with JSON', done => {
      request(app)
        .post('/subscribe')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) return done.fail(err);
          expect(res.body.messages.info).toEqual('Waiting for subscription confirmation...');
          done();
        });
    });

    it('calls the webpush.sendNotification method', done => {
      spyOn(webpush, 'sendNotification').and.callThrough();
      expect(webpush.sendNotification).not.toHaveBeenCalled();
      request(app)
        .post('/subscribe')
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) return done.fail(err);
          expect(webpush.sendNotification).toHaveBeenCalled();
          done();
        });
    });

    it('immediately sends a successful subscribed notification', done => {
//      request(app)
//        .get('/subscribe')
//        .set('Accept', 'application/json')
//        .expect('Content-Type', /json/)
//        .expect(201)
//        .end((err, res) => {
//          if (err) return done.fail(err);
          done.fail();
//        });
    });

    /**
     * Since the HTTP response is received before the subscription confirmation
     * notification, there is necessarily an uncaught error.
     *
     * All this to ensure the `webpush.sendNotification` is called with the correct
     * parameters. If something is out of whack, error is thrown.
     *
     */
    it('doesn\'t throw an exception', done => {
      try {
        request(app)
          .post('/subscribe')
          .send({...subscription})
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) return done.fail(err);
            done();
          });
      }
      catch (err) {
        done.fail('There should be no exception here', err);
      }
    });
  });

  fdescribe('browser', () => {
    let browser;

//    beforeEach(done => {
//      browser = new Browser({ waitDuration: '30s', loadCss: false });
//
//      browser.visit('/', err => {
//        if (err) return done.fail(err);
//        done();
//      });
//    });

    beforeEach(done => {
//      Object.assign(
//        global,
//        makeServiceWorkerEnv(),
//  //      makeFetchMock(),
//        // If you're using sinon ur similar you'd probably use below instead of makeFetchMock
//        // fetch: sinon.stub().returns(Promise.resolve())
//      );

      browser = new Browser({ waitDuration: '30s', loadCss: false });

      const workerEnv = makeServiceWorkerEnv();
console.log(workerEnv);


      browser.visit('/', err => {
      browser._eventLoop.active.navigator.serviceWorker = 'What should this be?';
console.log('browser---------');
console.log(browser._eventLoop.active.navigator);

        if (err) return done.fail(err);
        done();
      });
    });

    afterEach(() => {
//      delete require.cache[path.resolve('./public/worker.js')];
    });


    describe('subscribing to notifications', () => {

      describe('successfully', () => {

        it('lands in the right place', done => {
          browser.pressButton('#subscribe-button').then(() => {
            browser.assert.url({ pathname: '/' });
            done();
          }).catch(err => {
            done.fail(err);
          });
        });

        it('shows a waiting-for-confirmation message', done => {
          browser.pressButton('#subscribe-button').then(() => {
            browser.assert.text('.alert.alert-info', 'Waiting for subscription confirmation...');
            done();
          }).catch(err => {
            done.fail(err);
          });
        });
      });
    });
  });
});