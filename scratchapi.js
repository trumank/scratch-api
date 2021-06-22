var https = require('https');
var util = require('util');
var events = require('events');
var fs = require('fs');
var WebSocket = require('ws');

var SERVER = 'scratch.mit.edu';
var PROJECTS_SERVER = 'projects.scratch.mit.edu';
var CDN_SERVER = 'cdn.scratch.mit.edu';
var CLOUD_SERVER = 'clouddata.scratch.mit.edu';
var API_SERVER = 'api.scratch.mit.edu';

var SESSION_FILE = '.scratchSession';

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
  if (options.body) headers['Content-Length'] = Buffer.byteLength(options.body);
  if (options.sessionId) headers.Cookie += 'scratchsessionsid=' + options.sessionId + ';';
  var req = https.request({
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
  req.on('error', cb);
  if (options.body) req.write(options.body);
  req.end();
}

function requestJSON(options, cb) {
  request(options, function(err, body, response) {
    if (err) return cb(err);
    try {
      cb(null, JSON.parse(body));
    } catch (e) {
      cb(e);
    }
  });
}

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

Scratch.getProject = function(projectId, cb) {
  requestJSON({
    hostname: PROJECTS_SERVER,
    path: '/' + projectId,
    method: 'GET',
  }, cb);
};
Scratch.getProjects = function(username, cb) {
  requestJSON({
    hostname: API_SERVER,
    path: '/users/' + username + '/projects',
    method: 'GET'
  }, cb);
};
Scratch.UserSession = function(username, id, sessionId) {
  this.username = username;
  this.id = id;
  this.sessionId = sessionId;
};
Scratch.UserSession.create = function(username, password, cb) {
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
      cb(null, new Scratch.UserSession(user.username, user.id, parseCookie(response.headers['set-cookie'][0]).scratchsessionsid));
    } catch (e) {
      cb(e);
    }
  });
};
Scratch.UserSession.prompt = function(cb) {
  var prompt = require('prompt');
  prompt.start();
  prompt.get([
    { name: 'username' },
    { name: 'password', hidden: true }
  ], function(err, results) {
    if (err) return cb(err);
    Scratch.UserSession.create(results.username, results.password, cb);
  });
};
Scratch.UserSession.load = function(cb) {
  function prompt() {
    Scratch.UserSession.prompt(function(err, session) {
      if (err) return cb(err);
      session._saveSession(function() {
        cb(null, session);
      });
    });
  }
  fs.readFile(SESSION_FILE, function(err, data) {
    if (err) return prompt();
    var obj = JSON.parse(data.toString());
    var session = new Scratch.UserSession(obj.username, obj.id, obj.sessionId);
    session.verify(function(err, valid) {
      if (err) return cb(err);
      if (valid) return cb(null, session);
      prompt();
    });
  });
};
Scratch.UserSession.prototype._saveSession = function(cb) {
  fs.writeFile(SESSION_FILE, JSON.stringify({
    username: this.username,
    id: this.id,
    sessionId: this.sessionId
  }), cb);
};
Scratch.UserSession.prototype.verify = function(cb) {
  request({
    path: '/messages/ajax/get-message-count/', // probably going to change quite soon
    sessionId: this.sessionId
  }, function(err, body, response) {
    cb(null, !err && response.statusCode === 200);
  });
};
Scratch.UserSession.prototype.getProject = Scratch.getProject;
Scratch.UserSession.prototype.getProjects = function(cb) {
  Scratch.getProjects(this.username, cb);
};

