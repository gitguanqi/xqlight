# xqlight

This is a simple javascript lightbox plugin.

[View Chinese documents](./zh.md)

## use in browser

### import cdn

```html
<!-- unkpg -->
<script src="https://xqgj.cc/xqcdn/libs/xqlight/js/xqlight.min.js"></script>
<link rel="stylesheet" href="https://xqgj.cc/xqcdn/libs/xqlight/css/xqlight.min.css">
```

### use methods

`imgCls` is the name of a picture frame class on the page.

```html
<h2>xqlight example</h2>
<p>Below is a set of sample pictures, click on it and the lightbox effect will appear.</p>
<ul class="imgs">
    <li>
        <img src="./img/a1.jpg" alt="">
    </li>
    <li>
        <img src="./img/a2.jpeg" alt="">
    </li>
    <li>
        <img src="./img/a3.jpeg" alt="">
    </li>
    <li>
        <img src="./img/a4.jpeg" alt="">
    </li>
    <li>
        <img src="./img/a5.jpeg" alt="">
    </li>
</ul>
```

```js
let opts = {
    imgCls: '.imgs'
}
let xqlight = new XqLightBox(opts);
```

## use in vue

### install package

```cmd
npm install xqlight
```

### import package

```js
// main.js
import xqlight from 'xqlight'

Vue.use(xqlight);
```

### use on components

```vue
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
```

### img preview

![xqlight](https://xqgj.cc/xqlight/test/img/eg1.jpg)

![xqlight](https://xqgj.cc/xqlight/test/img/eg2.jpg)

[demo](https://xqgj.cc/xqlight/test/index.html)

## issue

[submit your question](https://github.com/gitguanqi/xqlight/issues/new)

## author

[@gitguanqi](https://github.com/gitguanqi)
