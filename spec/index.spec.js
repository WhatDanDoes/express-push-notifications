const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001;
const app = require('../app');

describe('index', () => {

  afterAll(done => {
    // 2021-1-13
    //
    // https://stackoverflow.com/a/14516195/1356582
    //
    // This needs to be closed, otherwise you get a `Jest did not exit one second after the test run has completed` error
    app.close(done);
  });

  beforeEach(async () => {
    await page.goto('http://localhost:3001');
  });

  describe('interface', () => {
    it('shows a Subscribe button', async () => {
      await expect(page).toMatchElement('#subscribe-button');
    });
  });
});
