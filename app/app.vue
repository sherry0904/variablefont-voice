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
    <Transition name="fade">
      <div v-if="!isListening" class="overlay">
        <!-- 左上角標籤 -->
        <div class="badge">Variable Font × Voice</div>

        <!-- 主標題 -->
        <div class="hero">
          <h1 class="hero-title">你敢大聲嗎</h1>
          <p class="hero-desc">
            你的音量越大，<br>
            文字就越張狂。
          </p>

          <button @click="handleStart" class="start-btn">
            <span class="btn-icon">🎙</span>
            <span class="btn-text">我敢！</span>
          </button>
          <p class="hint">需要允許麥克風權限</p>
        </div>

        <!-- 右下角技術標籤 -->
        <div class="tech-tags">
          <span>wdth</span>
          <span>wght</span>
          <span>slnt</span>
          <span>GRAD</span>
        </div>
      </div>
    </Transition>

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

    <!-- Debug Panel (按 D 切換) -->
    <Transition name="fade">
      <div v-if="showDebug" class="debug-panel">
        <div class="debug-title">🛠 DEBUG MODE</div>
        <div class="debug-row">
          <label>模擬音量</label>
          <input 
            type="range" 
            min="0" max="1" step="0.01"
            v-model.number="debugVolume"
            class="debug-slider"
          />
          <span class="debug-val">{{ Math.round(debugVolume * 100) }}%</span>
        </div>
        <div class="debug-hint">按 D 關閉 · 滑到 0 恢復麥克風</div>
      </div>
    </Transition>
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

// Debug 模式
const showDebug = ref(false)
const debugVolume = ref(0) // 0 = 未啟用，使用真實麥克風

// 切換 Debug Panel (D 鍵)
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'd' || e.key === 'D') showDebug.value = !showDebug.value
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

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

  // 1a. 取得有效音量：Debug 模式下用滑桿值覆蓋麥克風
  const effectiveVolume = (showDebug.value && debugVolume.value > 0)
    ? debugVolume.value
    : rawVolume.value
  const effectiveListening = isListening.value || (showDebug.value && debugVolume.value > 0)

  // 1. 計算當前目標值 Target Values
  let isExploding = false
  let volumeRatio = 0

  if (effectiveListening && effectiveVolume > THRESHOLD) {
    // 【爆發狀態】由聲音音量控制
    isExploding = true
    volumeRatio = Math.min((effectiveVolume - THRESHOLD) / (1 - THRESHOLD), 1)
    
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
    const hueSpeed = 0.5 + volumeRatio * 5
    hueAngle = (hueAngle + hueSpeed) % 360
    // 【方案 A: 背景光暈爆發—強烈紅粉雙色漸層】
    const auraSize2 = 50 + volumeRatio * 200
    const auraOpacity2 = 0.55 + volumeRatio * 0.45
    auraRef.value.style.background = `radial-gradient(circle at center, rgba(255, 50, 50, ${auraOpacity2}) 0%, rgba(200, 0, 120, ${auraOpacity2 * 0.5}) 40%, transparent 80%)`
    auraRef.value.style.transform = `scale(${auraSize2 / 50})`
    auraRef.value.style.filter = `blur(80px) hue-rotate(${hueAngle}deg)`

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
    // 【待機光暈：高飽和藍紫雙色漸層，透明度 0.85】
    const auraSize = 50 + sinValue * 15
    auraRef.value.style.background = `radial-gradient(circle at center, rgba(30, 150, 255, 0.85) 0%, rgba(80, 0, 200, 0.45) 50%, transparent 80%)`
    auraRef.value.style.transform = `scale(${auraSize / 50})`
    auraRef.value.style.filter = `blur(80px) hue-rotate(${hueAngle}deg)`

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
  /* 改成半透明，讓後方的 Aura 光暈透出來 */
  background: rgba(5, 8, 15, 0.55);
  backdrop-filter: blur(8px);
  /* CSS 動態掃光效果 */
  animation: overlayPulse 4s ease-in-out infinite;
}

@keyframes overlayPulse {
  0%   { background: rgba(5, 8, 15, 0.55); }
  50%  { background: rgba(10, 5, 25, 0.45); }
  100% { background: rgba(5, 8, 15, 0.55); }
}

/* Fade 轉場動畫 */
.fade-leave-active {
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.fade-leave-to {
  opacity: 0;
  transform: scale(1.04);
}

/* 左上角技術標籤 */
.badge {
  position: absolute;
  top: 2rem;
  left: 2rem;
  font-family: monospace;
  font-size: 0.8rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.4rem 0.8rem;
  border-radius: 4px;
}

/* 主要內容區塊 */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  text-align: center;
  max-width: 600px;
  width: 90%;
}

.hero-title {
  font-family: var(--font-primary);
  font-variation-settings: 'wght' 800, 'wdth' 120;
  font-size: clamp(2.5rem, 6vw, 5rem);
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: white;
  margin: 0;
  text-align: center;
  width: 100%;
  text-shadow: 0 0 60px rgba(120, 180, 255, 0.4);
}

.hero-desc {
  font-family: var(--font-primary);
  font-variation-settings: 'wght' 300, 'wdth' 90;
  font-size: clamp(1rem, 2vw, 1.25rem);
  line-height: 1.8;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  text-align: center;
}

/* 開始按鈕 */
.start-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2.5rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  cursor: pointer;
  border-radius: 100px;
  font-family: var(--font-primary);
  font-variation-settings: 'wght' 500, 'wdth' 100;
  font-size: 1.4rem;
  letter-spacing: 0.05em;
  box-shadow:
    0 0 20px rgba(100, 150, 255, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 0.5rem;
}

.btn-icon {
  font-size: 1.6rem;
  line-height: 1;
}

.start-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.6);
  font-variation-settings: 'wght' 700, 'wdth' 115;
  box-shadow:
    0 0 40px rgba(100, 150, 255, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: scale(1.04);
}

.hint {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.35);
  margin: 0;
}

/* 右下角軸心技術標籤群 */
.tech-tags {
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}

.tech-tags span {
  font-family: monospace;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 255, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
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

/* Debug Panel 樣式 */
.debug-panel {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 100;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 150, 0.4);
  border-radius: 10px;
  padding: 1rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 260px;
  backdrop-filter: blur(10px);
}

.debug-title {
  font-family: monospace;
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  color: rgba(255, 255, 100, 0.9);
  text-transform: uppercase;
}

.debug-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.debug-row label {
  font-family: monospace;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
}

.debug-slider {
  flex: 1;
  accent-color: #facc15;
  cursor: pointer;
}

.debug-val {
  font-family: monospace;
  font-size: 0.85rem;
  color: #facc15;
  min-width: 3ch;
  text-align: right;
}

.debug-hint {
  font-family: monospace;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.3);
  letter-spacing: 0.05em;
}
</style>
