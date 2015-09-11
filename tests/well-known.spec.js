'use strict';

var wellKnown = require('./well-known.js');

var DOCS = [
    'oada-configuration',
    'openid-configuration'
];

describe('well-known documents', function() {
    DOCS.forEach(function(doc) {
        describe(doc, function() {
            it('should exist', function() {
                return wellKnown.get(doc);
            });
        });
    });
});

