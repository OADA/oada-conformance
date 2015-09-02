'use strict';

var config = require('../config').authorization;

var debug = require('debug')('conformance:oada-configuration');
var _ = require('lodash');
var request = require('supertest-promised').agent(config.uri);
//var formats = require('oada-formats');

// Local state
var lstate = {};

// context: The "this" of a mocha block
function ensureOadaConfiguration(context) {
    if (!lstate.oadaConfiguration) {
        debug(context.test.parent.fullTitle() +
                ' requires /.well-known/oada-configuration');

        context.skip();
    } else {
        _.set(context, 'oada.configuration', lstate.oadaConfiguration);
    }
}

module.exports = {
    ensureOadaConfiguration: ensureOadaConfiguration,
};

// Leverage the fact that node only requires a file once to ensure the tests
// only get executed once
describe('Well Known Resources', function() {
    it('oada-configuration', function() {
        return request
            .get('/.well-known/oada-configuration')
            .expect('Content-Type',
                    /^application\/vnd.oada.oada-configuration.1\+json/)
            .expect(200)
            .end()
            .then(function(res) {
                /*
                return formats
                    .byMediaType(res.type)
                    .call('validate', res.body)
                    .return(res.body);
                    */
                return res.body;
            })
            .then(function(config) {
                _.set(lstate, 'oadaConfiguration', config);
            });
    });
});
