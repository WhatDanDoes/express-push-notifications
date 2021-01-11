const Browser = require('zombie');
const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001; 
Browser.localhost('example.com', PORT);
const app = require('../app');

describe('indexSpec', () => {
  let browser;

  beforeEach(done => {
    browser = new Browser({ waitDuration: '30s', loadCss: false });

    browser.visit('/', err => {
      if (err) return done.fail(err);
      done();
    });
  });

  describe('interface', () => {
    it('shows a Subscribe button', done => {
      browser.assert.element('#subscribe-button');
      done();
    });
  });
});
