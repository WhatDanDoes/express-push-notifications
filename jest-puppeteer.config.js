module.exports = {
  launch: {
    dumpio: true,
    headless: process.env.HEADLESS !== 'false',
    devtools: true,
    //args: ['--enable-features=NetworkService'],
    //ignoreHTTPSErrors: true,
    //executablePath: '/usr/bin/google-chrome',
  },
//  server: {
//    command: 'node app.js',
//    port: 3001,
//    debug: true
//  },
  browser: 'chromium',
  browserContext: 'default',
}
