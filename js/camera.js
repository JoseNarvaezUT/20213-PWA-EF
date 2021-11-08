class Camera {
    constructor(videoNode) {
        this.videoNode = videoNode;
        console.log('Camera init');
    }

    on() {
        return navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { width: 300, height: 300 }
        }).then(stream => {
            this.videoNode.srcObject = stream;
            this.stream = stream;
            return true;
        }).catch((err)=>{
            console.log(err);
            return false;
        });
    }
    off() {
        this.videoNode.pause();
        if (this.stream) {
            this.stream.getTracks().forEach(function (track) {
                track.stop();
            });
        }
    }

    tomarFoto() {
        let canvas = document.createElement('canvas');
        canvas.setAttribute('width', 300);
        canvas.setAttribute('height', 300);

        let context = canvas.getContext('2d');
        context.drawImage(this.videoNode, 0, 0, canvas.width, canvas.height);
        this.photo = context.canvas.toDataURL();
        canvas = null;
        context = null;
        return this.photo;
    }
}