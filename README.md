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

Sets the user's backpack to a single script.
```javascript
var Scratch = require('scratch-api');
Scratch.UserSession.load(function(err, user) {
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

Prints all of the cloud variables for the given project.
```javascript
var Scratch = require('scratch-api');

Scratch.UserSession.load(function(err, user) {
  user.cloudSession(<project>, function(err, cloud) {
    cloud.on('set', function(name, value) {
      console.log(name, value);
    });
  });
});
```

## See Also

This scratch-api module is setup to be easily added too and extended. If you need to make certain requests that are not present it should be easy to add them. The [Scratch Wiki](http://wiki.scratch.mit.edu/wiki/Scratch_API_(2.0)) has some pretty extensive documentation.

If you are feeling Pythonic today, check out Dylan Beswick's very similar [module for Python](https://github.com/Dylan5797/scratchapi).

## API

### Scratch
* [`getProject`](#getProject)
* [`getProjects`](#getProjects)

### Scratch.UserSession
* [`static create`](#UserSession.create)
* [`static prompt`](#UserSession.prompt)
* [`static load`](#UserSession.load)
* [`verify`](#UserSession.verify)
* [`getProject`](#UserSession.getProject)
* [`setProject`](#UserSession.setProject)
* [`getProjects`](#UserSession.getProjects)
* [`getAllProjects`](#UserSession.getAllProjects)
* [`getBackpack`](#UserSession.getBackpack)
* [`setBackpack`](#UserSession.setBackpack)
* [`addComment`](#UserSession.addComment)
* [`cloudSession`](#UserSession.cloudSession)

### Scratch.CloudSession
* [`end`](#CloudSession.end)
* [`get`](#CloudSession.get)
* [`set`](#CloudSession.set)
* [`variables`](#CloudSession.variables)
* [`Event: set`](#CloudSession._set)
* [`Event: end`](#CloudSession._end)

## Scratch

<a name="getProject"></a>
### static getProject(projectId, callback)

Retrieves a JSON object of the given Scratch project.

* `projectId` - The project's ID.
* `callback(err, project)`

<a name="getProjects"></a>
### static getProjects(username, callback)

Retrieves a list of all public projects belonging to given user.

* `username` - Username of owner
* `callback(err, projects)`

## UserSession

<a name="UserSession.create"></a>
### static create(username, password, callback)

Creates a new Scratch session by signing in with the given username and password.

* `username` - The Scratch account username (not case sensitive).
* `password` - The Scratch account password.
* `callback(err, user)`

<a name="UserSession.prompt"></a>
### static prompt(callback)

Creates a new Scratch session by prompting for the username and password via the command line.

* `callback(err, user)`

<a name="UserSession.load"></a>
### static load(callback)

Attempts to create a user from a saved .scratchSession file. If one is not found, [`prompt`](#UserSession.prompt) is used instead and a .scratchSession file is created.

* `callback(err, user)`

<a name="UserSession.verify"></a>
### verify(callback)

Verifies that the user session is fresh and is ready to be used.

* `callback(err, valid)`

<a name="UserSession.getProject"></a>
### getProject(projectId, callback) - alias <a href="#getProject">getProject</a>

<a name="UserSession.setProject"></a>
### setProject(projectId, payload, callback)

Uploads the given payload object or string to the project with the given ID. The user must own the given project or the request will fail.

* `projectId` - The project's ID.
* `payload` - A JSON object or string. If it is an object, it will be stringified before sent.
* `callback(err)`

<a name="UserSession.getProjects"></a>
### getProjects(callback) - alias <a href="#getProjects">getProjects</a>

<a name="UserSession.getAllProjects"></a>
### getAllProject(callback)

Gets a list of all projects (shared and unshared) belonging to the user.

Note: This does not share the same format as `getProjects` as it uses the internal API.

* `callback(err, projects)`

<a name="UserSession.getBackpack"></a>
### getBackpack(callback)

Retrieves the signed in user's backpack as a JSON object.

* `callback(err, payload)`

<a name="UserSession.setBackpack"></a>
### setBackpack(payload, callback)

Uploads the given payload to the user's backpack.

* `payload` - A JSON object or a string to be uploaded.
* `callback(err)`

<a name="UserSession.addComment"></a>
### addComment(options, callback)

Comments on a project, profile, or studio.

* `options` - A JSON object containing options.
  * `project`, `user`, or `studio`: The function checks (in that order) for these values. The user must be a username to post to, and all others must be ids.
  * `parent`: The comment id to reply to. Optional.
  * `replyto`: The user id to address (@username ...). Optional.
  * `content`: The text of the comment to post.
* `callback(err)`

<a name="UserSession.cloudSession"></a>
### cloudSession(projectId, callback)

Connects to a cloud variable session for the given project.

* `projectId` - The project's ID.
* `callback(err, cloudSession)`

## Scratch.CloudSession

<a name="CloudSession.end"></a>
### end()

Used to disconnect from the server and end the cloud session.

<a name="CloudSession.get"></a>
### get(name)

Returns the value of a cloud variable or undefined if it does not exist.

* `name` - The variable name including the cloud (☁) symbol.

<a name="CloudSession.set"></a>
### set(name, value)

Sets the variable with the given name to the given value.

* `name` - The variable name including the cloud (☁) symbol.
* `value` - A new value.

<a name="CloudSession.variables"></a>
### variables

An object used as a hash table for all cloud variables. Variables can both read set directly via this object or through the corresponding [`get`](#CloudSession.get) and [`set`](#CloudSession.set) methods.

<a name="CloudSession._set"></a>
### Event: 'set'

Emitted when a cloud variable is changed.

* `name` - The variable name.
* `value` - The variables new value.

<a name="CloudSession._end"></a>
### Event: 'end'

Emitted when the server closes the connection (should never happen unless the client breaks).
