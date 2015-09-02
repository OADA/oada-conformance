'use strict';

//var config = require('../../config').authorization;
//var state = require('../../state');

//var request = require('supertest-promised').agent(config.uri);
//var formats = require('oada-formats');

var wellKnown = require('../../lib/wellKnown');

describe('OAuth 2.0 Code Flow', function() {

    describe('Dynamic Client Registration', function() {

        before(function() {
            wellKnown.ensureOadaConfiguration(this);
        });

    });
});
