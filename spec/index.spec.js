const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001;
const app = require('../app');

describe('index', () => {

  afterAll(done => {
    app.close(done);
  });

  beforeEach(async () => {
    await page.goto(`http://localhost:${PORT}`);
  });

  describe('interface', () => {
    it('shows a Subscribe button', async () => {
      await expect(page).toMatchElement('#subscribe-button');
    });
  });
});
