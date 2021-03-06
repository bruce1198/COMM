const config = require('./config')
const table = require('./table')
const host = config.host
const port = config.port
const pythonhost = config.pythonhost
const io = require('socket.io-client')
const ss = require('socket.io-stream')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const pcnnPath = config.pcnn_path

if(!fs.existsSync(pcnnPath)) {
    console.log('Could not find the PCNN path.')
    return
}
const socket = io.connect(`${host}:${port}`)

socket.on('connect', () => {
    console.log('Connet to server')
    console.log('Please make sure the local models is same as the server\'s one')
    console.log('For Downloading, visit: '+`${host}:${port}`+'/download')

    socket.on('initOrigin', (msg) => {
        const buffer = Buffer.from(msg['image'], 'base64')
        const imagePath = path.join(__dirname, 'images', 'input.jpg')
        try {
            fs.writeFileSync(imagePath, buffer)
        } catch(e) {
            console.log(e)
        }
        const type = msg.type
        const pythonPath = path.join(pcnnPath,'model generator', `${type}.py`)
        try {
            var msgbuilder = ''
            const python = spawn('python', [pythonPath, imagePath])
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
                // console.log('python finish')
                if(code == 0) {
                    let str = {}
                    try {
                        str = JSON.parse(msgbuilder)
                        str['class'] = table[str['index']]
                    } catch(e) {}
                    message = 'success'
                    socket.emit('overOrigin', {
                        output: str,
                        msg: message
                    })
                }
            })
        } catch(err) {
            console.log(err)
        }
    })

    socket.on('init', (msg) => {
        const deviceIdx = msg.id
        const clientid = msg.clientid
        const port = msg.port
        const type = msg.type
        const devicePath = path.join(pcnnPath,'codegen', type, `device${deviceIdx}.py`)
        // console.log('device: '+deviceIdx)
        // console.log('port: '+port)
        var message = 'error'
        var msgbuilder = ''
        try {
            const python = spawn('python', [devicePath, pythonhost, port])
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
                // console.log('python finish')
                if(code == 0) {
                    let str = {}
                    try {
                        str = JSON.parse(msgbuilder)
                    } catch(e) {}
                    message = 'success'
                    socket.emit('over', {
                        deviceid: deviceIdx,
                        clientid: clientid,
                        output: str,
                        msg: message
                    })
                }
            })
        } catch(err) {
            message = err
        }
    })

    socket.on('message', (msg) => {
        console.log(msg)
    })
})

ss(socket).on('sending', function(stream) {
    stream.pipe(fs.createWriteStream('device'+'-'+socket.id+'.py')); 
    stream.on('end', function () {
        console.log('file received');
    })
})
ss(socket).on('sendmodel', function(stream) {
    stream.pipe(fs.createWriteStream('alexnet')); 
    stream.on('end', function () {
        console.log('file received');
    })
})
// socket.on('di')