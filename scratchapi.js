var https = require('https');
var net = require('net');
var util = require('util');
var events = require('events');
var crypto = require('crypto');
var fs = require('fs');

var SERVER = 'scratch.mit.edu';
var PROJECTS_SERVER = 'projects.scratch.mit.edu';
var CDN_SERVER = 'cdn.scratch.mit.edu';
var CLOUD = 'cloud.scratch.mit.edu';
var CLOUD_PORT = 531;

function request(options, cb) {
  var headers = {
    'Cookie': 'scratchcsrftoken=a; scratchlanguage=en;',
    'X-CSRFToken': 'a',
    'referer': 'https://scratch.mit.edu' // Required by Scratch servers
  };
  if (options.headers) {
    for (var name in options.headers) {
      headers[name] = options.headers[name];
    }
  }
  if (options.body) headers['Content-Length'] = options.body.length;
  if (options.sessionId) headers['Cookie'] += 'scratchsessionsid=' + options.sessionId + ';';
  var request = https.request({
    hostname: options.hostname || SERVER,
    port: 443,
    path: options.path,
    method: options.method || 'GET',
    headers: headers
  }, function(response) {
    var parts = [];
    response.on('data', function(chunk) { parts.push(chunk); });
    response.on('end', function() { cb(null, Buffer.concat(parts).toString(), response); });
  });
  request.on('error', cb);
  if (options.body) request.write(options.body);
  request.end();
};

function parseCookie(cookie) {
  var cookies = {};
  var each = cookie.split(';');
  var i = each.length;
  while (i--) {
    if (each[i].indexOf('=') === -1) {
      continue;
    }
    var pair = each[i].split('=');
    cookies[pair[0].trim()] = pair[1].trim();
  }
  return cookies;
}

var Scratch = {};

Scratch.createUserSession = function(username, password, cb) {
  request({
    path: '/login/',
    method: 'POST',
    body: JSON.stringify({username: username, password: password}),
    headers: {'X-Requested-With': 'XMLHttpRequest'}
  }, function(err, body, response) {
    if (err) return cb(err);
    try {
      var user = JSON.parse(body)[0];
      if (user.msg) return cb(new Error(user.msg));
      var sessionId = parseCookie(response.headers['set-cookie'][0]).scratchsessionsid;
      cb(null, new Scratch.UserSession(user.username, user.id, sessionId));
    } catch (e) {
      cb(e);
    }
  });
};

Scratch.getProject = function(projectId, cb) {
  request({
    hostname: PROJECTS_SERVER,
    path: '/internalapi/project/' + projectId + '/get/',
    method: 'GET'
  }, function(err, body, response) {
    if (err) return cb(err);
    try {
      cb(null, JSON.parse(body));
    } catch (e) {
      cb(e);
    }
  });
}

Scratch.UserSession = function(username, id, sessionId) {
  this.username = username;
  this.id = id;
  this.sessionId = sessionId;
};
Scratch.UserSession.prototype.getProject = Scratch.getProject;
Scratch.UserSession.prototype.setProject = function(projectId, payload, cb) {
  if (typeof payload !== 'string') payload = JSON.stringify(payload);
  request({
    hostname: PROJECTS_SERVER,
    path: '/internalapi/project/' + projectId + '/set/',
    method: 'POST',
    body: payload,
    sessionId: this.sessionId
  }, function(err, body, response) {
    if (err) return cb(err);
    try {
      cb(null, JSON.parse(body));
    } catch (e) {
      cb(e);
    }
  });
};
Scratch.UserSession.prototype.getBackpack = function(cb) {
  request({
    hostname: SERVER,
    path: '/internalapi/backpack/' + this.username + '/get/',
    method: 'GET',
    sessionId: this.sessionId
  }, function(err, body, response) {
    if (err) return cb(err);
    try {
      cb(null, JSON.parse(body));
    } catch (e) {
      cb(e);
    }
  });
};
Scratch.UserSession.prototype.setBackpack = function(payload, cb) {
  if (typeof payload !== 'string') payload = JSON.stringify(payload);
  request({
    hostname: CDN_SERVER,
    path: '/internalapi/backpack/' + this.username + '/set/',
    method: 'POST',
    body: payload,
    sessionId: this.sessionId
  }, function(err, body, response) {
    if (err) return cb(err);
    try {
      cb(null, JSON.parse(body));
    } catch (e) {
      cb(e);
    }
  });
};
Scratch.UserSession.prototype.cloud = function(projectId, cb) {
  var self = this;
  request({
    path: '/projects/' + projectId + '/cloud-data.js',
    method: 'GET',
    sessionId: this.sessionId
  }, function(err, body, response) {
    if (err) return cb(err);
    cb(null, new Scratch.CloudSession(self, projectId, body.substr(1495, 36)));
  });
};

