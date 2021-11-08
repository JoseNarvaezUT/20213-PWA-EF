
importScripts('https://cdn.jsdelivr.net/npm/pouchdb@7.2.1/dist/pouchdb.min.js')

let path = '/20213-PWA-EF/';
let urlAPI = '187.188.90.171';

const CACHE_STATIC_NAME = 'static-v1';
const CACHE_INMUTABLE_NAME = 'inmutable-v2';
const CACHE_DYNAMIC_NAME = 'dynamic-v1';
const CACHE_TIMES_NAME = 'times-v1';

var db = new PouchDB('comments');


function cleanCache(cacheName, sizeItems) {
    caches.open(cacheName)
        .then(cache => {
            cache.keys().then(keys => {
                if (keys.length > sizeItems) {
                    cache.delete(keys[0]).then(() => {
                        cleanCache(cacheName, sizeItems)
                    });
                }
            });

        });
}

self.addEventListener('install', (event) => {
    let location = self.location.href;
    if (location.includes('localhost')) {
        path = '/';
        urlAPI ='localhost'
    }
    const promeStatic = caches.open(CACHE_STATIC_NAME)
        .then(cache => {
            return cache.addAll([
                path + '',
                path + 'index.html',
                path + 'js/app.js',
                path + 'js/camera.js',
                path + 'css/page.css',
                path + 'images/icons/android-launchericon-72-72.png',
                path + 'images/icons/android-launchericon-96-96.png',
                path + 'images/icons/android-launchericon-144-144.png',
                path + 'images/icons/android-launchericon-192-192.png',
                path + 'images/icons/android-launchericon-512-512.png',
            ]);
        });
    const promeInmutable = caches.open(CACHE_INMUTABLE_NAME)
        .then(cache => {
            return cache.addAll([
                'https://code.jquery.com/jquery-3.5.1.min.js',
                'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js',
                'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css',
                'https://cdn.jsdelivr.net/npm/pouchdb@7.2.1/dist/pouchdb.min.js',
                'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.7.0/font/bootstrap-icons.css'
            ]);
        });

    const promeTimes = caches.open(CACHE_TIMES_NAME);


    event.waitUntil(Promise.all([promeInmutable, promeStatic, promeTimes]));
});

self.addEventListener('activate', (event) => {
    const resDelCache = caches.keys().then(keys => {
        keys.forEach(key => {
            if (key !== CACHE_STATIC_NAME && key.includes('static')) {
                return caches.delete(key);
            }
            if (key !== CACHE_INMUTABLE_NAME && key.includes('inmutable')) {
                return caches.delete(key);
            }
        });
    });
    event.waitUntil(resDelCache);
});

self.addEventListener('fetch', (event) => {
    let respuestaCache;
    if (event.request.url.includes('/api/')) {
        // network with cache
        console.log('Manejo times');
        respuestaCache = manejoTimes(CACHE_TIMES_NAME, event.request).then(yes => {

            return yes;
        });
    } else {
        console.log('no es times');
        respuestaCache = caches.match(event.request)
            .then(resp => {
                // Si mi request existe en cache
                if (resp) {
                    // respondemos con cache
                    return resp;
                }
                // voy a la red
                return fetch(event.request)
                    .then(respNet => {
                        // abro mi cache
                        caches.open(CACHE_DYNAMIC_NAME)
                            .then(cache => {
                                // guardo la respuesta de la red en cache
                                cache.put(event.request, respNet).then(() => {
                                    cleanCache(CACHE_DYNAMIC_NAME, 5)
                                });

                            });
                        //Respondo con el response de la red
                        return respNet.clone();
                    }).catch(() => {
                        console.log('Error al solicitar el recurso');
                    });
            });
    }
    event.respondWith(respuestaCache);
});

self.addEventListener('sync', (e) => {
    console.log('Evento Sync:');
    if (e.tag == 'nuevo-post') {
        // postear a db cuando hay conexion 

        const respuesta = postearMensajes();
        //esperar a se ejecute algo 
        e.waitUntil(respuesta);
    }
});


