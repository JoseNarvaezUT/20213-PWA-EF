
let pathSw = '/20213-PWA-EF/sw.js';
let urlAPI = '187.188.90.171';
let url = window.location.href;
if (navigator.serviceWorker) {
    if (url.includes('localhost')) {
        pathSw = '/sw.js';
        urlAPI  = 'localhost';
    }
    navigator.serviceWorker.register(pathSw);
}
// Secciones 
let notices = $('#notices');
let principal = $('#principal');
let notice = $('#notice');
let photoComment = $('#fotoComment');

// datos noticia
let titleNotice = $('#titleNotice');
let initialNotice = $('#initialNotice');
let bannerNotice = $('#bannerNotice');
let dateNotice = $('#dateNotice');
let hashTagNotice = $('#hashTagNotice');
let descriptionNotice = $('#descriptionNotice');
// Seccion comentario noticiasl 
let comentarios = $('#comentarios');

// controles 
let commentTxt = $('#comment');
let personNameTxt = $('#personName');
let idNoticeInput = $('#idNotice');

// botones 
let btnComentar = $('#btnComentar');
let btnSaveName = $('#btnSaveName');
let btnRegresar = $('.btn-regresar');
let btnVerMas = $('#btnVerMas');
let btnCamara = $('#btnCamera');
let btnTomar = $('#btnTomar');




const camera = new Camera($('#player')[0]);
let foto = '';


let page = 0;
let totalPages = 0;

let namePerson = '1n4r';

btnComentar.on('click', function () {
    if (commentTxt.val().length > 0) {
        if (namePerson !== '1n4r') {
            postComment(namePerson, commentTxt.val(), idNoticeInput.val(), foto);
        } else {
            $('.modal-name').modal('toggle');
        }
    } else {
        alert('Comenta algo');
    }
});

btnSaveName.on('click', function () {
    if (personNameTxt.val().length > 0) {
        namePerson = personNameTxt.val();
        $('.modal-name').modal('toggle');
        btnComentar.click();
    } else {
        alert('Ingresa un nombre');
    }
});

notices.on('click', '.btn-seguir', function (e) {
    e.preventDefault();
    let idNotice = $(this).data('id-notice');
    fetch(`http://${urlAPI}:8084/api/notice/${idNotice}`)
        .then(res => res.json())
        .then(resp => {
            let noticeX = resp.result;
            idNoticeInput.val(noticeX.id);
            titleNotice.html(noticeX.title);
            initialNotice.html(noticeX.initialDescription);
            bannerNotice.attr('src', `data:image/png;base64,${noticeX.attachedNotice.file}`);
            let date = new Date(noticeX.datePublic);
            dateNotice.html(date.toLocaleDateString("en-US"));
            hashTagNotice.html(noticeX.hashTag);
            descriptionNotice.html(noticeX.description);
            comentarios.html('');
            noticeX.comments.forEach(comment => {
                let commentX = createComment(comment);
                comentarios.append(commentX);
            });

            $("html, body").animate({ scrollTop: 0 }, "slow");
            principal.fadeOut(function () {
                notice.fadeIn(1000);
            });
        }).catch(err =>{
            alert('No pudimos consultar la noticia offline')
        });
});

btnRegresar.on('click', function () {
    notice.fadeOut(function () {
        principal.fadeIn(1000);
    });
});

btnVerMas.on('click', function () {
    if (page < totalPages - 1) {
        page++;
        loadNotices(page);
    } else {
        alert('Sin mas noticias')
    }

});


btnCamara.on('click', function () {
    let on = camera.on();
    on.then(resOn =>{
        if(!on){
            alert('Ocurrio un error al abrir la camara, favor de revisar el dispositivo')
        }else{
            $('.modal-camera').modal('toggle');
        }
    });
    
});


btnTomar.on('click', function () {
    camera.off();
    foto = camera.tomarFoto();
    photoComment.attr('src', foto);
    $('.modal-camera').modal('toggle');
});

function loadNotices(page) {

    fetch('http://'+urlAPI+':8084/api/notice/page/' + page)
        .then(res => res.json())
        .then(resp => {
            totalPages = resp.totalPages;
            resp.content.forEach(notice => {
                $('#notices').append(createNotice(notice));
            });
        })
        .catch((err) => {
            alert('Se presento un error cargar las noticias')
        });
}

function postComment(person, content, notice, attached) {

    fetch(attached)
        .then(res => res.blob())
        .then(blob => {
            const form = new FormData();
            form.append('postPerson', person);
            form.append('content', content)
            form.append('datePublic', new Date().toLocaleDateString('en-CA'))
            form.append('notice', notice)
            if (attached) {
                form.append('attached', blob)
            }
            fetch('http://'+urlAPI+':8084/api/comment', {
                method: 'POST',
                body: form
            }).then((data) => {
                console.log('coment recibido en app',data);
                data.json().then(datos => {

                    console.log('mandamos a pintarlo',datos);
                    comentarios.append(createComment(datos.result));
                    resetComment();
                });

            });
        });



}

function createComment(comment) {
    let commentHtml = $(`<div class="card"> 
                                    <div class="card-body">
                                        <h5 class="card-title">${comment.postPerson}
                                        `+ (
            comment.attachedComment ?
                `<img style="width:150px"  src="data:image/png;base64,${comment.attachedComment.file}" class="img-fluid rounded " />`
                : ``)
        + `</h5>
                                        <p class="card-text">${comment.content}</p>
                                    </div>
                                </div>`);
    return commentHtml;
}

function createNotice(notice){
    let date = new Date(notice.datePublic);
    return $(`
                <div class="col-12 pt-2 pb-2 border-bottom border-success">
                <img src="data:image/jpeg;base64,${notice.attachedNotice.file}" class="img-fluid" alt="">
                <h4>${notice.title}</h4>
                <div class="row">
                    <div class="col-6 text-muted text-center">
                        ${date.toLocaleDateString("en-US")}
                    </div>
                    <div class="col-6 text-info text-center font-italic ">
                        ${notice.hashTag}
                    </div>
                </div>
                <div class="font-italic text-justify">
                    ${notice.initialDescription}
                </div>
                <a href="" class="float-right btn btn-sm btn-info btn-seguir" data-id-notice="${notice.id}"  >Seguir leyendo...</a>
            </div>
            `);
}

function resetComment() {
    commentTxt.val('');
    photoComment.attr('src', '');
    foto = '';
    idNoticeInput.val('');
}

loadNotices(0);