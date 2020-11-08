$(document).ready(()=>{

    setInterval(()=>{
        $('iframe')[0].style.height = $('iframe')[0].contentWindow.document.body.clientHeight + 'px'
        $('iframe')[0].height = $('iframe')[0].contentWindow.document.body.clientHeight+166
    }, 30)
    
    $('.brand').click(function() {
        localStorage.setItem('url', 'home')
        $('iframe').prop('src', `/home`)
    })
    $('nav li').click(function(){
        const text = $(this).children(0).text().toLowerCase()
        localStorage.setItem('url', text)
        $('iframe').prop('src', `/${text}`)
    })
    if(localStorage.getItem('url')) {
        const url = localStorage.getItem('url')
        $('iframe').prop('src', `/${url}`)
    }
})