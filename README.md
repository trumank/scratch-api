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
* [`createUserSession`](#Scratch.createUserSession)
* [`getProject`](#Scratch.getProject)

### Scratch.UserSession
* [`getProject`](#Scratch.UserSession.getProject)
* [`setProject`](#Scratch.UserSession.setProject)
* [`getBackpack`](#Scratch.UserSession.getBackpack)
* [`setBackpack`](#Scratch.UserSession.setBackpack)
* [`cloud`](#Scratch.UserSession.cloud)

### Scratch.CloudSession
* [`connect`](#Scratch.CloudSession.connect)
* [`end`](#Scratch.CloudSession.end)
* [`variables`](#Scratch.CloudSession.variables)
* Event: [`set`](#Scratch.CloudSession:set)
