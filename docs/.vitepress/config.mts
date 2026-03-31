import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/frontend-interview/',
  title: "前端面试指北",
  description: "个人总结整理的高频前端面试题及答案",
  head: [['link', { rel: 'icon', href: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧭</text></svg>' }]],
  themeConfig: {
    // 1. 顶部导航栏 (Nav) - 这种结构非常清晰
    nav: [
      { text: '首页', link: '/' },
      
      // 板块一：前端基础 (下拉菜单)
      {
        text: '前端基础',
        items: [
          { text: 'HTML', link: '/html/total' },
          { text: 'CSS', link: '/css/basics' },
          { text: 'JavaScript', link: '/javascript/types' },
          { text: 'TypeScript', link: '/typescript/basics' }
        ]
      },

      // 板块二：框架与工程 (下拉菜单)
      {
        text: '框架与工程',
        items: [
          { text: 'Vue 生态', link: '/vue/reactivity' },
          { text: 'React 生态', link: '/react/fiber' },
          { text: '工程化 (Webpack/Vite)', link: '/engineering/webpack' },
          { text: '性能优化', link: '/performance/loading' }
        ]
      },

      // 板块三：计算机通识 (下拉菜单)
      {
        text: '计算机通识',
        items: [
          { text: '计算机网络', link: '/network/http-core' },
          { text: '浏览器原理', link: '/browser/process' }
        ]
      },

      // 板块四：独立入口 (不一定要下拉，常用的可以直接放出来)
      { text: '手写代码', link: '/handwriting/' },
    ],

    // 2. 侧边栏 (Sidebar) - 各个模块独立
    // 只要路径匹配，VitePress 就会自动切换侧边栏
    sidebar: {
      // 手写代码的侧边栏
      '/handwriting/': [
        {
          text: '手写代码',
          items: [
            { text: '题库首页', link: '/handwriting/' },
            { text: '参考答案', link: '/handwriting/solutions' }
          ]
        }
      ],

      // HTML 的侧边栏
      '/html/': [
        {
          text: 'HTML',
          items: [
            { text: 'HTML 高频面试题汇总', link: '/html/total' }
          ]
        }
      ],

      // CSS 的侧边栏
      '/css/': [
        {
          text: 'CSS 核心',
          items: [
            { text: '基础与原理', link: '/css/basics' },
            { text: '布局与定位', link: '/css/layout' },
            { text: '视觉与动画', link: '/css/visual' }
          ]
        }
      ],

      // JavaScript 的侧边栏
      '/javascript/': [
        {
          text: 'JavaScript 核心',
          items: [
            { text: '数据类型与存储', link: '/javascript/types' },
            { text: '作用域与闭包', link: '/javascript/scope-context' },
            { text: '原型与继承', link: '/javascript/prototype' },
            { text: '异步编程', link: '/javascript/async' },
            { text: 'ES6+ 新特性', link: '/javascript/es6-features' },
            { text: 'DOM 事件机制', link: '/javascript/dom-events' },
            { text: '网络请求与 AJAX', link: '/javascript/network-ajax' }
          ]
        }
      ],
      
      // TypeScript 的侧边栏
      '/typescript/': [
        {
          text: 'TypeScript',
          items: [
            { text: '基础语法', link: '/typescript/basics' }
          ]
        }
      ],

      // Vue 的侧边栏
      '/vue/': [
        {
          text: 'Vue 生态',
          items: [
            { text: '响应式原理', link: '/vue/reactivity' }
          ]
        }
      ],

      // React 的侧边栏
      '/react/': [
        {
          text: 'React 生态',
          items: [
            { text: 'Fiber 架构', link: '/react/fiber' }
          ]
        }
      ],

      // 工程化的侧边栏
      '/engineering/': [
        {
          text: '工程化',
          items: [
            { text: 'Webpack', link: '/engineering/webpack' }
          ]
        }
      ],

      // 性能优化的侧边栏
      '/performance/': [
        {
          text: '性能优化',
          items: [
            { text: '加载性能', link: '/performance/loading' }
          ]
        }
      ],

      // 网络的侧边栏
      '/network/': [
        {
          text: '计算机网络',
          items: [
            { text: 'HTTP 核心与缓存', link: '/network/http-core' },
            { text: 'HTTPS 与协议演进', link: '/network/protocols' },
            { text: 'TCP/IP 与 DNS', link: '/network/tcp-ip' }
          ]
        }
      ],

      // 浏览器的侧边栏
      '/browser/': [
        {
          text: '浏览器原理',
          items: [
            { text: '进程与线程模型', link: '/browser/process' },
            { text: '渲染流水线', link: '/browser/rendering' },
            { text: '事件循环', link: '/browser/event-loop' },
            { text: '浏览器缓存', link: '/browser/cache' },
            { text: '跨域问题', link: '/browser/cors' },
            { text: '浏览器安全', link: '/browser/security' },
          ]
        }
      ],
      
    },

    // 3. 其他配置项...
    outline: {
      level: [2, 3], // 关键配置：这里设置 2-3 级标题
      label: '页面导航' // 可选：修改右侧顶部的标题文字 (默认是 "On this page")
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/crab-zihanli' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present crab-zihanli'
    }
  }
})
