<template>
  <div 
    ref="containerRef"
    class="container"
  >
    <!-- Dynamic Aura Background Layer -->
    <div 
      ref="auraRef"
      class="aura-background"
    ></div>

    <!-- Onboarding Overlay -->
    <div v-if="!isListening" class="overlay">
      <button @click="handleStart" class="start-btn">按下開始咆哮</button>
      <p class="hint">請允許麥克風權限以體驗互動字型</p>
    </div>

    <!-- The Dense Canvas with RGB Shift Layers -->
    <div 
      ref="canvasRef" 
      class="dense-text-canvas"
      :style="{ transform: `translate(${containerOffset.x}px, ${containerOffset.y}px) rotate(${idleRotate}deg)` }"
    >
      <!-- 使用三層文字疊加來模擬色散 -->
      <span class="text-layer layer-red" :style="{ transform: `translate(${rgbOffset.x}px, ${rgbOffset.y}px)` }">{{ displayWord }}</span>
      <span class="text-layer layer-cyan" :style="{ transform: `translate(${-rgbOffset.x}px, ${-rgbOffset.y}px)` }">{{ displayWord }}</span>
      <span class="text-layer layer-main">{{ displayWord }}</span>
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
const auraRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

// 畫面上要填滿被擠壓的文字
const displayWord = "VOICE"
const THRESHOLD = 0.05 // 音量過濾門檻，過濾環境音
const SMOOTHING = 0.1 // 待機與降緩時的平滑系數
const IMPACT_SMOOTHING = 0.35 // 爆發時的平滑系數 (靈敏度較高)

// 物理漂浮與震動狀態
const containerOffset = ref({ x: 0, y: 0 })
const rgbOffset = ref({ x: 0, y: 0 })
const idleRotate = ref(0)
const idleFloatOffset = ref(0) // 內部輔助呼吸高度

// 夜店模式：Hue-rotate 計時器與閃頻狀態
let hueAngle = 0
let lastStrobeTime = 0

// 內部變數 (無 Reactivity 開銷)
let animationFrameId: number
let currentWdth  = currentFont.axes.idleWidth.min
let currentWght  = currentFont.axes.idleWeight.min
let currentSlnt  = 0
let currentGrad  = currentFont.axes.idleGrade.min

const handleStart = () => {
  startListening()
}

