const socket = io({
    path: '/realtime'
})

socket.on('connect', () => {
    console.log('Connect to server')
    socket.on('update', (devices) => {
        $('ul').empty()
        var i = 1
        devices.forEach(device => {
            $('ul').append($('<li></li>', {class: 'collection-item avatar'}).html(
                `<div class="circle img"></div>
                <span class="title">Client ${i}</span>
                <p>ID: ${device.socketid}<br>
                   Addr: ${device.addr.split(':')[3]}
                </p>
                <a class="secondary-content ${device.inUse?'inUse':''}"><i class="material-icons"></i></a>`
                )
            )
            i++
        })
    })
})