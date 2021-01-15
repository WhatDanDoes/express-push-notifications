module.exports = {
  launch: {
    dumpio: true,
    headless: process.env.HEADLESS !== 'false',
    //args: ['--enable-features=NetworkService'],
    //ignoreHTTPSErrors: true,
    //executablePath: '/usr/bin/google-chrome',
  },
  browser: 'chromium',
  //browserContext: 'default',
}
