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

      beforeEach(async () => {
//        await page.goto(APP_URL, {
//          waitUntil: 'networkidle2',
//          timeout: 10000
//        });
      });

      describe('successfully', () => {

        it('lands in the right place', async() => {
          await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });
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
         * This might not be possible drectly, because he alert comes from the
         * OS notification system
         */
        it('receives a successfully-subscribed push message', async done => {
//          let session;
//          browser.on('targetcreated', async (target) => {
//            console.log('Target created');
//            page = await target.page();
//            await initializeCDP(page);
//            session = await page.target().createCDPSession();
//          });

          let session = await page.target().createCDPSession();
          console.log('CDP session');
          console.log(session);



          /**
           * 2021-1-19 https://jsoverson.medium.com/using-chrome-devtools-protocol-with-puppeteer-737a1300bac0
           *
           * This isn't particularly useful, though it does show the CDP stuff
           * does actually work (run tests in development mode to see the event
           * fire).
           *
           * Now how to make it work for notifications...
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

          /**
           * This is the stuff I'm interested in...
           */
          // Finally got service workers to update. Seperate into new test
          await session.send('ServiceWorker.enable');
//          await session.send('ServiceWorker.stopAllWorkers');
          await session.send('ServiceWorker.setForceUpdateOnPageLoad', {forceUpdateOnPageLoad: true});
          session.on('ServiceWorker.workerRegistrationUpdated', async reg => {
            console.log("The service worker was updated");
            console.log(reg);
            await session.send('ServiceWorker.startWorker', { scopeURL: reg.registrations[0].scopeURL });
//            let res  = await session.send('ServiceWorker.inspectWorker', { versionId: reg.registrations[0].registrationId });
//            console.log(res);

            const dialog = await expect(page).toDisplayDialog(async () => {
              console.log("Inside DIALOG expect block");
              //await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });

              // Try triggering the push event
              try {
                let res = await session.send('ServiceWorker.deliverPushMessage', {
                  registrationId: reg.registrations[0].registrationId,
                  origin: reg.registrations[0].scopeURL,
                  data: JSON.stringify({ message: "Word." })
                });
                console.log('Push triggered');
                console.log(res);
              }
              catch (err) {
                console.error(err);
              };

            });

            console.log('dialog');
            console.log(dialog);

          });
          session.on('ServiceWorker.onmessage', async reg => {
            console.log('************************* A long shot');
          });

          //
//          await session.send('Runtime.enable');
//          session.on('Runtime.consoleAPICalled', async reg => {
//            console.log('************************* Runtime.consoleAPICalled');
//            console.log(reg);
//          });



//          await session.send('BackgroundService.clearEvents', {service: 'notifications'});
//          await session.send('BackgroundService.setRecording', {shouldRecord: true, service: 'notifications'});
          await session.send('BackgroundService.startObserving', {service: 'pushMessaging'});

          session.on('BackgroundService.backgroundServiceEventReceived', dialog => {
            console.log("IS THIS THE SERVICE WORKER???");
            done();
          });

          // Push notification uses OS's messaging
          // This will never fire
          page.on('dialog', dialog => {
            console.log('DIALOG EVENT FIRED');
            done();
          });

          await page.goto(APP_URL, {
            waitUntil: 'networkidle2',
            timeout: 10000
          });

          console.log('page');
          console.log(page.workers());
          //
          // What is best practices when registering service workers?
          //
          // Apart from permissions, should it be automatic registration, or should
          // it be due to an action taken in the app?
          //
          await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });

//          await session.send('BackgroundService.clearEvents', {service: 'notifications'});
        });

        /**
         * Push Notifications are unwieldy. This is an attempt at focusing and
         * simplifying the tests by triggering a push event and ensuring
         * the proper browser function gets fired
         */
        it.only('triggers a notification on push event', async done => {


          let session = await page.target().createCDPSession();
          console.log('session');
          console.log(session);



          // Finally got service workers to update. Seperate into new test
          await session.send('ServiceWorker.enable');
///          //await session.send('ServiceWorker.stopAllWorkers');
          await session.send('ServiceWorker.setForceUpdateOnPageLoad', {forceUpdateOnPageLoad: true});
          session.on('ServiceWorker.workerRegistrationUpdated', async reg => {
            console.log("The service worker was updated");
            console.log(reg);


            // Attach listener to worker target
            let targets = await session.send('Target.getTargets');//, { type: 'service_worker' });
            console.log('session targets');
            //console.log(targets);

            let sw = targets.targetInfos.find(t => t.type === 'service_worker');
            console.log('service worker target');
            console.log(sw);

            session.on('Target.receivedMessageFromTarget', evt => {
              console.log('Target.receivedMessageFromTarget');
              console.log(evt);
            });

            /**
             * This is, so far, the only way to send an actuall push message
             */
            let res = await session.send('ServiceWorker.deliverPushMessage', {
              registrationId: reg.registrations[0].registrationId,
              origin: reg.registrations[0].scopeURL,
              data: JSON.stringify({ message: "Word." })
            });
          });

          session.on('ServiceWorker.workerErrorReported', request => {
            console.log('************************* ServiceWorker.workerErrorReported');
            console.log(request);
          });


//          await session.send('Runtime.enable');
//          session.on('Runtime.consoleAPICalled', async data => {
//            console.log('************************* Runtime.consoleAPICalled');
//            console.log(data);
//          });

          page.on('console', msg => {
            console.log('************************* puppeteer console called');
            console.log(msg);
          });

          await page.goto(APP_URL, {
            waitUntil: 'networkidle2',
            timeout: 10000
          });


//          await session.send('Log.enable');
//          session.on('Log.entryAdded', async data => {
//            console.log('************************* Log.entryAdded');
//            console.log(data);
//          });




//          let target = await page.target();
//          console.log('target');
//          console.log(target);
//
//
//
//
//          swTarget.browserContext().on('push', evt => {
//            console.log('service worker received a push');
//            console.log(evt);
//          });

          //
          // What is best practices when registering service workers?
          //
          // Apart from permissions, should it be automatic registration, or should
          // it be due to an action taken in the app?
          //
          await expect(page).toClick('#subscribe-button', { text: 'Subscribe' });

//            await context.emit('push', {message: 'Hello, everybody!'});

//          swTarget.browserContext().emit('push', {message: 'Hello, everybody!'});


//          let targets = await session.send('Target.getTargets');//, { type: 'service_worker' });
//          console.log('session targets');
//          console.log(targets);
//
//          let sw = targets.targetInfos.find(t => t.type === 'service_worker');
//          console.log('service worker target');
//          console.log(sw);
//
//          session.on('Target.receivedMessageFromTarget', evt => {
//            console.log('Target.receivedMessageFromTarget');
//            console.log(evt);
//          });
//
//          session.on('Target.attachedToTarget', async evt => {
//            console.log('Target.attachedToTarget');
//            console.log(evt);
//            await session.send('Target.sendMessageToTarget', { targetId: evt.targetInfo.targetId, sessionId: evt.sessionId, message: JSON.stringify({message: 'IT SENT WOOOOOOOO!' }) });
//
//          });

//          let sessId = await session.send('Target.attachToTarget', { targetId: sw.targetId });
//            console.log('ID');
//            console.log(sessId);


        });
      });
    });
  });
});
