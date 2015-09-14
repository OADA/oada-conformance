'use strict';

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var glob = require('glob');
var pem2jwk = require('pem-jwk').pem2jwk;

var OPTIONS = {
    cwd: __dirname,
};
var PATTERN = '*.pem';
var RSA_PRIV = [
    'd',
    'p',
    'q',
    'dp',
    'dq',
    'qi'
];

// Just use first pem (should only be one)
var pem = glob.sync(PATTERN, OPTIONS)[0];
var id = pem.replace(/\.pem$/, '');
var file = path.join(__dirname, pem);

var jwk = pem2jwk(fs.readFileSync(file, 'ascii'));
jwk.kid = id;

module.exports = {
    priv: jwk,
    pub: _.omit(jwk, RSA_PRIV)
};
