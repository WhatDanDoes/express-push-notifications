const express = require('express');
const router = express.Router();

/**
 * Setup web-push
 */
const webpush = require('web-push');
const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;
webpush.setVapidDetails(`mailto:${process.env.EMAIL}`, publicVapidKey, privateVapidKey);


/**
 * Real-life subscription objects from sent from client
 */
// Google:
//
// {
//   endpoint: 'https://fcm.googleapis.com/fcm/send/ftics4QAW5M:APA91bHHWq0Rv-KOHQqQxZHOAJb6kqwwm_qoaXwOYHV5Z4olznZUNq1bRhYe9hU7wTKDdEQg6xEVJVIu0hewh3QwZ10prrb4cn4zktx0ertUtwgGW7f3X869eQdA1P09r1D7cbJlrQ96',
//   expirationTime: null,
//   keys: {
//     p256dh: 'BBBBo-GGOkxa7sNnwwC4vH9oei3dj2l_vn-P9CKjBrZ26HR1LLma00HucwTS9cyg7rWrnVkR6elChrD2lBgk10w',
//     auth: 'bo-ChJIdXTQVj2wvDd7EZg'
//   }
// }

// Firefox:
//
//{
//  endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/gAAAAABf_fo7DTABhasiCMPCbJslzZRBSknEIzOQpwpH43JglSCMotBEVXTkBRas8waREftf5EOLNv4BV8bZ1JP6tImh26z3zwrCDGraDWWvyoer9lLGRcFQuHN_zWbF1C5ZlN0cMB0VJtYS-w6QhvQMfImN9L3AQoa44FcLyTImoUGbE-5XedA',
//  keys: {
//    auth: '39gIjQ4HLX_If-sQ9JL8Ng',
//    p256dh: 'BN2MPXETMQhurTjZr7LcvmP7NjYxgosSwr1c0GEzS3g5eapznGXGZOyt0tlmXrUf-J9wUKdyRMvuR09kHUtMQl8'
//  }
//}


/* POST /subscribe */
router.post('/', function(req, res, next) {
  const subscription = req.body;

  req.flash('info', 'Waiting for subscription confirmation...');

  res.status(201).json({ messages: req.flash() });

  const payload = JSON.stringify({ message: 'You have successfully subscribed' });

  console.log('subscription');
  console.log(JSON.stringify(subscription));

  console.log('Trying to subscribe');
  webpush.sendNotification(subscription, payload).then(val => {
    console.log('Subscribe succeeded?');
    console.log(val);
  }).catch(error => {
    console.error(error);
    // For testing, for the moment. This will be properly handled in production.
    throw new Error('Couldn\'t subscribe');
  });
});

module.exports = router;
