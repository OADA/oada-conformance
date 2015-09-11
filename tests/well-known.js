'use strict';

var debug = require('debug')('oada-conformance:well-known');
var memoize = require('lodash').memoize;
var request = require('superagent-bluebird-promise');

var config = require('../config.js').server;

function get(doc) {
    debug(config.uri + '/.well-known/' + doc);
    return request
        .get(config.uri + '/.well-known/' + doc)
        .accept('application/json')
        .promise()
        .get('body');
}

module.exports.get = memoize(get);
