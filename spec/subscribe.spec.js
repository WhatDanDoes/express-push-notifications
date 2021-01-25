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


  ////        await page.goto(APP_URL, {
  ////          waitUntil: 'networkidle2',
  ////          timeout: 10000
  ////        });
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
          console.log('THE TEST IS STARTING');
          await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });
          console.log('WAITING FOR ALERT');
          await page.waitForSelector('.alert');
          await expect(page).toMatchElement('.messages .alert.alert-info', 'Waiting for subscription confirmation...');
        });

        /**
         * This might not be possible drectly, because the alert comes from the
         * OS notification system
         */
//        it('receives a successfully-subscribed push message', async done => {
////          let session;
////          browser.on('targetcreated', async (target) => {
////            console.log('Target created');
////            page = await target.page();
////            await initializeCDP(page);
////            session = await page.target().createCDPSession();
////          });
//
//          let session = await page.target().createCDPSession();
//          console.log('CDP session');
//          console.log(session);
//
//
//
//          /**
//           * 2021-1-19 https://jsoverson.medium.com/using-chrome-devtools-protocol-with-puppeteer-737a1300bac0
//           *
//           * This isn't particularly useful, though it does show the CDP stuff
//           * does actually work (run tests in development mode to see the event
//           * fire).
//           *
//           * Now how to make it work for notifications...
//           */
//          //await session.send('Network.enable');
//          //await session.send('Network.setRequestInterception', { patterns: [
//          //  {
//          //    urlPattern: '*',
//          //    resourceType: 'Script',
//          //    interceptionStage: 'HeadersReceived'
//          //  }
//          //]});
//
//          //session.on('Network.requestIntercepted', ({ interceptionId }) => {
//          //  console.log("NETWORK CONNECTION INTERCEPTED");
//          //  session.send('Network.continueInterceptedRequest', {
//          //    interceptionId,
//          //  });
//          //});
//
//          /**
//           * This is the stuff I'm interested in...
//           */
//          // Finally got service workers to update. Seperate into new test
//          await session.send('ServiceWorker.enable');
////          await session.send('ServiceWorker.stopAllWorkers');
//          await session.send('ServiceWorker.setForceUpdateOnPageLoad', {forceUpdateOnPageLoad: true});
//          session.on('ServiceWorker.workerRegistrationUpdated', async reg => {
//            console.log("The service worker was updated");
//            console.log(reg);
//            await session.send('ServiceWorker.startWorker', { scopeURL: reg.registrations[0].scopeURL });
////            let res  = await session.send('ServiceWorker.inspectWorker', { versionId: reg.registrations[0].registrationId });
////            console.log(res);
//
//            const dialog = await expect(page).toDisplayDialog(async () => {
//              console.log("Inside DIALOG expect block");
//              //await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });
//
//              // Try triggering the push event
//              try {
//                let res = await session.send('ServiceWorker.deliverPushMessage', {
//                  registrationId: reg.registrations[0].registrationId,
//                  origin: reg.registrations[0].scopeURL,
//                  data: JSON.stringify({ message: "Word." })
//                });
//                console.log('Push triggered');
//                console.log(res);
//              }
//              catch (err) {
//                console.error(err);
//              };
//
//            });
//
//            console.log('dialog');
//            console.log(dialog);
//
//          });
//          session.on('ServiceWorker.onmessage', async reg => {
//            console.log('************************* A long shot');
//          });
//
//          //
////          await session.send('Runtime.enable');
////          session.on('Runtime.consoleAPICalled', async reg => {
////            console.log('************************* Runtime.consoleAPICalled');
////            console.log(reg);
////          });
//
//
//
////          await session.send('BackgroundService.clearEvents', {service: 'notifications'});
////          await session.send('BackgroundService.setRecording', {shouldRecord: true, service: 'notifications'});
//          await session.send('BackgroundService.startObserving', {service: 'pushMessaging'});
//
//          session.on('BackgroundService.backgroundServiceEventReceived', dialog => {
//            console.log("IS THIS THE SERVICE WORKER???");
//            done();
//          });
//
//          // Push notification uses OS's messaging
//          // This will never fire
//          page.on('dialog', dialog => {
//            console.log('DIALOG EVENT FIRED');
//            done();
//          });
//
//          await page.goto(APP_URL, {
//            waitUntil: 'networkidle2',
//            timeout: 10000
//          });
//
//          console.log('page');
//          console.log(page.workers());
//          //
//          // What is best practices when registering service workers?
//          //
//          // Apart from permissions, should it be automatic registration, or should
//          // it be due to an action taken in the app?
//          //
//          await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });
//
////          await session.send('BackgroundService.clearEvents', {service: 'notifications'});
//        });
      });

      describe('push notifications', () => {
        /**
         * Push Notifications are unwieldy. This is an attempt at focusing and
         * simplifying the tests by triggering a push event and ensuring
         * the proper browser function gets fired
         */
        it('triggers a notification on push event', async done => {

          //
          // Notes for testing apologetic
          //
          // `nock` and `msw` cannot intercept requests from the browser

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

          let testPassed = false;

          //await page.close().catch(err => console.error(err));
          const newPage = await browser.newPage();

          let session = await newPage.target().createCDPSession();
          console.log('session');
          console.log(session);



          // Finally got service workers to update. Seperate into new test
          await session.send('ServiceWorker.enable');
          await session.send('ServiceWorker.setForceUpdateOnPageLoad', {forceUpdateOnPageLoad: true});
          session.on('ServiceWorker.workerRegistrationUpdated', async reg => {
            console.log("The service worker was updated");
            console.log(reg);

            // Attach listener to worker target
//            let targets = await session.send('Target.getTargets').catch(e => console.error(e));//, { type: 'service_worker' });
//            console.log('session targets');
//            //console.log(targets);
//
//            let sw = targets.targetInfos.find(t => t.type === 'service_worker');
//            console.log('service worker target');
//            console.log(sw);
//
//            session.on('Target.receivedMessageFromTarget', evt => {
//              console.log('Target.receivedMessageFromTarget');
//              console.log(evt);
//            });

            /**
             * This is, so far, the only way to send an actual push message
             */
            let res = await session.send('ServiceWorker.deliverPushMessage', {
              registrationId: reg.registrations[0].registrationId,
              origin: reg.registrations[0].scopeURL,
              data: JSON.stringify({ message: "Word." })
            }).catch(e => console.error(e));
          });

          session.on('ServiceWorker.workerErrorReported', async request => {
            console.log('************************* ServiceWorker.workerErrorReported');
            console.log(request);

            try {
              let data = JSON.parse(request.errorMessage.errorMessage);
              expect(data.message).toEqual('Word.');
              if (data.message === 'Word.') {
                testPassed = true;
              //  done();
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

//          newPage.on('requestfinished', (e) => {
//            console.log('************************* page request finished');
//            console.log(`${e.type} fired`, e.detail || '');
//            console.log(e);
//          });

          // Which `networkidleX`? https://github.com/puppeteer/puppeteer/issues/1552#issuecomment-350954419
          // The `networkidle0` seems a little lest flaky
          await newPage.goto(APP_URL, {
            waitUntil: 'networkidle0',
            timeout: 10000
          }).catch(e => {
            console.error(e);
            //return done(e);
          });


          //
          // What is best practices when registering service workers?
          //
          // Apart from permissions, should it be automatic registration, or should
          // it be due to an action taken in the app?
          //
          await expect(newPage).toClick('#subscribe-button', { text: 'Subscribe' }).catch(e => console.error(e));

          console.log("HAS EVERYTHING SETTLED?", testPassed);
          if (testPassed) {
            done();
          }
          else {
            done('Test failed');
          }
        });
      });
    });
  });
});