Scratch.CloudSession = function(user, projectId, cloudId) {
  this.user = user;
  this.projectId = projectId;
  this.cloudId = cloudId;
  var md5 = crypto.createHash('md5');
  md5.update(this.cloudId);
  this.hash = md5.digest('hex');
  this.connection = null;
  this.variables = Object.create(null);
  this._variables = Object.create(null);
};
util.inherits(Scratch.CloudSession, events.EventEmitter);
Scratch.CloudSession.prototype.connect = function(cb) {
  var self = this;
  this.connection = net.connect({
    host: CLOUD,
    port: CLOUD_PORT
  }, function() {
    self._sendHandshake();
    cb();
  });
  this.connection.setEncoding('utf8');

  this.connection.on('end', function() {
    self.emit('end');
  });

  var stream = '';
  this.connection.on('data', function(chunk) {
    stream += chunk;
    var next;
    var packets = stream.split('\n');
    for(var i = 0; i < packets.length - 1; i++) {
      var line = packets[i];
      var packet;
      try {
        packet = JSON.parse(line);
      } catch (err) {
        console.warn('Invalid packet %s', line);
        return;
      }
      self._handlePacket(packet);
    }
    stream = packets[packets.length - 1];
  });
};
Scratch.CloudSession.prototype.end = function() {
  this.connection.end();
};
Scratch.CloudSession.prototype.get = function(name) {
  return this._variables[name];
};
Scratch.CloudSession.prototype.set = function(name, value) {
  this._variables[name] = value;
  this._sendSet(name, value);
};
Scratch.CloudSession.prototype._handlePacket = function(packet) {
  switch (packet.method) {
    case 'set':
      if (!({}).hasOwnProperty.call(this.variables, packet.name)) {
        this._addVariable(packet.name, packet.value)
      }
      this._variables[packet.name] = packet.value;
      this.emit('set', packet.name, packet.value);
      break;
    default:
      console.warn('Unimplemented packet', packet.method);
  }
};
Scratch.CloudSession.prototype._sendHandshake = function() {
  this._send('handshake', {});
};
Scratch.CloudSession.prototype._sendSet = function(name, value) {
  this._send('set', {
    name: name,
    value: value
  });
};
Scratch.CloudSession.prototype._send = function(method, options) {
  var object = {
    token: this.cloudId,
    token2: this.hash,
    user: this.user.username,
    project_id: this.projectId,
    method: method
  };
  for (var name in options) {
    object[name] = options[name];
  }
  this.connection.write(JSON.stringify(object) + '\n');

  var md5 = crypto.createHash('md5');
  md5.update(this.hash);
  this.hash = md5.digest('hex');
};
Scratch.CloudSession.prototype._addVariable = function(name, value) {
  var self = this;
  this._variables[name] = value;
  Object.defineProperty(this.variables, name, {
    get: function() {
      return self.get(name);
    },
    set: function(value) {
      self.set(name, value);
    }
  });
};

module.exports = Scratch;
