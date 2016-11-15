var instance = null,
    usageInterval = null,
    profilerMemoryDiffInterval = null,
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
        clearInterval(profilerMemoryDiffInterval);
    });

    io.on('connection', function(socket) {  
        //
        socket.emit('onConnect', { message: `connected http://${config.host}:${config.port}` });
        //
        usageInterval = setInterval(()=>{
            socket.emit('memory', { message: memorySnapshot.call() });
            cpuSnapshot(config.interval, (snapshot)=>socket.emit('cpu', { message: snapshot }));            
        }, config.interval);

        var snapshot1 = profiler.takeSnapshot()
            snapshot2 = null, 
            diff = null;
        socket.on('snapshot-diff', function(message) {
            snapshot2 = profiler.takeSnapshot();
            diff = snapshot1.compare(snapshot2);
            snapshot1 = snapshot2;
            snapshot2.delete();
            snapshot2 = null;
            socket.emit('snapshot-diff-result', { message: diff });
            diff = null;
        });

        socket.on('snapshot-to-file', function(message) {  
        });

        socket.on('gc', function(message) { 
            if (global.gc) {
                global.gc();
                socket.emit('gc-result', { message: 'GC collect completed' });
            } else {
                socket.emit('gc-result', { message: 'Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.' });
            }
        });
        
    });

    function memorySnapshot(){
        var snapshot = process.memoryUsage();
        snapshot.time = new Date().getTime();
        return snapshot;
    }

    function cpuSnapshot(interval, cb){
        if (interval <= 1500)
            interval = interval/2;
        else
            interval = 1000;

        const os = require('os');
        const NUMBER_OF_CPUS = os.cpus().length;
        var startTime  = process.hrtime()
        var startUsage = process.cpuUsage()

        clearTimeout(cpuTimout);
        cpuTimout = setTimeout(() => {
            // spin the CPU for 500 milliseconds
            var now = Date.now()
            while (Date.now() - now < 500);

            const newTime = process.hrtime();
            const newUsage = process.cpuUsage();
            const elapTime = process.hrtime(startTime)
            const elapUsage = process.cpuUsage(startUsage)
            startUsage = newUsage;
            startTime = newTime;


            const elapTimeMS = hrtimeToMS(elapTime)

            const elapUserMS = elapUsage.user / 1000; // microseconds to milliseconds
            const elapSystMS = elapUsage.system / 1000;
            const cpuPercent = (100 * (elapUserMS + elapSystMS) / elapTimeMS / NUMBER_OF_CPUS).toFixed(1);
            var snapshot = {};
            snapshot.y = parseInt(cpuPercent);
            snapshot.x = new Date().getTime();
            cb(snapshot);                
        }, interval);

        function hrtimeToMS (hrtime) {
            return hrtime[0] * 1000 + hrtime[1] / 1000000
        }
    }

    /*
    setInterval(()=>{
        var snapshot1 = profiler.takeSnapshot();
        // Export snapshot to file file
        snapshot1.export(function(error, result) {
            fs.writeFileSync('snapshot-'+new Date().getMinutes()+'-'+new Date().getSeconds()+'.heapsnapshot', result);
            snapshot1.delete();
        });
    }, 5000);
    */

    
}

/*
var theThing = null;
var replaceThing = function () {
  var originalThing = theThing;
  var unused = function () {
    if (originalThing)
      console.log("hi");
  };
  theThing = {
    longStr: new Array(1000000).join('*'),
    someMethod: function () {
      console.log(someMessage);
    }
  };
};
setInterval(replaceThing, 1000);
*/

module.exports = VisualV8;