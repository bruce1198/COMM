if(localStorage.getItem('image')) {
    $('#previewer').attr('src', localStorage.getItem('image'))
}
$('.file').click(() => {
    $('#uploader').click()
})
$('#submit').click(() => {
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
                $('#class').text(response['msg']['index'])
                $('#num').text(response['numOfDevices'])
                $('#total-time').text(response['time'])
                $('#io-time').text(response['msg']['load_time'])
                $('#cpu-time').text(response['msg']['cal_time'])
                $('.result-blk').fadeIn()
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
        }
        reader.readAsDataURL(input.files[0]);
    }
})