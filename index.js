var instance = null,
    usageInterval = null,
    cpuTimout = null;

const defaultConfig = {
    host: 'localhost',
    port: 1919,
    interval: 3000
}

const VisualV8 = function(config){
    var config = config || defaultConfig;
    if (instance == null)
        instance = new Run(config);
    return instance;
}

function Run(config){
    const v8 = require('v8');
    const os  = require('os');
    var profiler = require('v8-profiler');
    var fs = require('fs');
    var server = require('http').createServer(handleRequest.bind(this));
    var io = require('socket.io')(server);

    function handleRequest(request, response){
        require('fs').readFile(__dirname+'\\index.html', 'utf8', function (err, data) {
            if (err) {
                return response.end('could not read file index.html __dirname:'+__dirname+', err:'+err);
            }
            response.statusCode = 200;
            response.setHeader('Content-Type', 'text/html');
            response.end(data);
        });
    }

    server.listen(config.port, config.host, ()=>{
        console.log("Server listening on: http://%s:%s", config.host, config.port);
    }); 

    io.on('end', function (){
        clearInterval(usageInterval);
    });

    io.on('connection', function(socket) {  
        //
        socket.emit('onConnect', { message: `connected http://${config.host}:${config.port}` });
        //
        usageInterval = setInterval(()=>{
            socket.emit('memory', { message: memorySnapshot.call() });
            cpuSnapshot((snapshot)=>socket.emit('cpu', { message: snapshot }));            
        }, config.interval);

        socket.on('heap-snapshot', function(message) {  
            var snapshot1 = profiler.takeSnapshot();
            // Export snapshot to file file
            snapshot1.export(function(error, result) {
                socket.emit('heap-snapshot-result', { message: result });
                snapshot1.delete();
                snapshot1 = null;
            });
        });

        socket.on('cpu-snapshot', function(message) {  
            profiler.startProfiling('1', true);
            var profile1 = profiler.stopProfiling();
            // Export snapshot to file file
            profile1.export(function(error, result) {
                socket.emit('cpu-snapshot-result', { message: result });
                profile1.delete();
                profile1 = null;
            });
        });

        socket.on('gc', function(message) {
            if (global.gc) {
                global.gc();
                socket.emit('gc-result', { message: 'GC collect completed' });
            } else {
                socket.emit('gc-result', { message: 'Garbage collection unavailable. Pass --expose-gc when launching node to enable forced garbage collection.' });
            }
        });
        
    });

    function memorySnapshot(){
        var snapshot = process.memoryUsage();
        snapshot.time = new Date().getTime();
        snapshot.heapSpaceStatistics = v8.getHeapSpaceStatistics();
        return snapshot;
    }

    function cpuSnapshot(cb){
        calcCpuUsage((vsnapshot)=>{
            return cb({
                usage: vsnapshot,
                time: new Date().getTime()
            });
        });
    };
    
    function calcCpuUsage(cb){
        
        var cpu = os.cpus();

        var counter = 0;
        var total=0;

        var free=0;
        var sys=0;
        var user=0;

        for (var i = 0; i<cpu.length ; i++) {
            counter++;
            total=parseFloat(cpu[i].times.idle)+parseFloat(cpu[i].times.sys)+parseFloat(cpu[i].times.user)+parseFloat(cpu[i].times.irq)+parseFloat(cpu[i].times.nice);
            free+=100*(parseFloat(cpu[i].times.idle)/total);
            sys+=100*(parseFloat(cpu[i].times.sys)/total);
            user+=100*(parseFloat(cpu[i].times.user)/total);
        };
        return cb({
            cpuCount: i,
            free: (free/counter),
            user: (user/counter),
            system: (sys/counter)
        });
    }
}

module.exports = VisualV8;