express-push-notifications
==========================

A Hello World type demonstration of sending push notifications from Express.

# Background

[Churches in Canada are allowed 50W FM transmitters](https://crtc.gc.ca/eng/archive/2013/2013-621.htm), but few churches actually have one. My [old church](https://saintpeters.ca/) did a four-week trial-run with a loaner. Last year, 2020 Sunday services and Christmas were broadcast over the town of Cochrane and into the countryside on the FM band.

_So why browser [Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push\_API)?_

Simply put, I want to be notified when Saint Peter's is broadcasting a service. Further, I want to be able to subscribe to the notification through their website, without any need for login or account management.

**This document is not that**. As above, it is a _Hello World_-style demonstration of real-live notifications. Most importantly, it demonstrates the limit to which I could apply test-driven development principles. Push Notifications are a powerful tool. All that I've learned is shared here. Pray tell it not be so terribly dreadful.

## More background

I'm a big fan of radio as a medium. [See how it all began](https://www.youtube.com/playlist?list=PL7W6bXoWmZ9eAUMIixTExbfiz8X0plAKj). Radio and Web Development have the same fundamental problem: _how do we get people to tune in?_

## Other applications

Push Notifications are enabled, in part, by [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker\_API). These are of special interest for those who develop for the web _offline first_.

### Under construction

As it turns out, Push Notifications are still pretty bleeding edge. The tests themselves document what can be discerned from how they behave. The technology is murky and possesses mild _proprietary_ undertones. The challenge presented in discerning precise operation revealed many new insights into the browser itself. By comparison, Service Workers in the broader sense seem like a breeze to test (though I have yet to engage the problem).

#### Current state

That which is currently committed to `master` documents the most primitive _meaningful_ tests I could devise. I demonstrate my naive, first-time application of `jest` and `jest-puppeteer`. Tests pass, but there's a lot of confusing debug output to suggest otherwise.

The app itself registers the service worker, subscribes to the notifications, and receives a pending and live notification in turn.

More is coming...

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

Make sure to set the `HEADLESS` environment variable to `false` when running a single test:

```
HEADLESS=false npx jest spec/subscribe.spec.js
```

[Notifications are not available in headless mode](https://github.com/puppeteer/puppeteer/issues/3432).

# Development

```
npm start
```
