require('dotenv').config();
const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001;
//const path = require('path');
const atob = require('atob');
const request = require('supertest');
const webpush = require('web-push');
const conversions = require('webidl-conversions');
const frisby = require('frisby');

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

const APP_URL = `http://localhost:${PORT}`

describe('subscribe', () => {


  /**
   * 2021-1-18
   *
   * Regretably, headless puppeteer does not work the same as the _headful_
   * execution. If executing in a browser, you can't see the `console.log`
   * stuff. Uncomment the following to have the browser console relayed on
   * `stdout`.
   */
  beforeAll(() => {
    // 2021-1-13 https://stackoverflow.com/a/56275297/1356582
    // Get output from browser console.log
    page.on('console', consoleObj => console.log(consoleObj.text()));
  });

  afterAll(done => {
    app.close(done);
  });

  afterEach(() => {
    // Subtle difference here...
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('api', () => {

    let subscription;
    beforeEach(() => {
      subscription = {
        userVisibleOnly: true,
        // The `urlBase64ToUint8Array()` function is the same as in
        // https://www.npmjs.com/package/web-push#using-vapid-key-for-applicationserverkey
        applicationServerKey: urlBase64ToUint8Array(process.env.PUBLIC_VAPID_KEY),
        endpoint: conversions['USVString']('https://fake.push.service'),

        // Most of this won't be coming from the browser... how does it work? Stay tuned...
        keys: {
          p256dh: process.env.PUBLIC_VAPID_KEY,
          auth: process.env.PRIVATE_VAPID_KEY,
        }
      };



    });

    it('returns 201 with JSON', done => {
      jest.spyOn(webpush, 'sendNotification').mockImplementation(() => new Promise(resolve => resolve({message: 'What happens on success from this mock?'})));

      frisby
        .post(`${APP_URL}/subscribe`, {...subscription})
        .setup({
          request: {
            headers: {
              'Accept': 'application/json'
            }
          }
        })
        .expect('header', 'Content-Type', /json/)
        .expect('status', 201)
        .then(res => JSON.parse(res.body))
        .then(body => {
          expect(body.messages.info.length).toEqual(1);
          expect(body.messages.info[0]).toEqual('Waiting for subscription confirmation...');
          done();
        }).catch(err => {
          done(err);
        });
    });

//    it('immediately sends a successful subscribed notification', done => {
////      request(app)
////        .get('/subscribe')
////        .set('Accept', 'application/json')
////        .expect('Content-Type', /json/)
////        .expect(201)
////        .end((err, res) => {
////          if (err) return done.fail(err);
//          done.fail();
////        });
//    });

    /**
     * Since the HTTP response is received before the subscription confirmation
     * notification, there is necessarily an uncaught error.
     *
     * All this to ensure the `webpush.sendNotification` is called with the correct
     * parameters. If something is out of whack, error is thrown.
     *
     */
//    it('does a dns lookup on endpoint', done => {
//console.log('TEST STARTED');
//console.log(app.status);
//      const dns = require('dns');
//      const dnsSpy = jest.spyOn(dns, 'lookup')
//        .mockImplementation((addr, options, done) => {
//          console.log('dns.lookup', addr, options, done);
//          if (addr === 'localhost') {
//            done(null, '127.0.0.1', 4);
//          }
//          else if (addr === 'fake.push.service') {
//            done(null, '127.0.0.1', 4);
//          }
//        });
//
//      frisby
//        .post(`${APP_URL}/subscribe`, {...subscription})
//        .setup({
//          request: {
//            headers: {
//              'Accept': 'application/json'
//            }
//          }
//        })
//        .expect('header', 'Content-Type', /json/)
//        .expect('status', 201)
//        .then(res => JSON.parse(res.body))
//        .then(body => {
//          expect(dnsSpy).toBeCalled();
//          expect(body.messages.info[0]).toEqual('Waiting for subscription confirmation...');
////          done();
//        }).catch(err => {
//          done(err);
//        });
//
//    });

    it('calls the webpush.sendNotification method', done => {
      const sendPushMessageSpy = jest.spyOn(webpush, 'sendNotification')
        .mockImplementation((subscription, payload) => {
          return new Promise(resolve =>  {
            resolve({message: 'What happens on success from the spy?'});
          });
        });

      frisby
        .post(`${APP_URL}/subscribe`, {...subscription})
        .setup({
          request: {
            headers: {
              'Accept': 'application/json'
            }
          }
        })
        .expect('header', 'Content-Type', /json/)
        .expect('status', 201)
        .then(res => JSON.parse(res.body))
        .then(body => {
          expect(sendPushMessageSpy).toBeCalled();
          done();
        }).catch(err => {
          done(err);
        });
    });

    it('calls the browser subscribe endpoint', done => {
      let endpointHit = false;

      const rest = require('msw').rest;
      const setupServer = require('msw/node').setupServer;
      const server = setupServer(
        // Describe the requests to mock.
        rest.post('http://fake.push.service', (req, res, ctx) => {
          endpointHit = true;
          console.log("ENDPOINT HIT");
          console.log(res);

          return res(
            ctx.status(201),
            ctx.json({
              message: 'What happens here, from the mws?',
            })
          );
        }),
      );
      server.listen();


      frisby
        .post(`${APP_URL}/subscribe`, {...subscription})
        .setup({
          request: {
            headers: {
              'Accept': 'application/json'
            }
          }
        })
        .expect('header', 'Content-Type', /json/)
        .expect('status', 201)
        .then(res => JSON.parse(res.body))
        .then(body => {
          server.close();
          expect(endpointHit).toBe(true);
          done();
        }).catch(err => {
          done(err);
        });
    });
  });

  describe('browser', () => {

//    beforeEach(done => {
//      browser = new Browser({ waitDuration: '30s', loadCss: false });
//
//      browser.visit('/', err => {
//        if (err) return done.fail(err);
//        done();
//      });
//    });

//    beforeEach(done => {
//      browser = new Browser({ waitDuration: '30s', loadCss: false });
//
//      const workerEnv = makeServiceWorkerEnv();
//console.log(workerEnv);
//
//
//      browser.visit('/', err => {
//        browser._eventLoop.active.navigator.serviceWorker = 'What should this be?';
//console.log('browser first---------');
//console.log(browser._eventLoop.active.navigator);
//
//
//        browser.visit('/', err => {
//console.log('browser second---------');
//console.log(browser._eventLoop.active.navigator);
//
//
//          if (err) return done.fail(err);
//          done();
//        });
//      });


//      /**
//       * The browser doesn't have an `_eventLoop` until it actually visits a
//       * site.
//       */
//      browser.visit('/', err => {
//
//        /**
//         * With the `_eventLoop` property in place, I can now attach the mock
//         * service worker stuff.
//         */
//        browser._eventLoop.active.navigator.serviceWorker = {...mockBrowserNavigator };
//
//        /**
//         * No more `undefined` errors. Service worker mocks are in place
//         */
//        browser.visit('/', err => {
//
//console.log('browser second visit---------');
//console.log(browser._eventLoop.active.navigator);
//
//
//
//          if (err) return done.fail(err);
//          done();
//        });
//      });
//
//
//    });

    afterEach(() => {
//      delete require.cache[path.resolve('./public/worker.js')];
    });


    describe('subscribing to notifications', () => {

      beforeAll(async () => {
        jest.setTimeout(10000);

        context = browser.defaultBrowserContext();

        await context.overridePermissions(APP_URL, ['notifications']);
//
//        page = await browser.newPage();
//        await page.goto('http://localhost:3001', {
//          waitUntil: "networkidle2"
//        });
//
//        // There are some notes on this below. Cf., https://bugs.chromium.org/p/chromium/issues/detail?id=1052332
//        // Try running with head and without and note the difference
//        console.log('---------------------');
//        console.log(await page.evaluate(function(){return Notification.requestPermission();}));
//        console.log(await page.evaluate(function(){return Notification.permission;}));
//        console.log('---------------------');
      });

      beforeEach(async () => {
        await page.goto(APP_URL, {
          waintUntil: 'networkidle2',
          timeout: 10000
        });
      });

      describe('successfully', () => {

//        it('lands in the right place', done => {
//          browser.pressButton('#subscribe-button').then(() => {
//            browser.assert.url({ pathname: '/' });
//            done();
//          }).catch(err => {
//            done.fail(err);
//          });
//        });


        /**
         * 2021-1-14 Tricky business here
         *
         * It seems that the confirm dialog produced by `window.confirm` is not
         * the same as that produced by `window.Notification.requestPermission()`,
         * used solo or as part of the `registration.pushManager.subscribe`
         * routine
         *
         * And then there's this issue: https://github.com/puppeteer/puppeteer/issues/3279
         * which suggests a bug in Chromium itself
         * https://bugs.chromium.org/p/chromium/issues/detail?id=1052332
         *
         * Confirming this dialog appears is proving difficult. May there be another
         * way to ensure correctness.
         */
        //it.only('shows a confirmation dialog', async () => {

          // Method 1.
          //
          //await page.on('dialog', async dialog => {
          //  console.log('DIALOG STARTED');
          //  await dialog.accept();
          //});
          //await page.click('#subscribe-button');

          // Method 2.
          //
          //const dialog = await expect(page).toDisplayDialog(async () => {
          //
          //  console.log("Inside DIALOG expect block")
          //  await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });
          //});
        //});

        it('shows a waiting-for-subscription-confirmation message', async () => {
          await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });
          await page.waitForSelector('.alert');
          await expect(page).toMatchElement('.messages .alert.alert-info', 'Waiting for subscription confirmation...');
        });
      });
    });
  });
});
