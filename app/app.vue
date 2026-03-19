<template>
  <div 
    class="container" 
    :style="{ backgroundColor: isListening ? 'var(--bg-color-active)' : 'var(--bg-color-idle)' }"
  >
    <!-- Onboarding Overlay -->
    <div v-if="!isListening" class="overlay">
      <button @click="handleStart" class="start-btn">按下開始咆哮</button>
      <p class="hint">請允許麥克風權限以體驗互動字型</p>
    </div>

    <!-- The Dense Canvas -->
    <div 
      ref="canvasRef" 
      class="dense-text-canvas"
      :style="{ transform: `translateY(${idleFloatOffset}px) rotate(${idleRotate}deg)` }"
    >
      {{ displayWord }}
    </div>

    <!-- Audio Visualizer Status Bar -->
    <div v-if="isListening" class="audio-visualizer">
      <div class="audio-labels">
        <span>MIC INPUT (THRESHOLD: {{ THRESHOLD * 100 }}%)</span>
        <span>{{ Math.round(rawVolume * 100) }}%</span>
      </div>
      <div class="audio-bar-container">
        <!-- 音量進度條 -->
        <div 
          class="audio-bar-fill" 
          :style="{ 
            width: `${rawVolume * 100}%`,
            backgroundColor: visualizerColor,
            boxShadow: `0 0 15px ${visualizerColor}`
          }"
        ></div>
        <!-- 觸發門檻指示線 -->
        <div class="threshold-line" :style="{ left: `${THRESHOLD * 100}%` }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useAudioAnalyzer } from '~/composables/useAudioAnalyzer'
import { lerp, getSineWave } from '~/composables/useMath'
import { VARIABLE_FONTS } from '~/config/fonts'

const { isListening, rawVolume, startListening, stopListening } = useAudioAnalyzer()

// 計算音量條顏色
const visualizerColor = computed(() => {
  const vol = rawVolume.value
  if (vol < 0.05) return '#10b981' // 綠色 (低音/環境音)
  if (vol < 0.3) return '#fbbf24'  // 黃色 (一般說話)
  if (vol < 0.6) return '#f87171'  // 橙紅色 (大聲)
  return '#c084fc'                 // 紫色 (咆咆狀態)
})

const currentFont = VARIABLE_FONTS.robotoFlex
const canvasRef = ref<HTMLElement | null>(null)

// 畫面上要填滿被擠壓的文字
const displayWord = "VOICE"
const THRESHOLD = 0.05 // 音量過濾門檻，過濾環境音
const SMOOTHING = 0.1 // 待機與降緩時的平滑系數
const IMPACT_SMOOTHING = 0.35 // 爆發時的平滑系數 (靈敏度較高)

// 物理漂浮狀態 (響應式，由 Vue 更新)
// 因為只是控制簡單的 transform，給 Vue Reactivity 更新效能尚可接受
const idleFloatOffset = ref(0)
const idleRotate = ref(0)

// 內部變數 (無 Reactivity 開銷)，用於 60fps 原生 DOM 更新
let animationFrameId: number
let currentWdth = currentFont.axes.idleWidth.min
let currentWght = currentFont.axes.idleWeight.min

const handleStart = () => {
  startListening()
}

// 核心渲染迴圈 (60fps)
const renderLoop = () => {
  if (!canvasRef.value) {
    animationFrameId = requestAnimationFrame(renderLoop)
    return
  }

  // 1. 計算當前目標值 Target Values
  let targetWdth = 0
  let targetWght = 0
  let isExploding = false

  if (isListening.value && rawVolume.value > THRESHOLD) {
    // 【爆發狀態】由聲音音量控制
    isExploding = true
    const volumeRatio = Math.min((rawVolume.value - THRESHOLD) / (1 - THRESHOLD), 1)
    
    // 將 0-1 映射到設定檔中定義的最大最小寬度與重量
    targetWdth = currentFont.axes.volumeToWidth.min + volumeRatio * (currentFont.axes.volumeToWidth.max - currentFont.axes.volumeToWidth.min)
    targetWght = currentFont.axes.volumeToWeight.min + volumeRatio * (currentFont.axes.volumeToWeight.max - currentFont.axes.volumeToWeight.min)
    
  } else {
    // 【待機狀態】由正弦波控制，產生胸腔呼吸感
    const sinValue = getSineWave(1500) // 1500ms 週期
    
    targetWdth = currentFont.axes.idleWidth.min + sinValue * (currentFont.axes.idleWidth.max - currentFont.axes.idleWidth.min)
    targetWght = currentFont.axes.idleWeight.min + sinValue * (currentFont.axes.idleWeight.max - currentFont.axes.idleWeight.min)
    
    // 順便緩慢更新漂浮感 Transform
    idleFloatOffset.value = Math.sin(Date.now() / 2500) * 15
    idleRotate.value = Math.sin(Date.now() / 3500) * 2
  }

  // 2. 利用 lerp 來進行平滑過度
  const lerpFactor = isExploding ? IMPACT_SMOOTHING : SMOOTHING
  currentWdth = lerp(currentWdth, targetWdth, lerpFactor)
  currentWght = lerp(currentWght, targetWght, lerpFactor)

  // 3. 原生覆寫 DOM style，繞過 Vue Diff 以達極致順暢
  canvasRef.value.style.fontVariationSettings = `'${currentFont.axes.volumeToWidth.cssTag}' ${currentWdth}, '${currentFont.axes.volumeToWeight.cssTag}' ${currentWght}`

  // 4. 要求次一影格繼續執行
  animationFrameId = requestAnimationFrame(renderLoop)
}

onMounted(() => {
  // 元件掛載後即啟動待機動畫迴圈
  animationFrameId = requestAnimationFrame(renderLoop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrameId)
  stopListening()
})
</script>

<style scoped>
.container {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 10;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: rgba(15, 23, 42, 0.85); /* 蓋上一層半透明深藍 */
  backdrop-filter: blur(12px);
  transition: opacity 0.5s ease;
}

.start-btn {
  padding: 1.2rem 2.5rem;
  font-size: 1.8rem;
  border: 2px solid white;
  background: transparent;
  color: white;
  cursor: pointer;
  border-radius: 12px;
  text-transform: uppercase;
  font-family: var(--font-primary);
  /* 預設按鈕也有微小的可變字型設定 */
  font-variation-settings: 'wght' 500, 'wdth' 100;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.start-btn:hover {
  background: white;
  color: var(--bg-color-idle);
  /* Hover 時字變重變寬 */
  font-variation-settings: 'wght' 800, 'wdth' 120;
  transform: scale(1.05);
}

.hint {
  margin-top: 1.5rem;
  font-size: 1rem;
  opacity: 0.7;
  letter-spacing: 0.1em;
}

/* 底部音量狀態列 */
.audio-visualizer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100vw;
  padding: 1.5rem 3rem;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 20;
  pointer-events: none; /* 避免擋住點擊 */
}

.audio-labels {
  display: flex;
  justify-content: space-between;
  font-family: monospace;
  font-size: 0.9rem;
  opacity: 0.8;
  color: white;
  text-shadow: 0 0 5px rgba(0, 0, 0, 0.5);
}

.audio-bar-container {
  width: 100%;
  height: 8px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.audio-bar-fill {
  height: 100%;
  background-color: #10b981; /* 綠色能量條 */
  transition: width 0.05s linear;
}

.threshold-line {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: #fca5a5; /* 門檻警示紅線 */
  box-shadow: 0 0 4px rgba(252, 165, 165, 0.8);
}
</style>
