import { createApp } from 'vue'
import App from './App.vue'
import 'font-awesome/css/font-awesome.min.css'
import xqlight from './components/lightbox'

let app = createApp(App);

app.use(xqlight);

createApp(App).mount('#app')
