# visualV8

this module provides node.js process memory and CPU usage data.

# Installation
```js
npm install visualv8
```

## Features

    * socket.io api for cosuming memory and CPU usage data
    * Web UI for visualizing memory and CPU process usage

## Install & run the sample application (usage demo) 
    
    cd examples
    npm install
    node index.js

Then access [http://localhost:1919](http://localhost:1919)

## How to use?

just add the module to your code base and the UI will be by default on : http://localhost:1919

 ```js
const visualV8 = require('../index.js')();
```

to configure host and port your self:

 ```js
const visualV8 = require('../index.js')({
    host: 'localhost',
    port: 8081,
    interval: 6000//the time to push usage data to client
});
```
