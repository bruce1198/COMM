$('li').click(function() {
    var idx = $(this).index('li')
    var model
    switch(idx) {
        case 0:
            model = 'yolov2'
            break
        case 1:
            model = 'alexnet'
            break
        case 2:
            model = 'vgg16'
            break
        case 3:
            model = 'vgg19'
            break
    }
    $('iframe').attr('src', '/download/'+model)
})