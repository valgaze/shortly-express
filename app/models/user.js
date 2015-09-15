var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Click = require('./click');

var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,

});

module.exports = User;