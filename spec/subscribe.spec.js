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
   * This drove me nuts at first. You have to shut down the express server
   * or you get uncaught async errors everywhere
   */
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

      // Frisby came into the mix because you just need a running server.
      // You don't need to pass an instance of the server (cf., `supertest`)
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

    /**
     * I realized I wasn't going to be able to use my tried-and-true
     * `jasmine`-`zombie` tag team early on. `zombie` doesn't have any
     * concept of service workers.
     *
     * `puppeteer` was chosen because it seems to play nicely with `jest`
     */
    //  it('immediately sends a successful subscribed notification', done => {
    //      request(app)
    //        .get('/subscribe')
    //        .set('Accept', 'application/json')
    //        .expect('Content-Type', /json/)
    //        .expect(201)
    //        .end((err, res) => {
    //          if (err) return done.fail(err);
    //          done.fail();
    //        });
    //  });

    /**
     * Went down a dark trail...
     */
    //it('does a dns lookup on endpoint', done => { });

    /**
     * Since the HTTP response is received before the subscription confirmation
     * notification, there is necessarily an uncaught error.
     *
     * All this to ensure the `webpush.sendNotification` is called with the correct
     * parameters. If something is out of whack, error is thrown.
     *
     */
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

    /**
     * This is `express` requesting and receiving the subscription information that
     * actually relays the push message
     */
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
      //page.on('console', consoleObj => console.log(consoleObj.text()));
    });


    describe('subscribing to notifications', () => {

      let context;
      beforeAll(async () => {
        jest.setTimeout(10000);

        context = browser.defaultBrowserContext();

        // Can't seem to interact with confirm alert box. This overrides that
        await context.overridePermissions(APP_URL, ['notifications']);
      });

      describe('successfully', () => {

        beforeEach(async () => {
          // Which `networkidleX`? https://github.com/puppeteer/puppeteer/issues/1552#issuecomment-350954419
          // The `networkidle0` seems a little lest flaky
          await page.goto(APP_URL, {
            waitUntil: 'networkidle0',
            timeout: 10000
          }).catch(e => {
            console.error(e);
          });
        });

        it('lands in the right place', async () => {
          await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });//.catch(e => console.error(e));
          expect(page.url()).toEqual(APP_URL + '/');
        });


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
          //  console.log("Inside DIALOG expect block")
          //  await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });
          //});
        //});

        it('shows a waiting-for-subscription-confirmation message', async () => {
          await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });
          await page.waitForSelector('.alert');
          await expect(page).toMatchElement('.messages .alert.alert-info', 'Waiting for subscription confirmation...');
        });

        /**
         * This turned out to not be possible, because the alert comes from the
         * OS notification system
         */
        //it('receives a successfully-subscribed push message', async done => { });

        /**
         * Aside:
         *
         * 2021-1-19 https://jsoverson.medium.com/using-chrome-devtools-protocol-with-puppeteer-737a1300bac0
         *
         * This isn't particularly useful, though it does show the CDP stuff
         * does actually work (run tests in development mode to see the event
         * fire).
         *
         * If only you could make it worker for notifications...
         */
        //await session.send('Network.enable');
        //await session.send('Network.setRequestInterception', { patterns: [
        //  {
        //    urlPattern: '*',
        //    resourceType: 'Script',
        //    interceptionStage: 'HeadersReceived'
        //  }
        //]});

        //session.on('Network.requestIntercepted', ({ interceptionId }) => {
        //  console.log("NETWORK CONNECTION INTERCEPTED");
        //  session.send('Network.continueInterceptedRequest', {
        //    interceptionId,
        //  });
        //});
      });

      /**
       * Another aside:
       *
       * Just in case you were wondering, `nock` and `msw` cannot intercept
       * requests from the browser
       */
      //const rest = require('msw').rest;
      //const setupServer = require('msw/node').setupServer;
      //const server = setupServer(
      //  // Describe the requests to mock.
      //  rest.get(`${APP_URL}/worker.js`, (req, res, ctx) => {
      //    console.log("MSW ENDPOINT HIT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      //    console.log(res);
      //
      //    return res(
      //      ctx.status(404),
      //      ctx.json({
      //        message: 'What happens here, from the mws?',
      //      })
      //    );
      //  }),
      //);
      //server.listen();

      //const nock = require('nock')
      //
      //const scope = nock(APP_URL)
      //  .get('/worker.js')
      //  .reply(200, (uri, requestBody) => {
      //    console.log("NOCK ENDPOINT HIT !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      //    return 'SERVICE WORKER HERE';
      //  });

      describe('push notifications', () => {
        /**
         * Push Notifications are unwieldy. This is an attempt at focusing and
         * simplifying the tests by triggering a push event and ensuring
         * the proper browser function gets fired
         */
        it('triggers a notification on push event', async done => {

          let testPassed = false;

          const newPage = await browser.newPage();

          /**
           * This is where it got new and interesting...
           *
           * The Chrome DevTool Protocol gives hands-on access to browser
           * internals. Currently, this is the only way to trigger a
           * notification.
           */
          let session = await newPage.target().createCDPSession();
          console.log('session');
          console.log(session);

          // Finally got service workers to update. Use this approach to test
          // service worker script update in a new test
          await session.send('ServiceWorker.enable');
          await session.send('ServiceWorker.setForceUpdateOnPageLoad', {forceUpdateOnPageLoad: true});
          session.on('ServiceWorker.workerRegistrationUpdated', async reg => {
            console.log("The service worker was updated");
            console.log(reg);

            /**
             * This is, so far, the only way to send an actual push message
             *
             * All I am able to test so far is whether the data sent is the
             * data received. By itself, not useful beyond documenting what is
             * known about the mechanics of notifications
             */
            let res = await session.send('ServiceWorker.deliverPushMessage', {
              registrationId: reg.registrations[0].registrationId,
              origin: reg.registrations[0].scopeURL,
              data: JSON.stringify({ message: "Word." })
            }).catch(e => console.error(e));
          });

          /**
           * I ran into a testing brickwall at this point. It is very difficult
           * to peek at the internals of a service worker processing a `push`
           * event. Even a convential `console.log` will not output, because
           * push notifications do not have access to the DOM. They live in
           * completely seperate worlds...
           *
           * Except for `console.error`. You can _see_ the output from a `console.error`
           * if it comes from a service worker.
           *
           * At this point, I can only confirm what has been passed the worker.
           * I cannot even stub anything inside.
           *
           * See how the error messages are applied in `app.js`:
           *
           * `app.use('/worker.js')`
           */
          session.on('ServiceWorker.workerErrorReported', async request => {
            console.log('************************* ServiceWorker.workerErrorReported');
            console.log(request);

            try {
              let data = JSON.parse(request.errorMessage.errorMessage);
              expect(data.message).toEqual('Word.');
              if (data.message === 'Word.') {
                return done();
              }
            }
            catch (err) {
              console.log('No match');
            }
          });

          newPage.on('console', msg => {
            console.log('************************* puppeteer console called');
            console.log(msg);
          });

          /**
           * Why not `newPage.on('dialog')`?
           *
           * Push notification use OS's messaging
           *
           * They live in a world of their own. No DOM events!
           */
          //newPage.on('dialog', msg => {
          //  console.log('This will never fire');
          //  console.log(msg);
          //});

          // Which `networkidleX`? https://github.com/puppeteer/puppeteer/issues/1552#issuecomment-350954419
          // The `networkidle0` seems a little lest flaky
          await newPage.goto(APP_URL, {
            waitUntil: 'networkidle0',
            timeout: 10000
          }).catch(e => {
            console.error(e);
          });


          //
          // What is best practices when registering service workers?
          //
          // Apart from permissions, should it be automatic registration, or should
          // it be due to an action taken in the app?
          //
          await expect(newPage).toClick('#subscribe-button', { text: 'Subscribe' }).catch(e => console.error(e));
        });
      });
    });
  });
});
