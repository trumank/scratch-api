var http = require('http');
var net = require('net');
var util = require('util');
var events = require('events');

var SERVER = 'scratch.mit.edu';
var PROJECTS_SERVER = 'projects.scratch.mit.edu';
var CLOUD = 'cloud.scratch.mit.edu';
var CLOUD_PORT = 531;

function request(options, cb) {
  var headers = {
    'Cookie': 'scratchcsrftoken=a;',
    'X-CSRFToken': 'a'
  };
  if (options.headers) {
    for (var name in options.headers) {
      headers[name] = options.headers[name];
    }
  }
  if (options.body) headers['Content-Length'] = options.body.length;
  if (options.sessionId) headers['Cookie'] += 'scratchsessionsid=' + options.sessionId + ';';
  var request = http.request({
    hostname: options.hostname || SERVER,
    port: 80,
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

Scratch.UserSession = function(username, id, sessionId) {
  this.username = username;
  this.id = id;
  this.sessionId = sessionId;
};
Scratch.UserSession.prototype.setProject = function(projectId, payload, cb) {
  var self = this;
  request({
    hostname: PROJECTS_SERVER,
    path: '/internalapi/project/' + projectId + '/set/',
    method: 'POST',
    body: JSON.stringify(payload),
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
    self.sendHandshake();
    cb();
  });
  this.connection.setEncoding('utf8');

  var stream = '';
  var index = 0;
  this.connection.on('data', function(chunk) {
    stream += chunk;
    var next;
    while (~(next = stream.indexOf('\n', index))) {
      var line = stream.slice(index, next);
      var packet;
      try {
        packet = JSON.parse(line);
      } catch (err) {
        console.warn('Invalid packet %s', line);
        return;
      }
      self.handlePacket(packet);
      index = next + 1;
    }
    stream = stream.slice(index, -1);
    index = 0;
  });
};
Scratch.CloudSession.prototype.handlePacket = function(packet) {
  switch (packet.method) {
    case 'set':
      if (!({}).hasOwnProperty.call(this.variables, packet.name)) {
        this.addVariable(packet.name, packet.value)
      }
      this._variables[packet.name] = packet.value;
      this.emit('set', packet.name, packet.value);
      this.emit(packet.name, packet.value);
      break;
    default:
    console.warn('Unimplemented packet', packet.method);
  }
};
Scratch.CloudSession.prototype.sendHandshake = function() {
  this.send('handshake', {});
};
Scratch.CloudSession.prototype.sendSet = function(name, value) {
  this.send('set', {
    name: name,
    value: value
  });
};
Scratch.CloudSession.prototype.send = function(method, options) {
  var object = {
    token: this.cloudId,
    user: this.user.username,
    project_id: this.projectId,
    method: method
  };
  for (var name in options) {
    object[name] = options[name];
  }
  this.connection.write(JSON.stringify(object) + '\n');
};
Scratch.CloudSession.prototype.addVariable = function(name, value) {
  var self = this;
  this._variables[name] = value;
  Object.defineProperty(this.variables, name, {
    get: function() {
      return self._variables;
    },
    set: function(value) {
      self._variables[name] = value;
      self.sendSet(name, value);
    }
  });
};

module.exports = Scratch;
