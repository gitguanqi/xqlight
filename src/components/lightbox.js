import lightboxComponent from './lightbox.vue'

const xqlightbox = {
    install: function (Vue) {  
        Vue.component('xqLightbox', lightboxComponent)
    }
}

export default xqlightbox;