const app = require('express')()
const express = require('express')
const fileupload = require('express-fileupload')
const server = require('http').createServer(app)
const { spawn } = require('child_process')
const path = require('path')
const ss = require('socket.io-stream')
const fs = require('fs')
const download = require('download-git-repo')
const io = require('socket.io')(server)
const io2 = require('socket.io')(server, {
    path: '/realtime'
})
const config = require('./config')

const serverhost = config.serverhost
const port = config.port
const pcnnPath = config.pcnn_path

if(!fs.existsSync(pcnnPath)) {
    console.log('Could not find the PCNN path')
    console.log('Downloading the basic PCNN...')
    download('direct:https://github.com/bruce1198/PCNN.git', pcnnPath, function (err) {
        if (err) {
            console.log(err)
        }

    })
    return
}


class Device {
    constructor(socket) {
        this.inUse = false
        this.socket = socket
        this.idx = -1
    }
}

class Group {
    constructor() {
        this.devices = []
    }
    assignJob(type, res) {
        for(var i=0; i<this.devices.length; i++) {
            console.log(i, this.devices[i].inUse)
        }
        var message = 'error'
        console.log('assign job!')
        const dirPath =  path.join(pcnnPath, 'codegen', type)
        fs.readdir(dirPath, (err, files) => {
            if(err) {
                console.log(err)
                message = err
                res[0].writeHead(200, {
                    'Content-Type': 'application/json'
                })
                res[0].end(JSON.stringify({
                    model: type,
                    msg: message
                }))
                return
            }
            // dont count the server.py
            const numOfDevices = files.length - 1
            var available = 0
            for(var i=0; i<this.devices.length; i++) {
                if(!this.devices[i].inUse)
                    available++;
            }
            if(available < numOfDevices) {
                console.log('Num of available devices is not enough to assign the inference!')
                message = 'Num of available devices is not enough to assign the inference!'
                res[0].writeHead(200, {
                    'Content-Type': 'application/json'
                })
                res[0].end(JSON.stringify({
                    model: type,
                    msg: message
                }))
                return 
            }
            // send .py file to the selected devices
            // TODO: need to generate distinct port for each calculation
            const port = 9950
            var deviceIdx = 0
            for(var i=0; i<numOfDevices; i++) {
                if(this.devices[i].inUse)
                    continue
                this.devices[i].idx = i 
                this.devices[i].socket.on('over', (msg)=>  {
                    console.log(msg.clientid, 'over')
                    this.devices[msg.clientid].inUse = false
                })
                this.devices[i].inUse = true
                this.devices[i].socket.emit('init', {
                    id: `${deviceIdx}`,
                    clientid: i,
                    port: port
                })
                deviceIdx++
            }

            // start pcnn server
            const serverPath = path.join(pcnnPath, 'codegen', type, 'server.py')
            const imagePath = path.join(__dirname, 'images', 'input.jpg')
            var msgbuilder = ''
            try {
                const python = spawn('python', [serverPath, numOfDevices, serverhost, port, imagePath])
                python.on('error', function(err) {
                    message = err
                })
                python.stdout.on('data', function (data) {
                    msgbuilder += data.toString()
                    console.log(data.toString())
                })
                python.stderr.on('data', function(data) {
                    message = data.toString()
                    console.log(data.toString())
                })
                python.on('close', (code) => {
                    if(code == 0) {
                        const str = msgbuilder.substring(0, msgbuilder.length - 1)
                        res[0].writeHead(200, {
                            'Content-Type': 'application/json'
                        })
                        res[0].end(JSON.stringify({
                            model: type,
                            msg: str 
                        }))
                    }
                })
            } catch(err) {
                message = err
            }
        })
    }
    join(client) {
        this.devices.push(new Device(client))
    }
    leave(client) {
        var index = -1
        for(var i=0; i<this.devices.length; i++) {
            if(client.id === this.devices[i].socket.id) {
                index = i
                break
            }
        }
        if(index !== -1) {
            console.log(this.devices[index].socket.id, 'leave')
            this.devices.splice(index, 1)
            console.log('device num: '+this.devices.length)
        }
        else
            console.log('devices not found')
    }
}

var group = new Group()

io.on('connection', (socket) => {
    // console.log(socket.id)
    group.join(socket)
    console.log(socket.id, socket.handshake.address, 'connect!')
    // socket.send('Hello, device!')

    socket.on('model-check', (msg) => {

    })

    socket.on('disconnect', () => {
        group.leave(socket)
    })
})

io2.on('connection', function (socket) {

    console.log('a realtime client connect')
    const interval = setInterval(()=>{
        socket.emit('update', {
            msg: 'update message!'
        })
    }, 5000)

    socket.on('message', function (message) {
        socket.send(message)
    })

})

app.use(
    fileupload(),
)
app.use(express.static(__dirname + '/pages'))
app.get('/', (req, res) => {
    fs.readFile('./pages/index.html', function (err, html) {
        if (err) {
            throw err; 
        }
        res.writeHeader(200, {"Content-Type": "text/html"})
        res.write(html); 
        res.end()
    })
})

app.post('/inference', (req, res) => {
    // console.log(req)
    if(req.body.model === 'alexnet') {
        const image = req.files.photo
        const path = __dirname + '/images/input.jpg'
        image.mv(path, (error) => {
            if (error) {
                console.error(error)
                res.writeHead(500, {
                    'Content-Type': 'application/json'
                })
                res.end(JSON.stringify({ status: 'error', message: error }))
                return
            }
            group.assignJob(req.body.model, [res])
        })
    }
    else {
        res.send('Only Alexnet is acceptible!')
    }
})

app.get('/download/:model', (req, res) => {
    var model = req.params.model
    var filePath = path.join(pcnnPath, 'models', model);
    var stat = fs.statSync(filePath)
    res.writeHead(200, {
        'Content-Type': 'application/binary',
        'Content-Length': stat.size
    });

    var readStream = fs.createReadStream(filePath)
    readStream.pipe(res)
})

app.get('/download', (req, res) => {
    fs.readFile('./pages/download/index.html', function (err, html) {
        if (err) {
            throw err; 
        }
        res.writeHeader(200, {"Content-Type": "text/html"})
        res.write(html); 
        res.end()
    })
})

app.get('/status', (req, res) => {
    fs.readFile('./pages/status/index.html', function (err, html) {
        if (err) {
            throw err; 
        }
        res.writeHeader(200, {"Content-Type": "text/html"})
        res.write(html); 
        res.end()
    })
})

server.listen(port, () => {
    console.log(`Socket server listen at port ${port}`)
})