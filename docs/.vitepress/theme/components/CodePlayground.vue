<script setup>
import { ref, computed } from 'vue'

const code = ref('// 在这里输入代码进行练习\n// 例如：手写一个深拷贝\n\nconsole.log("Hello World");')
const output = ref([])

// 运行代码逻辑
const runCode = () => {
  output.value = []
  
  const originalLog = console.log
  const originalError = console.error
  const originalWarn = console.warn
  
  const logToOutput = (type, args) => {
    const msg = args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2)
        } catch (e) {
          return String(arg)
        }
      }
      return String(arg)
    }).join(' ')
    output.value.push({ type, content: msg })
  }

  console.log = (...args) => {
    logToOutput('info', args)
    originalLog(...args)
  }
  
  console.error = (...args) => {
    logToOutput('error', args)
    originalError(...args)
  }

  console.warn = (...args) => {
    logToOutput('warn', args)
    originalWarn(...args)
  }

  try {
    new Function(code.value)()
  } catch (err) {
    console.error(err.toString())
  } finally {
    console.log = originalLog
    console.error = originalError
    console.warn = originalWarn
  }
}

const clearOutput = () => {
  output.value = []
}

// Tab 键支持
const handleTab = (e) => {
  const textarea = e.target
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const spaces = '  ' // 2个空格

  code.value = code.value.substring(0, start) + spaces + code.value.substring(end)

  // 恢复光标位置
  setTimeout(() => {
    textarea.selectionStart = textarea.selectionEnd = start + spaces.length
  }, 0)
}

// 简易语法高亮逻辑
const highlightedCode = computed(() => {
  let c = code.value || ''
  
  // HTML 转义
  c = c.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

  // 实际上，最简单的“及格”方案是：先拆分 token，再着色，再合并。
  // 但为了代码简短，我们使用一个复杂的正则来一次性匹配所有 Token
  
  const mainRegex = /(\/\/.*)|(['"`](?:\\.|[^\\])*?\2)|(\b(?:const|let|var|function|return|if|else|for|while|class|new|this|import|export|from|async|await|try|catch|finally|switch|case|break|continue|default|true|false|null|undefined)\b)|(\b\d+\b)|(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\())/g
  
  return c.replace(mainRegex, (match, comment, string, keyword, number, func) => {
    if (comment) return `<span class="token comment">${comment}</span>`
    if (string) return `<span class="token string">${string}</span>`
    if (keyword) return `<span class="token keyword">${keyword}</span>`
    if (number) return `<span class="token number">${number}</span>`
    if (func) return `<span class="token function">${func}</span>`
    return match
  }) + '<br>' // 保证最后一行空行能显示
})

// 同步滚动
const handleScroll = (e) => {
  const pre = e.target.previousElementSibling
  if (pre) {
    pre.scrollTop = e.target.scrollTop
    pre.scrollLeft = e.target.scrollLeft
  }
}
</script>

<template>
  <div class="playground-container">
    <div class="playground-header">
      <span class="title">💻 代码练习场</span>
      <div class="controls">
        <button class="btn run" @click="runCode">▶ 运行</button>
        <button class="btn clear" @click="clearOutput">🗑️ 清空控制台</button>
      </div>
    </div>
    
    <div class="editor-wrapper">
      <!-- 底层：高亮代码 -->
      <pre class="code-highlight" aria-hidden="true" v-html="highlightedCode"></pre>
      <!-- 顶层：透明输入框 -->
      <textarea 
        v-model="code" 
        class="code-editor" 
        spellcheck="false"
        placeholder="在此输入 JavaScript 代码..."
        @keydown.tab.prevent="handleTab"
        @scroll="handleScroll"
      ></textarea>
    </div>

    <div class="output-wrapper" v-if="output.length > 0">
      <div class="output-header">运行结果：</div>
      <div class="console-output">
        <div 
          v-for="(log, index) in output" 
          :key="index" 
          class="log-line"
          :class="log.type"
        >
          <span class="log-prefix" v-if="log.type === 'error'">❌ </span>
          <span class="log-prefix" v-if="log.type === 'warn'">⚠️ </span>
          <pre>{{ log.content }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playground-container {
  margin: 2rem 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  background-color: var(--vp-c-bg-soft);
}

.playground-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
}

.title {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.controls {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.9rem;
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  transition: all 0.2s;
}

.btn.run {
  background-color: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.btn.run:hover {
  background-color: var(--vp-c-brand-dark);
}

.btn.clear:hover {
  background-color: var(--vp-c-bg-alt);
}

.editor-wrapper {
  position: relative;
  height: 400px; /* 增加高度 */
  background-color: #1e1e1e; /* 强制深色背景，配合高亮 */
}

.code-editor, .code-highlight {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 16px;
  margin: 0;
  border: none;
  font-family: 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace; /* 统一字体 */
  font-size: 14px;
  line-height: 1.5;
  white-space: pre;
  overflow: auto;
  box-sizing: border-box;
  tab-size: 2;
}

.code-highlight {
  color: #d4d4d4;
  pointer-events: none;
  z-index: 1;
}

.code-editor {
  color: transparent;
  background: transparent;
  caret-color: #fff;
  z-index: 2;
  outline: none;
  resize: none;
}

/* 语法高亮颜色 (VS Code Dark 风格) */
:deep(.token.keyword) { color: #569cd6; }
:deep(.token.string) { color: #ce9178; }
:deep(.token.comment) { color: #6a9955; }
:deep(.token.function) { color: #dcdcaa; }
:deep(.token.number) { color: #b5cea8; }

.output-wrapper {
  border-top: 1px solid var(--vp-c-divider);
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  max-height: 200px;
  overflow-y: auto;
}

.output-header {
  font-size: 0.8rem;
  color: #858585;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.log-line {
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
  padding: 2px 0;
  border-bottom: 1px solid #333;
}

.log-line pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.log-line.error {
  color: #f48771;
}

.log-line.warn {
  color: #cca700;
}
</style>