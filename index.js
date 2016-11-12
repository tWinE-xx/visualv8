var instance = null;

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
    var server = require('http').createServer(handleRequest.bind(this));
    //var server = require('http').Server(app);  
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

    io.on('connection', function(socket) {  
        socket.emit('onConnect', { message: `connected http://${config.host}:${config.port}` });
        setInterval(()=>{
            socket.emit('memory', { message: memorySnapshot.call() });
            cpuSnapshot((snapshot)=>socket.emit('cpu', { message: snapshot }));
        }, config.interval)
    }); 

    function memorySnapshot(){
        var snapshot = process.memoryUsage();
        snapshot.time = new Date().getTime();
        return snapshot;
    }

    function cpuSnapshot(cb){
        const os = require('os');
        const NUMBER_OF_CPUS = os.cpus().length;
        var startTime  = process.hrtime()
        var startUsage = process.cpuUsage()

        setTimeout(() => {
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
        }, 1000);

        function hrtimeToMS (hrtime) {
            return hrtime[0] * 1000 + hrtime[1] / 1000000
        }

    }
}

module.exports = VisualV8;