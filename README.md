express-push-notifications
==========================

A Hello World type demonstration of sending push notifications from Express.

# Setup

```
cp .env.example .env
npm install
```

Configure VAPID keys:

```
npx web-push generate-vapid-keys
```

The keys generated need to be set in the `.env` file.

# Test

```
npm test
```

Make sure to set the `HEADLESS` environment variable when running a single test:

```
HEADLESS=false npx jest spec/subscribe.spec.js
```

`ServiceWorker` support is spotty in _headless_ mode.

# Development

```
npm start
```
