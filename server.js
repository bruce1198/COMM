const app = require('express')()
const express = require('express')
const fileupload = require('express-fileupload')
const server = require('http').createServer(app)
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const download = require('download-git-repo')
const io = require('socket.io')(server)
const io2 = require('socket.io')(server, {
    path: '/realtime'
})
let infoGroup = []
const io3 = require('socket.io')(server, {
    path: '/device'
})
const config = require('./config')
const table = require('./table')

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
        this.info = {}
    }
}

class Group {
    constructor() {
        this.pk = 0
        this.devices = []
    }
    runOrigin(type, res) {
        var message = ''
        console.log('run origin!')
        var available = 0
        var availableDevices
        for(var i=0; i<this.devices.length; i++) {
            if(!this.devices[i].inUse) {
                available++
                availableDevices = this.devices[i]
            }
        }
        if(available < 1) {
            console.log('Num of available devices is not enough to assign the inference!')
            message = 'Num of available devices is not enough to assign the inference!'
            res[0].status(200).json({
                model: type,
                msg: message
            })
            return 
        }
        const path = __dirname + '/images/input.jpg'
        const buf = fs.readFileSync(path)
        availableDevices.socket.on('overOrigin', (msg)=>  {
            // console.log(msg.clientid, 'over')
            console.log(msg.output)
            let info = msg
            info['total'] = 1
            availableDevices.inUse = false
            // console.log(infoGroup)
            for(let socket of infoGroup) {
                socket.emit('updateOrigin', info)
            }
        })
        availableDevices.inUse = true
        availableDevices.socket.emit('initOrigin', {
            image: buf.toString('base64'),
            type: type,
        })
        // const serverPath = path.join(pcnnPath, 'model generator', type+'.py')
        // const imagePath = path.join(__dirname, 'images', 'input.jpg')
        // var msgbuilder = ''
        // try {
        //     const startTime = new Date().getTime()
        //     const python = spawn('python', [serverPath, imagePath])
        //     python.on('error', function(err) {
        //         message = err
        //     })
        //     python.stdout.on('data', function (data) {
        //         msgbuilder += data.toString()
        //         // console.log(data.toString())
        //     })
        //     python.stderr.on('data', function(data) {
        //         message = data.toString()
        //         console.log(data.toString())
        //     })
        //     python.on('close', (code) => {
        //         if(code == 0) {
        //             const totalTime = new Date().getTime() - startTime
        //             var str = {}
        //             try {
        //                 str = JSON.parse(msgbuilder)
        //                 str['class'] = table[str['index']]
        //                 console.log(str)
        //             } catch(e) {

        //             }
        //             res[0].writeHead(200, {
        //                 'Content-Type': 'application/json'
        //             })
        //             res[0].end(JSON.stringify({
        //                 model: type,
        //                 mode: 'origin',
        //                 msg: str,
        //                 time: totalTime,
        //                 numOfDevices: 1
        //             }))
        //         }
        //     })
        // } catch(err) {
        //     message = err
        // }
    }
    assignJob(type, res) {
        var message = 'error'
        console.log('run parallel')
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
                const python = spawn('python', [serverPath, numOfDevices, serverhost, port, imagePath])
                python.on('error', function(err) {
                    message = err
                    console.log(err.message)
                })
                python.stdout.on('data', function (data) {
                    msgbuilder += data.toString()
                })
                python.stderr.on('data', function(data) {
                    message = data.toString()
                    console.log(data.toString())
                })
                python.on('close', (code) => {
                    if(code == 0) {
                        var str = {}
                        try {
                            str = JSON.parse(msgbuilder)
                            str['class'] = table[str['index']]
                            console.log(str)
                        } catch(e) {
                            
                        }

                        res[0].json({
                            model: type,
                            mode: 'parallelized',
                            msg: str,
                            numOfDevices: numOfDevices
                        })
                    }
                    else {
                        res[0].json({message: 'Error Happened!'})
                    }
                })
            } catch(err) {
                message = err
            }
            for(var i=0; i<numOfDevices; i++) {
                // availableDevices[i].idx = i 
                availableDevices[i].socket.on('over', (msg)=>  {
                    // console.log(msg.clientid, 'over')
                    console.log(msg.output)
                    let info = msg
                    info['total'] = numOfDevices
                    availableDevices[msg.deviceid].inUse = false
                    // console.log(infoGroup)
                    for(let socket of infoGroup) {
                        socket.emit('update', info)
                    }
                })
                availableDevices[i].inUse = true
                availableDevices[i].socket.emit('init', {
                    id: `${i}`,
                    clientid: availableDevices[i].idx,
                    port: port,
                    type: type,
                })
            }
        })
    }
    join(client) {
        this.devices.push(new Device(client, this.pk))
        this.pk++
    }
    remove(socketId) {
        console.log(socketId)
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
        // console.log(group.devices)
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
                addr: device.socket.handshake.address,
                info: device.info
            })
        })
    }, 1000)

    socket.on('remove-client', function(clientId) {
        group.remove(clientId)
    })

    socket.on('message', function (message) {
        socket.send(message)
    })

})

io3.on('connection', function(socket) {
    infoGroup.push(socket)
    socket.on('disconnect', function() {
        var index = -1
        for(var i=0; i<infoGroup.length; i++) {
            if(socket.id === infoGroup[i].id) {
                index = i
                break
            }
        }
        if(index !== -1) {
            infoGroup.splice(index, 1)
        }
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

app.post('/infer', (req, res) => {
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
})

app.get('/download/:model', (req, res) => {
    var model = req.params.model
    var filePath = path.join(pcnnPath, 'models', model+'.h5')
    var stat = fs.statSync(filePath)
    res.set('Content-Disposition', 'attachment;filename='+model+'.h5')
    res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size
    })

    var readStream = fs.createReadStream(filePath)
    readStream.pipe(res)
})

server.listen(port, () => {
    console.log(`Socket server listen at port ${port}`)
})