# visualV8

> This module provides node.js process memory and CPU usage data.

## Installation

```bash
npm install visualv8
```

## Features

* `Socket.io` api for consuming memory and CPU usage data
* Web UI for visualizing memory and CPU process usage

## Install & run the sample application (usage demo) 

```bash
cd example
npm install
node index.js
```

Then access [http://localhost:1919](http://localhost:1919)

## How to use?

Just add the module to your code base and the UI will be by default on:
http://localhost:1919

 ```js
const visualV8 = require('visualv8')();
```

Configure host and port your self:

 ```js
const visualV8 = require('visualv8')({
    host: 'localhost',
    port: 8081,
    interval: 6000 // Time to push usage data to client
});
```
