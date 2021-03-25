<template>
    <div>
        <ul class="imgs">
            <li v-for="item in lightImgs" :key="item.id"> 
                <img :src="item.src" alt="" @click="showImg(item.src)">
            </li>
        </ul>
        <xq-lightbox :showLightBox="showLightBox" :lightImgs="lightImgs" :currentUrl="currentUrl" @hideLightBox="hideLight"></xq-lightbox>
    </div>
</template>
<script>
import xqLightBox from './lightbox.vue'
export default {
    data() {
        return {
            showLightBox: false,
            currentUrl: '/img/a1.jpg',
            lightImgs: [
                {
                    id: 1,
                    src: '/img/a1.jpg',
                },
                {
                    id: 2,
                    src: '/img/a2.jpeg',
                },
                {
                    id: 3,
                    src: '/img/a3.jpeg',
                },
                {
                    id: 4,
                    src: '/img/a4.jpeg',
                },
                {
                    id: 5,
                    src: '/img/a4.jpeg',
                },
                {
                    id: 6,
                    src: '/img/a4.jpeg',
                }
            ],

        }
    },
    components: {
        'xq-lightbox': xqLightBox
    },
    methods: {
        showImg (url) {
            this.showLightBox = true;
            this.currentUrl = url;
        },
        hideLight () {
            this.showLightBox = false;
        },
    },
}
</script>

<style lang="scss">
    ul,li {
        margin: 0;
        padding: 0;
        list-style: none;
    }
    .imgs li,
    .imgs img {
        margin: 5px;
        display: inline-block;
        width: 400px;
        height: 300px;
    }
</style>