Scratch.UserSession.prototype.getAllProjects = function(cb) {
  requestJSON({
    hostname: SERVER,
    path: '/site-api/projects/all/',
    method: 'GET',
    sessionId: this.sessionId
  }, cb);
};
Scratch.UserSession.prototype.setProject = function(projectId, payload, cb) {
  if (typeof payload !== 'string') payload = JSON.stringify(payload);
  requestJSON({
    hostname: PROJECTS_SERVER,
    path: '/internalapi/project/' + projectId + '/set/',
    method: 'POST',
    body: payload,
    sessionId: this.sessionId
  }, cb);
};
Scratch.UserSession.prototype.getBackpack = function(cb) {
  requestJSON({
    hostname: SERVER,
    path: '/internalapi/backpack/' + this.username + '/get/',
    method: 'GET',
    sessionId: this.sessionId
  }, cb);
};
Scratch.UserSession.prototype.setBackpack = function(payload, cb) {
  if (typeof payload !== 'string') payload = JSON.stringify(payload);
  requestJSON({
    hostname: SERVER,
    path: '/internalapi/backpack/' + this.username + '/set/',
    method: 'POST',
    body: payload,
    sessionId: this.sessionId
  }, cb);
};
Scratch.UserSession.prototype.addComment = function(options, cb) {
  var type, id;
  if (options.project) {
    type = 'project';
    id = options.project;
  } else if (options.user) {
    type = 'user';
    id = options.user;
  } else if (options.studio) {
    type = 'gallery';
    id = options.studio;
  }
  request({
    hostname: SERVER,
    path: '/site-api/comments/' + type + '/' + id + '/add/',
    method: 'POST',
    body: JSON.stringify({
      content: options.content,
      parent_id: options.parent || '',
      commentee_id: options.replyto || '',
    }),
    sessionId: this.sessionId
  }, cb);
};
Scratch.UserSession.prototype.cloudSession = function(projectId, cb) {
    Scratch.CloudSession._create(this, projectId, cb);
};

Scratch.CloudSession = function(user, projectId) {
  this.user = user;
  this.projectId = '' + projectId;
  this.connection = null;
  this.attemptedPackets = [];
  this.variables = Object.create(null);
  this._variables = Object.create(null);
};
util.inherits(Scratch.CloudSession, events.EventEmitter);
Scratch.CloudSession._create = function(user, projectId, cb) {
  var session = new Scratch.CloudSession(user, projectId);
  session._connect(function(err) {
    if (err) return cb(err);
    cb(null, session);
  });
};
Scratch.CloudSession.prototype._connect = function(cb) {
  var self = this;

  this.connection = new WebSocket('wss://' + CLOUD_SERVER + '/', [], {
      headers: {
        cookie: 'scratchsessionsid=' + this.user.sessionId + ';',
        origin: 'https://scratch.mit.edu'
      }
    }
  );
  this.connection.on('open', function() {
    self._sendHandshake();
    for (var i = 0; i < self.attemptedPackets.length; i++) {
      self._sendPacket(self.attemptedPackets[i]);
    }
    self.attemptedPackets = [];
    if (cb) cb();
  });

  this.connection.on('close', function() {
    // Reconnect because Scratch disconnects clients after no activity
    // Probably will cause some data to not be pushed
    self._connect();
  });

  var stream = '';
  this.connection.on('message', function(chunk) {
    stream += chunk;
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
  if (this.connection) {
    this.connection.close();
  }
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
        this._addVariable(packet.name, packet.value);
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
    user: this.user.username,
    project_id: this.projectId,
    method: method
  };
  for (var name in options) {
    object[name] = options[name];
  }

  this._sendPacket(JSON.stringify(object) + '\n');
};
Scratch.CloudSession.prototype._sendPacket = function(data) {
  if (this.connection.readyState === WebSocket.OPEN) {
    this.connection.send(data);
  } else {
    this.attemptedPackets.push(data);
  }
};
Scratch.CloudSession.prototype._addVariable = function(name, value) {
  var self = this;
  this._variables[name] = value;
  Object.defineProperty(this.variables, name, {
    enumerable: true,
    get: function() {
      return self.get(name);
    },
    set: function(value) {
      self.set(name, value);
    }
  });
};

module.exports = Scratch;
