$('.file').click(() => {
    $('#uploader').click()
})
$('#submit').click(() => {
    var file = $('#uploader')[0].files[0]
    var src = $('#previewer').attr('src')
    if(src===undefined) {
        alert('Please choose a image first!')
        return
    }
    var model = $('#model').val()
    var formdata = new FormData()
    formdata.append('model', model)
    formdata.append('photo', file)
    $.ajax({
        type: 'post',
        url: 'inference',
        data: formdata,
        processData: false,
        contentType: false,
        success: function(response) {
            console.log(response)
        }
    })
    // var img = new Image()
    // var model = $('#model').val()
    // var size
    // switch(model) {
    //     case 'yolo':
    //         size = 224
    //     case 'alexnet':
    //         size = 224
    //     case 'vgg16':
    //         size = 224
    //     case 'vgg19':
    //         size = 224
    // }
    // img.onload = function() {
    //     var canvas = document.createElement('canvas')
    //     var ctx = canvas.getContext('2d')
    //     canvas.width = size
    //     canvas.height = size
    //     ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    //     var data = canvas.toDataURL('image/jpg')
    //     fetch(data)
    //     .then((res) => {return res.arrayBuffer()})
    //     .then((buf) => {return new File([buf], 'input.jpg', {type:'image/jpeg'})})
    //     .then((file) => {
    //         var formdata = new FormData()
    //         formdata.append('model', model)
    //         formdata.append('photo', file)
    //         $.ajax({
    //             type: 'post',
    //             url: 'inference',
    //             data: formdata,
    //             processData: false,
    //             contentType: false,
    //             success: function(response) {
    //                 console.log(response)
    //             }
    //         })
    //     })
    // }
    // img.src = src
})
$('#uploader').on('change', function(e) {
    var input = this;
    var url = $(this).val();
    var ext = url.substring(url.lastIndexOf('.') + 1).toLowerCase();
    if (input.files && input.files[0]&& (ext == "gif" || ext == "png" || ext == "jpeg" || ext == "jpg")) {
        var reader = new FileReader();

        reader.onload = function (e) {
            $('#previewer').attr('src', e.target.result);
        }
        reader.readAsDataURL(input.files[0]);
    }
})