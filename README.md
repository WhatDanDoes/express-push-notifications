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

# Development

```
npm start
```
