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
    var mode = $('#mode').val()
    var formdata = new FormData()
    formdata.append('model', model)
    formdata.append('mode', mode)
    formdata.append('photo', file)
    $.ajax({
        type: 'post',
        url: 'inference',
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
        }
    })
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