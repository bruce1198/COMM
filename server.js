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
    constructor(socket, pk) {
        this.inUse = false
        this.socket = socket
        this.idx = pk
    }
}

class Group {
    constructor() {
        this.pk = 0
        this.devices = []
    }
    runOrigin(type, res) {
        var message = 'error'
        console.log('run origin!')
        const serverPath = path.join(pcnnPath, 'model generator', 'alex.py')
        const imagePath = path.join(__dirname, 'images', 'input.jpg')
        var msgbuilder = ''
        try {
            const startTime = new Date().getTime()
            const python = spawn('python', [serverPath, imagePath])
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
                    const totalTime = new Date().getTime() - startTime
                    const str = JSON.parse(msgbuilder.substring(0, msgbuilder.length - 1))
                    res[0].writeHead(200, {
                        'Content-Type': 'application/json'
                    })
                    res[0].end(JSON.stringify({
                        model: type,
                        mode: 'origin',
                        msg: str,
                        time: totalTime,
                        numOfDevices: 1
                    }))
                }
            })
        } catch(err) {
            message = err
        }
    }
    assignJob(type, res) {
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
            var availableDevices = []
            for(var i=0; i<this.devices.length; i++) {
                if(!this.devices[i].inUse) {
                    console.log(this.devices[i].idx)
                    available++
                    availableDevices.push(this.devices[i])
                }
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
            const port = 30000 + Math.floor(Math.random() * 1000)
            // start pcnn server
            const serverPath = path.join(pcnnPath, 'codegen', type, 'server.py')
            const imagePath = path.join(__dirname, 'images', 'input.jpg')
            var msgbuilder = ''
            try {
                const startTime = new Date().getTime()
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
                        const totalTime = new Date().getTime() - startTime
                        const str = JSON.parse(msgbuilder.substring(0, msgbuilder.length - 1))
                        res[0].writeHead(200, {
                            'Content-Type': 'application/json'
                        })
                        res[0].end(JSON.stringify({
                            model: type,
                            mode: 'parallelized',
                            msg: str,
                            time: totalTime,
                            numOfDevices: numOfDevices
                        }))
                    }
                })
            } catch(err) {
                message = err
            }
            var deviceIdx = 0
            for(var i=0; i<numOfDevices; i++) {
                console.log(i)
                availableDevices[i].idx = i 
                availableDevices[i].socket.on('over', (msg)=>  {
                    // console.log(msg.clientid, 'over')
                    availableDevices[msg.clientid].inUse = false
                })
                availableDevices[i].inUse = true
                availableDevices[i].socket.emit('init', {
                    id: `${deviceIdx}`,
                    clientid: i,
                    port: port,
                    type: type,
                })
                deviceIdx++
            }
        })
    }
    join(client) {
        this.devices.push(new Device(client, this.pk))
        this.pk++
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
    var devices = []
    group.devices.forEach((device) => {
        devices.push({
            inUse: device.inUse,
            socketid: device.socket.id,
            addr: device.socket.handshake.address
        })
    })
    socket.emit('update', devices)
    setInterval(()=>{
        var devices = []
        group.devices.forEach((device) => {
            devices.push({
                inUse: device.inUse,
                socketid: device.socket.id,
                addr: device.socket.handshake.address
            })
        })
        socket.emit('update', devices)
    }, 1000)

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
            if(req.body.mode == 'origin')
                group.runOrigin(req.body.model, [res])
            else if(req.body.mode == 'parallelized')
                group.assignJob(req.body.model, [res])
        })
    }
    else {
        res.send('Only Alexnet is acceptible!')
    }
})

app.get('/download/:model', (req, res) => {
    var model = req.params.model
    var filePath = path.join(pcnnPath, 'models', model)
    var stat = fs.statSync(filePath)
    // res.set('Content-Disposition', 'attachment;filename='+model+'.model')
    res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size
    })

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