// 核心渲染迴圈 (60fps)
const renderLoop = () => {
  if (!canvasRef.value || !auraRef.value) {
    animationFrameId = requestAnimationFrame(renderLoop)
    return
  }

  // 1. 計算當前目標值 Target Values
  let targetWdth = 0
  let targetWght = 0
  let isExploding = false
  let volumeRatio = 0

  if (isListening.value && rawVolume.value > THRESHOLD) {
    // 【爆發狀態】由聲音音量控制
    isExploding = true
    volumeRatio = Math.min((rawVolume.value - THRESHOLD) / (1 - THRESHOLD), 1)
    
    // 將 0-1 映射到設定檔定義的最大最小值
    const targetWdth = currentFont.axes.volumeToWidth.min  + volumeRatio * (currentFont.axes.volumeToWidth.max  - currentFont.axes.volumeToWidth.min)
    const targetWght = currentFont.axes.volumeToWeight.min + volumeRatio * (currentFont.axes.volumeToWeight.max - currentFont.axes.volumeToWeight.min)
    const targetSlnt = currentFont.axes.volumeToSlant.min  + volumeRatio * (currentFont.axes.volumeToSlant.max  - currentFont.axes.volumeToSlant.min)
    const targetGrad = currentFont.axes.volumeToGrade.min  + volumeRatio * (currentFont.axes.volumeToGrade.max  - currentFont.axes.volumeToGrade.min)
    
    // 【方案 E: 震動邏輯】
    // 震動幅度隨音量加大
    const shakeIntensity = volumeRatio * 25 
    containerOffset.value = {
      x: (Math.random() - 0.5) * shakeIntensity,
      y: (Math.random() - 0.5) * shakeIntensity
    }
    
    // 【方案 E: 色散位移 (RGB Shift)】
    const shiftIntensity = volumeRatio * 15
    rgbOffset.value = {
      x: (Math.random() - 0.5) * shiftIntensity,
      y: (Math.random() - 0.5) * shiftIntensity
    }

    // 【夜店模式：Hue-rotate 色彩循環，大聲時旋轉加速】
    const hueSpeed = 0.5 + volumeRatio * 5 // 待機 0.5deg/frame，咆哮最高 5.5deg/frame
    hueAngle = (hueAngle + hueSpeed) % 360
    auraRef.value.style.filter = `blur(100px) hue-rotate(${hueAngle}deg)`

    // 【夜店模式：Strobe 閃頻，音量超過 0.7 時每 100ms 一閃】
    const now = Date.now()
    if (volumeRatio > 0.7 && now - lastStrobeTime > 100) {
      lastStrobeTime = now
      containerRef.value!.style.backgroundColor = '#ffffff'
      setTimeout(() => {
        if (containerRef.value) containerRef.value.style.backgroundColor = ''
      }, 40)
    }

    // lerp 平滑過渡
    const lerpFactor = IMPACT_SMOOTHING
    currentWdth = lerp(currentWdth, targetWdth, lerpFactor)
    currentWght = lerp(currentWght, targetWght, lerpFactor)
    currentSlnt = lerp(currentSlnt, targetSlnt, lerpFactor)
    currentGrad = lerp(currentGrad, targetGrad, lerpFactor)

  } else {
    // 【待機狀態】
    const sinValue = getSineWave(1500)
    const idleWdth = currentFont.axes.idleWidth.min  + sinValue * (currentFont.axes.idleWidth.max  - currentFont.axes.idleWidth.min)
    const idleWght = currentFont.axes.idleWeight.min + sinValue * (currentFont.axes.idleWeight.max - currentFont.axes.idleWeight.min)
    const idleGrad = currentFont.axes.idleGrade.min  + sinValue * (currentFont.axes.idleGrade.max  - currentFont.axes.idleGrade.min)

    // 待機重置
    idleFloatOffset.value = Math.sin(Date.now() / 2500) * 15
    containerOffset.value = { x: 0, y: idleFloatOffset.value }
    rgbOffset.value       = { x: 0, y: 0 }
    idleRotate.value      = Math.sin(Date.now() / 3500) * 2

    // 色彩循環：待機時緩慢轉動
    hueAngle = (hueAngle + 0.3) % 360
    auraRef.value.style.filter = `blur(100px) hue-rotate(${hueAngle}deg)`

    // 【方案 A: 背景光暈待機呼吸】
    const auraSize = 50 + sinValue * 15
    auraRef.value.style.background = `radial-gradient(circle at center, rgba(56, 189, 248, 0.35) 0%, transparent 70%)`
    auraRef.value.style.transform = `scale(${auraSize / 50})`

    // lerp 平滑回待機
    currentWdth = lerp(currentWdth, idleWdth, SMOOTHING)
    currentWght = lerp(currentWght, idleWght, SMOOTHING)
    currentSlnt = lerp(currentSlnt, 0, SMOOTHING)
    currentGrad = lerp(currentGrad, idleGrad, SMOOTHING)
  }

  // 最終寫入所有四個可變字型軸心至 DOM
  canvasRef.value.style.fontVariationSettings = [
    `'wdth' ${currentWdth.toFixed(2)}`,
    `'wght' ${currentWght.toFixed(2)}`,
    `'slnt' ${currentSlnt.toFixed(3)}`,
    `'GRAD' ${currentGrad.toFixed(2)}`,
  ].join(', ')

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
  overflow: hidden; /* 防止震動時出現捲軸 */
}

/* 文字層級樣式 */
.dense-text-canvas {
  position: relative;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-layer {
  position: absolute;
  /* 讓三層文字完全重疊 */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* RGB 色散層設定 */
.layer-red {
  color: #ff0000;
  mix-blend-mode: screen;
  z-index: 1;
}

.layer-cyan {
  color: #00ffff;
  mix-blend-mode: screen;
  z-index: 2;
}

.layer-main {
  color: white;
  z-index: 3;
}

/* 方案 A: 背景光暈樣式 */
.aura-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  filter: blur(100px);
  pointer-events: none;
  transition: background 0.3s ease;
  will-change: transform, background;
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
