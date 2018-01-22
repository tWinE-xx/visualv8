let instance = null;
let usageInterval = null;

const defaultConfig = {
    host: 'localhost',
    port: 1919,
    interval: 3000
};

const VisualV8 = function (config) {
    config = config || defaultConfig;
    instance = instance || new Run(config);
    return instance;
};

function Run(config) {
    const v8 = require('v8');
    const os = require('os');
    const path = require('path');
    const profiler = require('v8-profiler');
    const fs = require('fs');
    const server = require('http').createServer(handleRequest.bind(this));
    const io = require('socket.io')(server);

    function handleRequest(request, response) {
        fs.readFile(path.join(__dirname, 'index.html'), 'utf8', function (err, data) {
            if (err) {
                return response.end('could not read file index.html __dirname:' + __dirname + ', err:' + err);
            }
            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/html');
            response.end(data);
        });
    }

    server.listen(config.port, config.host, () => {
        console.log('VisualV8 UI: http://%s:%s', config.host, config.port);
    });

    io.on('end', function () {
        clearInterval(usageInterval);
    });

    io.on('connection', function (socket) {
        socket.emit('onConnect', { message: `connected http://${config.host}:${config.port}` });

        usageInterval = setInterval(() => {
            socket.emit('memory', { message: memorySnapshot.call() });
            cpuSnapshot((snapshot) => socket.emit('cpu', { message: snapshot }));
        }, config.interval);

        socket.on('heap-snapshot', function (message) {
            let snapshot1 = profiler.takeSnapshot();
            // Export snapshot to file file
            snapshot1.export(function (error, result) {
                socket.emit('heap-snapshot-result', { message: result });
                snapshot1.delete();
                snapshot1 = null;
            });
        });

        socket.on('cpu-snapshot', function (message) {
            profiler.startProfiling('1', true);
            let profile1 = profiler.stopProfiling();
            // Export snapshot to file file
            profile1.export(function (error, result) {
                socket.emit('cpu-snapshot-result', { message: result });
                profile1.delete();
                profile1 = null;
            });
        });

        socket.on('gc', function (message) {
            if (global.gc) {
                global.gc();
                socket.emit('gc-result', { message: 'GC collect completed' });
            } else {
                socket.emit('gc-result', { message: 'Garbage collection unavailable. Pass --expose-gc when launching node to enable forced garbage collection.' });
            }
        });

    });

    function memorySnapshot() {
        const snapshot = process.memoryUsage();
        snapshot.time = new Date().getTime();
        snapshot.heapSpaceStatistics = v8.getHeapSpaceStatistics();
        return snapshot;
    }

    function cpuSnapshot(cb) {
        const startMeasure = cpuAverage();
        setTimeout(function () {
            const endMeasure = cpuAverage();
            const idleDifference = endMeasure.idle - startMeasure.idle;
            const totalDifference = endMeasure.total - startMeasure.total;
            const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
            return cb({
                y: percentageCPU,
                x: new Date().getTime()
            });
        }, 1000);
    }

    function cpuAverage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        for (let i = 0, len = cpus.length; i < len; i++) {
            const cpu = cpus[i];
            for (let type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        }
        return {
            idle: totalIdle / cpus.length,
            total: totalTick / cpus.length
        };
    }
}

module.exports = VisualV8;