function postearMensajes() {

    const posteos = [];

    return db.allDocs({ include_docs: true }).then(docs => {
        docs.rows.forEach(row => {
            const doc = row.doc;
            console.log('Postear mensaje', doc);

            if (doc.attachedComment) {
                const prome = fetch('data:image/png;base64,' + doc.attachedComment.file)
                    .then(res => res.blob())
                    .then(blob => {
                        const form = new FormData();
                        form.append('postPerson', doc.postPerson);
                        form.append('content', doc.content)
                        form.append('datePublic', doc.datePublic)
                        form.append('notice', doc.notice)
                        form.append('attached', blob)
                        return fetch('http://'+urlAPI+':8084/api/comment', {
                            method: 'POST',
                            body: form
                        }).then((data) => {
                            return db.remove(doc);
                        });
                    })
                    .catch(err => {
                        console.log(err);
                    });
                posteos.push(prome);
            } else {
                const form = new FormData();
                form.append('postPerson', doc.postPerson);
                form.append('content', doc.content)
                form.append('datePublic', doc.datePublic)
                form.append('notice', doc.notice)
                const prome = fetch('http://'+urlAPI+':8084/api/comment', {
                    method: 'POST',
                    body: form
                }).then((data) => {
                    return db.remove(doc);
                });
                posteos.push(prome);
            }

        });

        return Promise.all(posteos);
    });

}
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const base64String = reader.result
            .replace("data:", "")
            .replace(/^.+,/, "");
        return resolve(base64String);
    }
    reader.onerror = (error) => {
        return reject(error);
    }

});

function manejoTimes(cacheName, req) {
    if (req.clone().method === 'POST') {
        // Reviso si tenemos sync en el navegador 
        if (self.registration.sync) {
            let comment = {};
            return req.clone().formData().then(formData => {
                comment.postPerson = formData.get('postPerson');
                comment.content = formData.get('content');
                comment.datePublic = formData.get('datePublic');
                comment.notice = formData.get('notice');
                let blob = formData.get('attached');
                return guardarMensaje(comment, blob);

                // if (blob) {
                //     comment.attachedComment = {
                //         file: ''
                //     }
                //     toBase64(blob).then((baseX) => {
                //         comment.attachedComment.file = baseX;
                //     });


                // } else {
                //     let algoX = guardarMensaje(comment);
                //         console.log('Algo que si es una promes? ',algoX);
                //         return algoX;
                //     //return guardarMensaje(comment);
                // }
            });
        } else {
            return fetch(req);
        }
    } else {
        return fetch(req)
            .then(res => {
                if (res.ok) {
                    //guardar en cache 
                    updateCacheTimes(cacheName, req, res.clone());
                    return res;
                } else {
                    return caches.match(req);
                }
                // Si no tenemos conexión
            }).catch(err => {
                return caches.match(req);
            })
    }
}

function updateCacheTimes(cacheName, req, res) {

    // revisamos la respuesta sea correcta 
    if (res.ok) {
        // Abrimos el cache
        return caches.open(cacheName).then(cache => {
            //agragamos
            cache.put(req, res.clone());

            return res.clone();
        });
    } else {
        // Si no viene espor que algo paso, murio y respondemos lo que paso
        return res;
    }

}

function guardarMensaje(mensaje, blob) {
    const data = {};
    if (blob) {
        mensaje.attachedComment = {
            file: ''
        }
        return toBase64(blob).then((baseX) => {
            mensaje.attachedComment.file = baseX;
            mensaje._id = new Date().toISOString();
            mensaje.ok = true;
            mensaje.offline = true;
            return db.put(mensaje).then((result) => {
                self.registration.sync.register('nuevo-post');
                data.result = mensaje;
                const respuesta = new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
                console.log(respuesta);
                return respuesta;
            });
        });
    }else{
        console.log('guardarMensaje: llego ', mensaje);
        mensaje._id = new Date().toISOString();
        mensaje.ok = true;
        mensaje.offline = true;
        return db.put(mensaje).then((result) => {
            self.registration.sync.register('nuevo-post');
            data.result = mensaje;
            return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
        });
    }

   

}
