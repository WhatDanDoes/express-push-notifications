module.exports = {
  launch: {
    dumpio: true,
    headless: process.env.HEADLESS !== 'false',
    //args: ['--enable-features=NetworkService'],
    //ignoreHTTPSErrors: true,
    //executablePath: '/usr/bin/google-chrome',
  },
  server: {
    command: 'node app.js',
    port: 3001,
  },
  browser: 'chromium',
  browserContext: 'default',
}
