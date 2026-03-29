<script setup>
import { ref, onMounted } from 'vue'

const questions = [
  { title: '手写深拷贝 (Deep Clone)', link: '/handwriting/solutions#_1-手写深拷贝-deep-clone' },
  { title: '手写 Promise.all', link: '/handwriting/solutions#_2-手写-promise-all' },
  { title: '手写 new 操作符', link: '/handwriting/solutions#_3-手写-new-操作符' },
  { title: '手写防抖 (Debounce)', link: '/handwriting/solutions#_4-手写防抖-debounce' },
  { title: '手写节流 (Throttle)', link: '/handwriting/solutions#_5-手写节流-throttle' },
  { title: '手写 AJAX 请求', link: '/handwriting/solutions#_6-手写-ajax-请求' },
  { title: '手写事件委托 (Event Delegation)', link: '/handwriting/solutions#_7-手写事件委托-event-delegation' },
  { title: '手写并发控制 (Scheduler)', link: '/handwriting/solutions#_8-手写并发控制-scheduler' },
  { title: '手写 instanceof', link: '/handwriting/solutions#_9-手写-instanceof' },
  { title: '手写 call / apply', link: '/handwriting/solutions#_10-手写-call-apply' },
  { title: '手写函数柯里化', link: '/handwriting/solutions#_11-手写函数柯里化-currying' },
  { title: '手写数组转树', link: '/handwriting/solutions#_12-手写数组转树-array-to-tree' },
  { title: '手写数组扁平化', link: '/handwriting/solutions#_13-手写数组扁平化-array-flatten' },
  { title: '手写发布订阅模式', link: '/handwriting/solutions#_14-手写发布订阅模式-eventemitter' },
  { title: '手写 LRU 缓存', link: '/handwriting/solutions#_15-手写-lru-缓存算法' }
]

const currentQuestion = ref(null)
const isAnimating = ref(false)

const pickRandom = () => {
  if (isAnimating.value) return
  isAnimating.value = true
  
  let count = 0
  const maxCount = 15
  const interval = setInterval(() => {
    const randomIndex = Math.floor(Math.random() * questions.length)
    currentQuestion.value = questions[randomIndex]
    count++
    if (count >= maxCount) {
      clearInterval(interval)
      isAnimating.value = false
    }
  }, 50)
}
</script>

<template>
  <div class="random-question-container">
    <div class="card">
      <h3>🎲 每日一练</h3>
      <div class="question-display" :class="{ 'highlight': !isAnimating && currentQuestion }">
        <p v-if="!currentQuestion">点击下方按钮开始随机抽题</p>
        <p v-else>{{ currentQuestion.title }}</p>
      </div>
      
      <div class="actions">
        <button class="btn primary" @click="pickRandom" :disabled="isAnimating">
          {{ isAnimating ? '抽取中...' : '随机抽题' }}
        </button>
        <a v-if="currentQuestion && !isAnimating" :href="currentQuestion.link" class="btn secondary">
          查看题解 →
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.random-question-container {
  margin: 2rem 0;
}

.card {
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s ease;
}

.card:hover {
  border-color: var(--vp-c-brand);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.question-display {
  font-size: 1.2rem;
  font-weight: 600;
  min-height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
  color: var(--vp-c-text-2);
}

.question-display.highlight {
  color: var(--vp-c-brand);
  transform: scale(1.05);
  transition: transform 0.3s;
}

.actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn {
  padding: 8px 20px;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  display: inline-block;
}

.btn.primary {
  background-color: var(--vp-c-brand);
  color: white;
  border: none;
}

.btn.primary:hover {
  background-color: var(--vp-c-brand-dark);
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.secondary {
  background-color: transparent;
  border: 1px solid var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.btn.secondary:hover {
  background-color: var(--vp-c-brand-dimm);
}
</style>