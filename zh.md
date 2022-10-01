# xqlight

这是一个简单的js灯箱插件。

[查看英文文档](./README.md)

## 在游览器使用

### 导入CDN

```html
<!-- unkpg -->
<script src="https://unpkg.com/xqlight/lib/js/xqlight.min.js"></script>
<link rel="stylesheet" href="https://unpkg.com/xqlight/lib/css/xqlight.min.css">
```

### 使用方法

`imgCls`是一个自定义的类名，包裹在图片列表的外面一层。

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

## 在Vue中使用

### 安装依赖包

```cmd
npm install xqlight
```

### 导入依赖包

```js
// main.js
import xqlight from 'xqlight'

// 1.global component
Vue.use(xqlight);
```

### 在需要的组件中

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
import xqLightBox from './lightbox.vue' // 2. single component
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
        'xq-lightbox': xqLightBox // // 2. single component
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

### 灯箱预览

![xqlight](https://unpkg.com/xqlight/test/img/eg1.jpg)

![xqlight](https://unpkg.com/xqlight/test/img/eg2.jpg)

## 问题

[提交问题](https://github.com/gitguanqi/xqlight/issues/new)

## 作者

[@gitguanqi](https://github.com/gitguanqi)
