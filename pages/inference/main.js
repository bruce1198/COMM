var resultList = {
    'origin': {
        'alexnet': [
            {
                total: 0,
                io: 0,
                cal: 0
            },
        ],
        'yolo': [
            {
                total: 5220,
                io: 2840,
                cal: 2437
            },
            {
                total: 5220,
                io: 2840,
                cal: 2437
            },
        ],
        'vgg16': [
            {
                total: 3820,
                io: 3240,
                cal: 637
            },
            {
                total: 3820,
                io: 3240,
                cal: 637
            },
        ],
        'vgg19': [
            {
                total: 3220,
                io: 3840,
                cal: 637
            },
            {
                total: 3220,
                io: 3840,
                cal: 637
            },
        ]
    },
    'parallelized': {
        'alexnet': [
            {
                total: 0,
                io: 0,
                cal: 0
            },
        ],
        'yolo': [
            {
                total: 5220,
                io: 2840,
                cal: 2437
            },
            {
                total: 5220,
                io: 2840,
                cal: 2437
            },
        ],
        'vgg16': [
            {
                total: 3820,
                io: 3240,
                cal: 637
            },
            {
                total: 3820,
                io: 3240,
                cal: 637
            },
        ],
        'vgg19': [
            {
                total: 3220,
                io: 3840,
                cal: 637
            },
            {
                total: 3220,
                io: 3840,
                cal: 637
            },
        ]
    }
}
$(document).ready(function() {
    var canvasWidth = $('#origin').width()
    var canvasHeight = $('#origin').height()
    const canvas = $('#origin')[0]
    const ctx = canvas.getContext('2d')
    const canvasp = $('#parallel')[0]
    const ctxp = canvasp.getContext('2d')
    canvas.width = canvasWidth*2
    canvas.height = canvasHeight*2
    ctx.width = canvas.width
    ctx.height = canvas.height
    canvasp.width = canvasWidth*2
    canvasp.height = canvasHeight*2
    ctxp.width = canvas.width
    ctxp.height = canvas.height
    ctx.scale(2, 2)
    ctxp.scale(2, 2)
    // $('.result').css('display', 'none')

    $(document).on('resize', function() {
        canvasWidth = $('#origin').width()
        canvasHeight = $('@origin').height()
        canvas.width = canvasWidth*2
        canvas.height = canvasHeight*2
        ctx.width = canvas.width
        ctx.height = canvas.height
        canvasp.width = canvasWidth*2
        canvasp.height = canvasHeight*2
        ctxp.width = canvas.width
        ctxp.height = canvas.height
        ctx.scale(2, 2)
        ctxp.scale(2, 2)
    })

    draw()

    function drawCanvas(context, list) {
        context.fillStyle = 'white'
        context.fillRect(0, 0, canvasWidth, canvasHeight)

        const max = 6000
        context.save()
        context.translate(-30, 0)
        for(var model of Object.values(list)) {
            context.translate(canvasWidth/5, 0)
            context.save()
            for(var [key, value] of Object.entries(model[0])) {
                if(key == 'total')
                    context.fillStyle = '#6699ff'
                else if(key == 'io')
                    context.fillStyle = '#00e673'
                else
                    context.fillStyle = '#ffd633'
                context.fillRect(0, canvasHeight*(1-value/max), 20, canvasHeight)
                context.translate(30, 0)
            }
            context.restore()
        }
        context.restore()

        context.strokeStyle = 'black'
        context.lineWidth = 2
        context.beginPath()
        context.moveTo(0, 0)
        context.lineTo(0, canvasHeight)
        context.lineTo(canvasWidth, canvasHeight)
        context.stroke()

        context.save()
        context.fillStyle = "#6699ff";
        context.fillRect(canvasWidth-100, 20, 15, 15)
        context.font = "14px Arial"
        context.fillStyle = "black";
        context.textBaseline = "hanging"
        context.fillText("Total Time", canvasWidth-80, 20)
        context.translate(0, 20);
        context.fillStyle = "#00e673";
        context.fillRect(canvasWidth-100, 20, 15, 15)
        context.fillStyle = "black";
        context.fillText("I/O Time", canvasWidth-80, 20)
        context.translate(0, 20);
        context.fillStyle = "#ffd633";
        context.fillRect(canvasWidth-100, 20, 15, 15)
        context.fillStyle = "black";
        context.fillText("CPU Time", canvasWidth-80, 20)
        context.restore()
    }

    function draw() {
        drawCanvas(ctx, resultList['origin'])
        drawCanvas(ctxp, resultList['parallelized'])

        requestAnimationFrame(draw)
    }
    $('select').formSelect()
    $('.materialboxed').materialbox()
    if(localStorage.getItem('image')) {
        $('#previewer').attr('src', localStorage.getItem('image'))
        $('#chosen').text('Ready to Inference')
    }
    if(localStorage.getItem('model')) {
        $('#model').val(localStorage.getItem('model'))
        $('#model').formSelect()
    }
    if(localStorage.getItem('mode')) {
        $('#mode').val(localStorage.getItem('mode'))
        $('#mode').formSelect()
    }
    $('.file').click(() => {
        $('#uploader').click()
    })
    $('#model').on('change', function(){
        localStorage.setItem('model', $(this).val())
        $('#model').formSelect()
    })
    $('#mode').on('change', function(){
        localStorage.setItem('mode', $(this).val())
        $('#mode').formSelect()
    })
    $('#submit').click(() => {
        $('.result').css('display', 'none')
        $('#progress').css('display', 'inline-block')
        var src = $('#previewer').attr('src')
        if(src===undefined) {
            alert('Please choose a image first!')
            return
        }
        fetch(src).then(res => res.blob())
        .then(blob => {
            const file = new File([blob], 'input.jpg', blob)
            var model = $('#model').val()
            var mode = $('#mode').val()
            var formdata = new FormData()
            formdata.append('model', model)
            formdata.append('mode', mode)
            formdata.append('photo', file)
            $.ajax({
                type: 'post',
                url: '/infer',
                data: formdata,
                processData: false,
                contentType: false,
                success: function(response) {
                    console.log(response)
                    //avg
                    const mode = response['mode']
                    const model = response['model']
                    const total = response['time']
                    const io = response['msg']['load_time']
                    const cpu = response['msg']['cal_time']
                    const len = resultList[mode][model].length
                    resultList[mode][model][0]['total'] = (resultList[mode][model][0]['total']*(len-1) + total) / len
                    resultList[mode][model][0]['io'] = (resultList[mode][model][0]['io']*(len-1) + io) / len
                    resultList[mode][model][0]['cal'] = (resultList[mode][model][0]['cal']*(len-1) + cpu) / len
                    resultList[mode][model].push({
                        total: total,
                        io: io,
                        cal: cpu
                    })
                    $('#progress').css('display', 'none')
                    $('#class').text(response['msg']['index'])
                    $('#num').text(response['numOfDevices'])
                    $('#total-time').text(total)
                    $('#io-time').text(io)
                    $('#cpu-time').text(cpu)
                    $('.result').fadeIn()
                    // window.top.scrollTo(0, 500)
                    // scrollTo(0, $('.result').offset().top)
                    parent.scrollTo(0, $('.result').offset().top)
                    // parent.parent.scrollTo(0, $('.result').offset().top)
                }
            })
        })
    })
    $('#uploader').on('change', function(e) {
        var input = this;
        var url = $(this).val();
        var ext = url.substring(url.lastIndexOf('.') + 1).toLowerCase();
        if (input.files && input.files[0]&& (ext == "gif" || ext == "png" || ext == "jpeg" || ext == "jpg")) {
            var reader = new FileReader();
    
            reader.onload = function (e) {
                localStorage.setItem('image', e.target.result)
                $('#previewer').attr('src', e.target.result)
                $('#chosen').text('Ready to Inference')
            }
            reader.readAsDataURL(input.files[0]);
        }
    })
})