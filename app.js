require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const subscribeRouter = require('./routes/subscribe');

const app = express();

/**
 * Sessions
 */
const session = require('express-session');

const sessionConfig = {
  name: 'express-push-notifications',
  secret: process.env.PRIVATE_VAPID_KEY, // This seemed convenient
  resave: false,
  saveUninitialized: false,
  unset: 'destroy',
  cookie: {
    maxAge: 1000 * 60 * 60,
  }
};

app.use(session(sessionConfig));

/**
 * Flash messages
 */
const flash = require('connect-flash');
app.use(flash());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


/**
 * This prepares service workers for inspection with `jest-puppeteer`
 *
 * The whole intent is to wrap the `worker.js` functionality so that
 * console.errors can be thrown. This is how `jest-puppeteer` finds
 * something _catchable_.
 */
if (process.env.NODE_ENV === 'test') {
  const fs = require('fs');

  console.log('Testing...');
  console.log(process.env.NODE_ENV);

  app.use('/worker.js', function(req, res, next) {
    console.log('Mocking ServiceWorker endpoint');

    //
    // This is what happens normally
    //
    //return res.sendFile(`${__dirname}/public/worker.js`);

    //
    // This is what happens now..
    //
    // The most useful, testable thing is the function signature passing
    // through the `push` event. Beyond this, not much has presented itself as
    // _testable_ with regard to Push Notifications.
    //
    fs.readFile(`${__dirname}/public/worker.js`, 'utf8', (err, data) => {
      if (err) return done.fail(err);

      //
      // I have discovered that a ServiceWorker does not trigger the same
      // events on `console.log` as in-page Javascript. So far, the only way I
      // can determine what is happening inside my service worker is to output
      // `console.errors`, which trigger a `ServiceWorker.workerErrorReported`,
      // which can be _heard_ by `jest-puppeteer`.
      //
      data = data.replace(/console\.log/g, 'console.error');
      res.set({
        'Content-Type': 'application/javascript; charset=UTF-8',
        'Content-Length': data.length,
      });

      // 2021-1-21 https://stackoverflow.com/questions/38788721/how-do-i-stream-response-in-express
      res.write(data);
    });
  });
}



app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/subscribe', subscribeRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

let port = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'tor' ? 3000 : 3001;
//app.listen(port, '0.0.0.0', () => {
//  console.log('express-push-notifications listening on ' + port + '!');
//});
//
//module.exports = app;

module.exports = app.listen(port, '0.0.0.0', () => {
  console.log('express-push-notifications listening on ' + port + '!');
});
