const setupServer = require('msw/node').setupServer;
const handlers = require('./handlers');
// This configures a request mocking server with the given request handlers.
module.exports = setupServer(...handlers);
