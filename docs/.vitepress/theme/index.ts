import DefaultTheme from 'vitepress/theme'
import RandomQuestion from './components/RandomQuestion.vue'
import CodePlayground from './components/CodePlayground.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('RandomQuestion', RandomQuestion)
    app.component('CodePlayground', CodePlayground)
  }
}
