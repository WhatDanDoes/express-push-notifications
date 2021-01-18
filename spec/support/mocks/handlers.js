const rest = require('msw').rest;
module.exports = [
  rest.post('http://fcm.googleapis.com/fcm/send/:id', (req, res, ctx) => {
    console.log('THE POST endpoint was hit');
//    return res(ctx.json({ messages: 'POST https://fcm.googleapis.com was called' }));

    return res(ctx.json({
      statusCode: 201,
      body: '',
      // 2021-1-18 This is sample data copy-pasted from an actual call
      headers: {
        location: 'https://fcm.googleapis.com/0:1611003913926410%7031b2e6f9fd7ecd',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'SAMEORIGIN',
        'x-xss-protection': '0',
        date: 'Mon, 18 Jan 2021 21:05:13 GMT',
        'content-length': '0',
        'content-type': 'text/html; charset=UTF-8',
        'alt-svc': 'h3-29=":443"; ma=2592000,h3-T051=":443"; ma=2592000,h3-Q050=":443"; ma=2592000,h3-Q046=":443"; ma=2592000,h3-Q043=":443"; ma=2592000,quic=":443"; ma=2592000; v="46,43"',
        connection: 'close'
      }
    }));
  }),
  rest.get('http://fcm.googleapis.com/fcm/send/:id', (req, res, ctx) => {
    console.log('THE GET endpoint was hit');
    return res(ctx.json({ messages: 'GET https://fcm.googleapis.com was called' }));
  }),
];
