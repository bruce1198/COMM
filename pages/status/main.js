const socket = io({
    path: '/realtime'
})

socket.on('connect', () => {
    console.log('Connect to server')
    socket.on('update', (msg) => {
        console.log(msg)
    })
})