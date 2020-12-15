const Browser = require('zombie');
const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001; 
Browser.localhost('example.com', PORT);
const app = require('../app');

describe('agentIndexSpec', () => {
  let browser;

  beforeEach(done => {
    browser = new Browser({ waitDuration: '30s', loadCss: false });
    done();
  });

  describe('interface', () => {
    it('shows a Subscribe button', done => {
      done.fail();
    });
  });
});
