var resultList = {
    'origin': [
        {
            total: 4220,
            io: 3840,
            cal: 1344
        },
        {
            total: 5220,
            io: 3840,
            cal: 1544
        },
        {
            total: 3220,
            io: 3840,
            cal: 1144
        }
    ],
    'alexnet': [
        {
            total: 3220,
            io: 3840,
            cal: 637
        },
        {
            total: 2220,
            io: 3840,
            cal: 687
        },
        {
            total: 4220,
            io: 3840,
            cal: 587
        }
    ],
    'yolo': [
        {
            total: 3220,
            io: 3840,
            cal: 637
        },
        {
            total: 2220,
            io: 3840,
            cal: 687
        },
        {
            total: 4220,
            io: 3840,
            cal: 587
        }
    ],
    'vgg16': [
        {
            total: 3220,
            io: 3840,
            cal: 637
        },
        {
            total: 2220,
            io: 3840,
            cal: 687
        },
        {
            total: 4220,
            io: 3840,
            cal: 587
        }
    ],
    'vgg19': [
        {
            total: 3220,
            io: 3840,
            cal: 637
        },
        {
            total: 2220,
            io: 3840,
            cal: 687
        },
        {
            total: 4220,
            io: 3840,
            cal: 587
        }
    ]
}
$(document).ready(function() {
    var canvasWidth = $('canvas').width()
    var canvasHeight = $('canvas').height()
    const canvas = $('canvas')[0]
    const ctx = canvas.getContext('2d')
    canvas.width = canvasWidth*2
    canvas.height = canvasHeight*2
    ctx.width = canvas.width
    ctx.height = canvas.height
    ctx.scale(2, 2)
    $('.result').css('display', 'none')

    $(document).on('resize', function() {
        var canvasWidth = $('canvas').width()
        var canvasHeight = $('canvas').height()
        const canvas = $('canvas')[0]
        const ctx = canvas.getContext('2d')
        canvas.width = canvasWidth*2
        canvas.height = canvasHeight*2
        ctx.width = canvas.width
        ctx.height = canvas.height
    })

    draw()

    function draw() {
        ctx.fillStyle = 'white'
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)

        const max = 6000
        ctx.save()
        ctx.translate(-30, 0)
        for(var model of Object.values(resultList)) {
            ctx.translate(canvasWidth/6, 0)
            ctx.save()
            for(var [key, value] of Object.entries(model[0])) {
                if(key == 'total')
                    ctx.fillStyle = '#6699ff'
                else if(key == 'io')
                    ctx.fillStyle = '#00e673'
                else
                    ctx.fillStyle = '#ffd633'
                ctx.fillRect(0, canvasHeight*(1-value/max), 20, canvasHeight)
                ctx.translate(30, 0)
            }
            ctx.restore()
        }
        ctx.restore()

        ctx.strokeStyle = 'black'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(0, canvasHeight)
        ctx.lineTo(canvasWidth, canvasHeight)
        ctx.stroke()

        ctx.save()
        ctx.fillStyle = "#6699ff";
        ctx.fillRect(canvasWidth-100, 20, 15, 15)
        ctx.font = "14px Arial"
        ctx.fillStyle = "black";
        ctx.textBaseline = "hanging"
        ctx.fillText("Total Time", canvasWidth-80, 20)
        ctx.translate(0, 20);
        ctx.fillStyle = "#00e673";
        ctx.fillRect(canvasWidth-100, 20, 15, 15)
        ctx.fillStyle = "black";
        ctx.fillText("I/O Time", canvasWidth-80, 20)
        ctx.translate(0, 20);
        ctx.fillStyle = "#ffd633";
        ctx.fillRect(canvasWidth-100, 20, 15, 15)
        ctx.fillStyle = "black";
        ctx.fillText("CPU Time", canvasWidth-80, 20)
        ctx.restore()

        requestAnimationFrame(draw)
    }
    $('select').formSelect()
    $('.materialboxed').materialbox()
    if(localStorage.getItem('image')) {
        $('#previewer').attr('src', localStorage.getItem('image'))
        $('#chosen').text('Ready to Inference')
    }
    $('.file').click(() => {
        $('#uploader').click()
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
                    const total = response['time']
                    const io = response['msg']['load_time']
                    const cpu = response['msg']['cal_time']
                    const len = resultList[response['model']].length
                    if(response['mode'] != 'origin') {
                        resultList[response['model']][0]['total'] = (resultList[response['model']][0]['total']*(len-1) + total) / len
                        resultList[response['model']][0]['io'] = (resultList[response['model']][0]['io']*(len-1) + io) / len
                        resultList[response['model']][0]['cal'] = (resultList[response['model']][0]['cal']*(len-1) + cpu) / len
                        resultList[response['model']].push({
                            total: total,
                            io: io,
                            cal: cpu
                        })
                    }
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