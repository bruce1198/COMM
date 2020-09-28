const config = require('./config')
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

device = -1
socket.on('connect', () => {
    console.log('connet to server')

    socket.on('init', (msg) => {
        const deviceIdx = msg.id
        const port = msg.port
        const devicePath = path.join(pcnnPath,'codegen', 'alexnet', `device${deviceIdx}.py`)
        console.log('device: '+deviceIdx)
        console.log('port: '+port)
        var message = 'error'
        try {
            const python = spawn('python', [devicePath, pythonhost, port])
            python.on('error', function(err) {
                message = err
            })
            python.stdout.on('data', function (data) {
                console.log(data.toString())
            })
            python.stderr.on('data', function(data) {
                console.log(data.toString())
            })
            python.on('close', (code) => {
    
                if(code == 0) {
                    message = 'success'
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