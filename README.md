# scratch-api

A utility for interacting with the Scratch 2.0 website.

## Installation

Install with npm:

```sh
npm install scratch-api
```
Or by cloning this repository:
```sh
git clone https://github.com/trumank/scratch-api.git
```

## Examples

```javascript
var Scratch = require('scratch-api');
Scratch.createUserSession(username, password, function(err, user) {
  if (err) return console.error(err);
  user.setBackpack([{
    type: 'script',
    name: '',
    scripts: [[['say:', 'Cheers!']]]
  }],
  function(err, res) {
    if (err) return console.error(err);
    console.log('Backpack set');
  });
});
```

## API

### Scratch
* [`createUserSession`](#createUserSession)
* [`getProject`](#getProject)

### Scratch.UserSession
* [`getProject`](#UserSession.getProject)
* [`setProject`](#UserSession.setProject)
* [`getBackpack`](#UserSession.getBackpack)
* [`setBackpack`](#UserSession.setBackpack)
* [`cloud`](#UserSession.cloud)

### Scratch.CloudSession
* [`connect`](#CloudSession.connect)
* [`end`](#CloudSession.end)
* [`get`](#CloudSession.get)
* [`set`](#CloudSession.set)
* [`variables`](#CloudSession.variables)
* [`Event: set`](#CloudSession._set)
* [`Event: end`](#CloudSession._end)

## Scratch

<a name="createUserSession"/>
### Scratch.createUserSession(username, password, callback)

Created a new Scratch session by signing in with the given username and password.

__Arguments__

* `username` - The Scratch account username (not case sensitive).
* `password` - The Scratch account password.
* `callback(err, user)` - A callback that is called with the resulting user or an error if one occurs.

<a name="getProject"/>
### Scratch.getProject(projectId, callback)

Retrieves a JSON object of the given Scratch project. Equivalent to Scratch.UserSession.getProject but does not require being signed in.

__Arguments__

* `projectId` - The project's ID.
* `callback(err, project)` - A callback that is called with the resulting project or an error if one occurs.

## UserSession

<a name="UserSession.getProject"/>
### Scratch.UserSession.getProject(projectId, callback)

Retrieves a JSON object of the given Scratch project.

__Arguments__

* `projectId` - The project's ID.
* `callback(err, project)` - A callback that is called with the resulting project or an error if one occurs.

<a name="UserSession.setProject"/>
### Scratch.UserSession.setProject(projectId, payload, callback)

Uploads the given payload object or string to the project with the given ID. The user must own the given project or the request will fail.

__Arguments__

* `projectId` - The project's ID.
* `payload` - A JSON object or string. If it is an object, it will be stringified before sent.
* `callback(err)` - A callback that is called when it finishes and or an error occurs.

<a name="UserSession.getBackpack"/>
### Scratch.UserSession.getBackpack(callback)

Retrieves the signed in user's backpack as a JSON object.

__Arguments__

* `callback(err, payload)` - A callback that is called with the returned backpack object or an error if one occurs.

<a name="UserSession.setBackpack"/>
### Scratch.UserSession.setBackpack(payload, callback)

Uploads the given payload to the user's backpack.

__Arguments__
* `payload` - A JSON object or a string to be uploaded.
* `callback(err)` - A callback that is called when the request finishes or an error occurs.

<a name="UserSession.cloud"/>
### Scratch.UserSession.cloud(projectId, callback)

Connects to a cloud variable session for the given project.

__Arguments__
* `projectId` - The project's ID.
* `callback(err, cloudSession)` - A callback that is called with the returned CloudSession object or if an error occurs.

## Scratch.CloudSession

<a name="CloudSession.connect"/>
### Scratch.CloudSession.connect(callback)

Used to start a newly created CloudSession.

__Arguments__
* `callback` - A callback that is called when a connection is made or an error occurs.

<a name="CloudSession.end"/>
### Scratch.CloudSession.end()

Used to disconnect from the server and end the cloud session.

<a name="CloudSession.get"/>
### Scratch.CloudSession.get(name)

Returns the value of a cloud variable or undefined if it does not exist.

__Arguments__
* `name` - The variable name including the cloud (☁) symbol.

<a name="CloudSession.set"/>
### Scratch.CloudSession.set(name, value)

Sets the variable with the given name to the given value.

__Arguments__
* `name` - The variable name including the cloud (☁) symbol.
* `value` - A new value.

<a name="CloudSession.variables"/>
### Scratch.CloudSession.variables

An object used as a hash table for all cloud variables. Variables can both read set directly via this object or through the corresponding [`get`](#CloudSession.get) and [`set`](#CloudSession.set) methods.

<a name="CloudSession._set"/>
### Scratch.CloudSession Event: 'set'

Emitted when a cloud variable is changed.

__Parameters__
* `name` - The variable name.
* `value` - The variables new value.

<a name="CloudSession._end"/>
### Scratch.CloudSession Event: 'end'

Emitted when the server closes the connection (should never happen unless the client breaks).
