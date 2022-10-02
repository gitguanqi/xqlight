<template>
    <div class="lightbox" v-show="showLightBox">
        <div class="lightbox-title">
            <span>
                {{ lightTitle || '图片预览' }}
            </span>
            <span>({{ currentImgIndex+1 || 0 }}/{{ lightImgs.length || 0 }})</span>
            <p>
                <i class="lightbox-download plugin plugin-download" @click="downloadImg"></i>
                <i v-show="isScale" @click="scaleImg" class="plugin plugin-fullscreen"></i>
                <i v-show="!isScale" @click="scaleImg" class="plugin plugin-fullscreen-exit"></i>
                <i @click="closeLightBox" class="plugin plugin-times"></i>
            </p>
        </div>
        <div class="lightbox-content">
            <div class="lightbox-ls">
                <div class="lightbox-arrow la-left" @click="prevImg">
                    <i class="plugin plugin-arrow-left"></i>
                </div>
                <ul>
                    <li @click="scaleMouseImg" :style="{'cursor': `${currentScale > 0.4 ? 'zoom-out' : 'zoom-in'}`}">
                        <a :href="currentSrc || ''" target="_blank">
                            <img :style="{'transform': `scale(${currentScale})`, 'cursor': `${currentScale > 0.4 ? 'zoom-out' : 'zoom-in'}`}" :src="currentSrc || ''" alt="">
                        </a>
                    </li>
                </ul>
                <div class="lightbox-arrow la-right" @click="nextImg">
                    <i class="plugin plugin-arrow-right"></i>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        lightTitle: {
            type: String
        },
        showLightBox: {
            type: Boolean,
            defalut: false
        },
        lightImgs: {
            type: Array,
            defalut: []
        },
        currentUrl: {
            type: String,
            defalut: ''
        },
        currentIndex: {
            type: Number,
            defalut: 0
        }
    },
    data() {
        return {
            isMouseUp: '',
            currentImgIndex: 0,
            currentScale: 1,
            currentSrc: '',
            isScale: false,
        }
    },
    watch: {
        'currentUrl': function (val) {
            this.currentSrc = val;
        }
    },
    mounted() {
        window.addEventListener('mousewheel',this.handleScroll);
        if (this.lightImgs.length) {
            this.currentSrc = this.lightImgs[0].src;
        }
        if (this.currentIndex) {
            this.currentImgIndex = this.currentIndex;
        }
    },
    methods: {
        handleScroll (e) {
            this.isMouseUp = e.deltaY > 0 ? false : true;
            if (this.isMouseUp && this.currentScale < 3) {
                this.currentScale += 0.2;
            }
            if (!this.isMouseUp && this.currentScale > 0.4) {
                this.currentScale -= 0.2;
            }
        },
        scaleImg () {
            this.isScale = !this.isScale;
            if (!this.isScale) {
                this.fullScreenCancel();
            } else {
                this.fullScreenOpen();
            }
        },
        scaleMouseImg () {
            if (this.currentScale < 3) {
                this.currentScale += 0.2;
            }
            if (this.currentScale > 0.4) {
                this.currentScale -= 0.2;
            }
        },
        downloadImg () {
            let donwBtn = document.createElement('a');
            donwBtn.href = this.currentSrc;
            donwBtn.download = 'download';
            donwBtn.click();
        },
        closeLightBox () {
            this.$emit('hideLightBox');
        },
        prevImg () {
            if (this.currentImgIndex == 0) {
                this.currentImgIndex = this.lightImgs.length;
            }
            if (this.currentImgIndex > 0 && this.currentImgIndex <= this.lightImgs.length) {
                this.currentImgIndex -=1;
            }
            this.currentScale = 1;
            this.currentSrc = this.lightImgs[this.currentImgIndex].src ||
            this.lightImgs[this.currentImgIndex].url;
        },
        nextImg () {
            if (this.currentImgIndex == this.lightImgs.length - 1) {
                this.currentImgIndex = 0;
            } else {
                this.currentImgIndex +=1;
            }
            this.currentScale = 1;
            this.currentSrc = this.lightImgs[this.currentImgIndex].src ||
            this.lightImgs[this.currentImgIndex].url;
        },
        fullScreenOpen () {
            var docElm = document.documentElement;
            if (docElm.requestFullscreen) {
                docElm.requestFullscreen();
            } else if (docElm.msRequestFullscreen) {
                docElm.msRequestFullscreen();
            } else if (docElm.mozRequestFullScreen) {
                docElm.mozRequestFullScreen();
            } else if (docElm.webkitRequestFullScreen) {
                docElm.webkitRequestFullScreen();
            }
        },

        fullScreenCancel () {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
        }
    },
}
</script>

<style lang="scss" scoped>
    $white: #fff;
    .lightbox {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100vh;
        background: rgba($color: #000000, $alpha: .7);
        overflow: hidden;
        z-index: 9999;
        .lightbox-title {
            display: flex;
            justify-content: space-between;
            padding: 0 20px;
            width: 100%;
            height: 60px;
            line-height: 60px;
            color: $white;
            font-size: 20px;
            p {
                position: relative;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-right: 20px;
                width: 120px;
                height: 60px;
                i {
                    display: inline-block;
                    width: 60px;
                    height: 60px;
                    line-height: 60px;
                    text-align: center;
                    font-size: 20px;
                    color: $white;
                    cursor: pointer;
                }
            }
        }
        .lightbox-content {
            flex: 1;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
            padding: 20px;
            width: 100%;
            height: 100%;
            .lightbox-ls {
                position: absolute;
                top: 10%;
                box-sizing: border-box;
                padding: 0 50px;
                width: 100%;
                height: 100%;
                overflow: hidden;
                ul {
                    flex: 1;
                    width: 100%;
                    height: 85%;
                    overflow: hidden;
                    li {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        flex-shrink: 0;
                        width: 100%;
                        height: 100%;
                        text-align: center;
                        img {
                            display: inline-block;
                            max-width: 700px;
                            width: auto;
                            height: auto;
                        }
                    }
                }
                .lightbox-arrow {
                    position: absolute;
                    top: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 50px;
                    height: 100%;
                    cursor: pointer;
                    i {
                        font-size: 50px;
                        color: $white;
                    }
                    &.la-left {
                        left: 0;
                    }
                    &.la-right {
                        right: 0;
                    }
                }
            }
        }
    }
    
    @media all and (max-width:768px) and (min-width: 319px) {
        .lightbox {
            .lightbox-content {
                .lightbox-ls {
                    width: 95%;
                    height: 60%;
                }
            }
        }
    }
</style>