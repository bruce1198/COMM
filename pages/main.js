var init = true
function frameOnload(obj) {
    if(init) init = false
    else {
        $(obj).show()
        init = false
    }
}
setInterval(()=>{
    $('iframe')[0].style.height = $('iframe')[0].contentWindow.document.body.offsetHeight+166 + 'px'
}, 30)

$('nav li').click(function(){
    const text = $(this).text().toLowerCase()
    switch(text) {
        case 'pcnn':
            localStorage.setItem('url', 'home')
            $('iframe').prop('src', `/home`)
            break
        default:
            localStorage.setItem('url', text)
            $('iframe').prop('src', `/${text}`)
            break
    }
})
if(localStorage.getItem('url')) {
    const url = localStorage.getItem('url')
    $('iframe').prop('src', `/${url}`)
    $('iframe').show()
}