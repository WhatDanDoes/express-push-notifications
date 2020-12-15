const Browser = require('zombie');
const PORT = process.env.NODE_ENV === 'production' ? 3000 : 3001; 
Browser.localhost('example.com', PORT);
const fs = require('fs');
const app = require('../app');

describe('agentIndexSpec', () => {
  let browser;

  beforeEach(done => {
    browser = new Browser({ waitDuration: '30s', loadCss: false });
//    //browser.debug();
//    fixtures.load(__dirname + '/../fixtures/agents.js', models.mongoose, function(err) {
//      models.Agent.findOne({ email: 'daniel@example.com' }).then(function(results) {
//        agent = results;
//        models.Agent.findOne({ email: 'lanny@example.com' }).then(function(results) {
//          lanny = results; 
//          browser.visit('/', function(err) {
//            if (err) return done.fail(err);
//            browser.assert.success();
            done();
//          });
//        }).catch(function(error) {
//          done.fail(error);
//        });
//      }).catch(function(error) {
//        done.fail(error);
//      });
//    });
  });

//  afterEach(function(done) {
//    models.mongoose.connection.db.dropDatabase().then(function(err, result) {
//      done();
//    }).catch(function(err) {
//      done.fail(err);
//    });
//  });

  describe('authenticated', () => {

  });
});
