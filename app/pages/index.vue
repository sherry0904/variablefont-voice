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
          <h1 class="hero-title">{{ text.heroTitle }}</h1>
          <p class="hero-desc">
            {{ text.heroDescriptionLine1 }}<br>
            {{ text.heroDescriptionLine2 }}
          </p>

          <button @click="handleStart" class="start-btn">
            <span class="btn-icon">🎙</span>
            <span class="btn-text">{{ text.startButton }}</span>
          </button>
          <p class="hint">{{ text.micHint }}</p>
        </div>

        <!-- 右下角技術標籤與前往訓練場 -->
        <div class="tech-tags-container">
          <div class="tech-tags">
            <span v-for="tag in currentFont.supportedAxes" :key="tag">{{ tag }}</span>
          </div>
          
          <!-- 字型選擇器 -->
          <div class="font-switcher">
            <select v-model="currentFontId">
              <option v-for="font in availableFonts" :key="font.id" :value="font.id">
                {{ font.name }}
              </option>
            </select>
          </div>

          <NuxtLink :to="playgroundRoute" class="playground-link">Playground) →</NuxtLink>
        </div>
      </div>
    </Transition>

    <!-- The Dense Canvas with RGB Shift Layers -->
    <div 
      ref="canvasRef" 
      class="dense-text-canvas"
    >
      <!-- 使用三層文字疊加來模擬色散 -->
      <span class="text-layer layer-red" :style="{ transform: `translate(${rgbOffset.x}px, ${rgbOffset.y}px)` }">{{ displayWord }}</span>
      <span class="text-layer layer-cyan" :style="{ transform: `translate(${-rgbOffset.x}px, ${-rgbOffset.y}px)` }">{{ displayWord }}</span>
      <span class="text-layer layer-main">{{ displayWord }}</span>
    </div>

    <!-- 左上角字型選擇與狀態列 -->
    <div v-if="isListening" class="live-ui">
      <div class="top-row-controls">
        <div class="font-switcher top-left">
          <select v-model="currentFontId">
            <option v-for="font in availableFonts" :key="font.id" :value="font.id">
              {{ text.fontPrefix }}{{ font.name }}
            </option>
          </select>
        </div>
        
        <!-- 面板開關按鈕 -->
        <button 
          class="monitor-toggle" 
          @click="showMonitor = !showMonitor"
          :class="{ active: showMonitor }"
          :title="text.monitorToggleTitle"
        >
          <span class="toggle-text">{{ showMonitor ? text.hideValues : text.showValues }}</span>
        </button>
      </div>

      <!-- 實時軸心監測面板 -->
      <Transition name="monitor-fade">
        <div v-if="showMonitor" class="axis-monitor">
          <div 
            v-for="tag in currentFont.supportedAxes" 
            :key="tag"
            class="axis-display-item"
          >
            <div class="axis-tag">{{ tag.toUpperCase() }}</div>
            <div class="axis-val-group">
              <span class="axis-current-val">{{ Math.round(liveAxes[tag] ?? 0) }}</span>
              <!-- 能量條與極限值標籤 -->
              <div class="axis-mini-bar-container">
                <span class="axis-limit-val min">{{ getAxisRange(tag).min }}</span>
                <div class="axis-mini-bar">
                   <div 
                     class="axis-mini-fill"
                     :style="{ width: `${getAxisPercent(tag)}%` }"
                   ></div>
                </div>
                <span class="axis-limit-val max">{{ getAxisRange(tag).max }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Audio Visualizer Status Bar -->
      <div class="audio-visualizer">
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

    <!-- Debug Panel (按 D 切換) -->
    <Transition name="fade">
      <div v-if="showDebug" class="debug-panel">
        <div class="debug-title">🛠 DEBUG MODE</div>
        <div class="debug-row">
          <label>{{ debugText.volumeLabel }}</label>
          <input 
            type="range" 
            min="0" max="1" step="0.01"
            v-model.number="debugVolume"
            class="debug-slider"
          />
          <span class="debug-val">{{ Math.round(debugVolume * 100) }}%</span>
        </div>
        <div class="debug-row" :style="{ opacity: debugVolume > 0 ? 1 : 0.5 }">
          <label>{{ debugText.pitchLabel }}</label>
          <input 
            type="range" 
            min="0" max="1" step="0.01"
            v-model.number="debugPitch"
            class="debug-slider"
            :disabled="debugVolume === 0"
          />
          <span class="debug-val">{{ Math.round(debugPitch * 100) }}%</span>
        </div>
        <div class="debug-row" :style="{ opacity: debugVolume > 0 && hasDeltaDrivenAxis ? 1 : 0.5 }">
          <label>{{ debugText.deltaLabel }}</label>
          <input 
            type="range" 
            min="0" max="1" step="0.01"
            v-model.number="debugDelta"
            class="debug-slider"
            :disabled="debugVolume === 0 || !hasDeltaDrivenAxis"
          />
          <span class="debug-val">{{ Math.round(debugDelta * 100) }}%</span>
        </div>
        <div class="debug-hint">{{ debugText.hint }}</div>
        <div class="divider"></div>
        <NuxtLink :to="playgroundRoute" class="debug-playground-link">Playground →</NuxtLink>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, reactive, watch } from 'vue'
import { useAudioAnalyzer } from '~/composables/useAudioAnalyzer'
import { lerp, getSineWave } from '~/composables/useMath'
import { DEFAULT_FONT_ID, VARIABLE_FONTS, getVisibleFonts, type AxisConfig } from '~/config/fonts'
import { DEBUG_LOCALE, DEFAULT_LOCALE, MESSAGES } from '~/config/messages'

const { isListening, rawVolume, volumeDelta, pitch, startListening, stopListening } = useAudioAnalyzer()
const text = MESSAGES[DEFAULT_LOCALE].index
const debugText = MESSAGES[DEBUG_LOCALE].debug

// ========== 動態互動視覺參數設定區 ==========
// 你可以在這裡調整所有字體和視覺反應的幅度！
const VISUAL_CONFIG = {
  maxScale: 0.8,              // 大聲時字體放大的額外比例 (1 + 0.8 = 原本的 1.8 倍)
  slantMultiplier: 2.0,       // 爆發時的傾斜幅度倍率
  shakeIntensity: 25,         // 大聲時最大震動幅度 (px)
  rgbShiftIntensity: 15,      // 大聲時 RGB 色散錯位的最大分離度 (px)
  
  baseHue: 240,               // 待機時的基礎色相 (240 為藍色，0 為紅色)
  pitchColorRange: 160,       // 色相變動範圍 (240 + 160 = 400，等於色相 40 的橘黃色，讓高低溫差更強烈)
  smoothingActive: 0.35,      // 有聲音時的反應平滑度 (越大越即刻，越小越像黏土)
  smoothingIdle: 0.1          // 待機時的恢復平滑度 (控制回彈速度)
}
// ==========================================

// 計算音量條顏色
const visualizerColor = computed(() => {
  const vol = rawVolume.value
  if (vol < 0.05) return '#10b981' // 綠色 (低音/環境音)
  if (vol < 0.3) return '#fbbf24'  // 黃色 (一般說話)
  if (vol < 0.6) return '#f87171'  // 橙紅色 (大聲)
  return '#c084fc'                 // 紫色 (咆咆狀態)
})

const route = useRoute()
const isDevFontMode = computed(() => route.query.dev === '1')
const devRouteQuery = computed(() => isDevFontMode.value ? { dev: '1' } : undefined)
const playgroundRoute = computed(() => ({ path: '/playground', query: devRouteQuery.value }))
const availableFonts = computed(() => getVisibleFonts(isDevFontMode.value))

const currentFontId = useState<string>('globalFontId', () => DEFAULT_FONT_ID)
const currentFont = computed(() => VARIABLE_FONTS[currentFontId.value] ?? VARIABLE_FONTS[DEFAULT_FONT_ID]!)
const hasDeltaDrivenAxis = computed(() => {
  return currentFont.value.supportedAxes.some((tag) => currentFont.value.axes[tag]?.input === 'delta')
})

watch(availableFonts, (fonts) => {
  if (!fonts.some((font) => font.id === currentFontId.value)) {
    currentFontId.value = DEFAULT_FONT_ID
  }
}, { immediate: true })

const canvasRef = ref<HTMLElement | null>(null)
const auraRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

// 畫面上要填滿被擠壓的文字
const displayWord = computed(() => currentFont.value.defaultText)
const THRESHOLD = 0.05 // 音量過濾門檻，過濾環境音

// Debug 模式
const showDebug = ref(false)
const debugVolume = ref(0) // 0 = 未啟用，使用真實麥克風
const debugPitch = ref(0.5) // 控制字重 (低音粗/高音細)
const debugDelta = ref(0)   // 控制爆發力傾斜

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

// 是否顯示實時監測面板
const showMonitor = ref(false)

// 夜店模式：Hue-rotate 計時器與閃頻狀態
let hueAngle = 0
let lastStrobeTime = 0

// 內部變數 (無 Reactivity 開銷)
let animationFrameId: number
const currentAxisValues: Record<string, number> = {}

// 響應式狀態，用於在 UI 顯示數值
const liveAxes = reactive<Record<string, number>>({})

const getAxisInitialValue = (axis: AxisConfig) => {
  return axis.idle?.min ?? axis.min
}

const resetAxisValues = () => {
  const font = currentFont.value

  for (const tag of Object.keys(currentAxisValues)) delete currentAxisValues[tag]
  for (const tag of Object.keys(liveAxes)) delete liveAxes[tag]

  for (const tag of font.supportedAxes) {
    const axis = font.axes[tag]
    if (!axis) continue

    const initialValue = getAxisInitialValue(axis)
    currentAxisValues[tag] = initialValue
    liveAxes[tag] = initialValue
  }
}

// 取得特定軸心在當前字型下的數值範圍
const getAxisRange = (tag: string) => {
  const axis = currentFont.value.axes[tag]
  return {
    min: axis?.min ?? 0,
    max: axis?.max ?? 100
  }
}

// 計算軸心在該字型定義範圍內的百分比，用於進度條顯示
const getAxisPercent = (tag: string) => {
  const { min, max } = getAxisRange(tag)
  const val = liveAxes[tag] ?? min
  
  if (max === min) return 0
  return Math.min(100, Math.max(0, ((val - min) / (max - min)) * 100))
}

watch(currentFontId, resetAxisValues, { immediate: true })

const getRatioValue = (axis: AxisConfig, ratio: number) => {
  return axis.min + ratio * (axis.max - axis.min)
}

const getActiveAxisTarget = (
  axis: AxisConfig,
  volumeRatio: number,
  effectivePitch: number,
  effectiveDelta: number
) => {
  const input = axis.input ?? 'none'

  if (input === 'volume') return getRatioValue(axis, volumeRatio)
  if (input === 'pitch') return getRatioValue(axis, effectivePitch)
  if (input === 'pitchInverse') return getRatioValue(axis, 1 - effectivePitch)
  if (input === 'delta') {
    const deltaRatio = Math.min(1, Math.max(0, effectiveDelta * VISUAL_CONFIG.slantMultiplier))
    return getRatioValue(axis, deltaRatio)
  }

  return getAxisInitialValue(axis)
}

const getIdleAxisTarget = (axis: AxisConfig, sinValue: number) => {
  if (!axis.idle) return getAxisInitialValue(axis)
  return axis.idle.min + sinValue * (axis.idle.max - axis.idle.min)
}

const getVariationSettings = () => {
  return currentFont.value.supportedAxes
    .map((tag) => {
      const axis = currentFont.value.axes[tag]
      const value = currentAxisValues[tag] ?? (axis ? getAxisInitialValue(axis) : 0)
      const decimals = axis?.decimals ?? 2
      return `'${tag}' ${value.toFixed(decimals)}`
    })
    .join(', ')
}

const syncLiveAxisValues = () => {
  for (const tag of currentFont.value.supportedAxes) {
    const axis = currentFont.value.axes[tag]
    if (!axis) continue
    liveAxes[tag] = currentAxisValues[tag] ?? getAxisInitialValue(axis)
  }
}

const handleStart = () => {
  startListening()
}

// 核心渲染迴圈 (60fps)
const renderLoop = () => {
  if (!canvasRef.value || !auraRef.value) {
    animationFrameId = requestAnimationFrame(renderLoop)
    return
  }

  const font = currentFont.value

  // 1a. 取得有效輸入值：Debug 模式下用滑桿值覆蓋麥克風
  const isDebugMode = showDebug.value && debugVolume.value > 0
  const effectiveVolume = isDebugMode ? debugVolume.value : rawVolume.value
  const effectivePitch = isDebugMode ? debugPitch.value : pitch.value
  const effectiveDelta = isDebugMode ? debugDelta.value : volumeDelta.value
  
  const effectiveListening = isListening.value || isDebugMode

  // 1. 計算當前目標值 Target Values
  let isExploding = false
  let volumeRatio = 0

  if (effectiveListening && effectiveVolume > THRESHOLD) {
    // 【爆發狀態】由聲音音量控制
    isExploding = true
    volumeRatio = Math.min((effectiveVolume - THRESHOLD) / (1 - THRESHOLD), 1)
    
    // 4. 音量控制 字級/縮放 (Size/Scale)
    const targetScale = 1 + volumeRatio * VISUAL_CONFIG.maxScale
    canvasRef.value.style.transform = `translate(${containerOffset.value.x}px, ${containerOffset.value.y}px) rotate(${idleRotate.value}deg) scale(${targetScale})`

    // 【方案 E: 震動邏輯】
    // 震動幅度隨音量加大
    const shakeIntensity = volumeRatio * VISUAL_CONFIG.shakeIntensity 
    containerOffset.value = {
      x: (Math.random() - 0.5) * shakeIntensity,
      y: (Math.random() - 0.5) * shakeIntensity
    }
    
    // 【方案 E: 色散位移 (RGB Shift)】
    const shiftIntensity = volumeRatio * VISUAL_CONFIG.rgbShiftIntensity
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

    // 【夜店模式：Strobe 閃頻，音量超過 0.7 時且加速度高時一閃】
    const now = Date.now()
    if (volumeRatio > 0.7 && now - lastStrobeTime > 100) {
      lastStrobeTime = now
      containerRef.value!.style.backgroundColor = '#ffffff'
      setTimeout(() => {
        if (containerRef.value) containerRef.value.style.backgroundColor = ''
      }, 40)
    }

    // lerp 平滑過渡
    const lerpFactor = VISUAL_CONFIG.smoothingActive
    for (const tag of font.supportedAxes) {
      const axis = font.axes[tag]
      if (!axis) continue

      const currentValue = currentAxisValues[tag] ?? getAxisInitialValue(axis)
      const targetValue = getActiveAxisTarget(axis, volumeRatio, effectivePitch, effectiveDelta)
      currentAxisValues[tag] = lerp(currentValue, targetValue, lerpFactor)
    }

  } else {
    // 【待機狀態】
    const sinValue = getSineWave(1500)

    // 待機重置
    idleFloatOffset.value = Math.sin(Date.now() / 2500) * 15
    containerOffset.value = { x: 0, y: idleFloatOffset.value }
    rgbOffset.value       = { x: 0, y: 0 }
    idleRotate.value      = Math.sin(Date.now() / 3500) * 2

    // 恢復原始縮放比例
    canvasRef.value.style.transform = `translate(${containerOffset.value.x}px, ${containerOffset.value.y}px) rotate(${idleRotate.value}deg) scale(1)`

    // 色彩循環：待機時緩慢轉動
    hueAngle = (hueAngle + 0.3) % 360
    // 【待機光暈：高飽和藍紫雙色漸層，透明度 0.85】
    const auraSize = 50 + sinValue * 15
    auraRef.value.style.background = `radial-gradient(circle at center, rgba(30, 150, 255, 0.85) 0%, rgba(80, 0, 200, 0.45) 50%, transparent 80%)`
    auraRef.value.style.transform = `scale(${auraSize / 50})`
    auraRef.value.style.filter = `blur(80px) hue-rotate(${hueAngle}deg)`

    // lerp 平滑回待機 (這裡也加入一些物理彈性)
    const idleLerp = VISUAL_CONFIG.smoothingIdle
    for (const tag of font.supportedAxes) {
      const axis = font.axes[tag]
      if (!axis) continue

      const currentValue = currentAxisValues[tag] ?? getAxisInitialValue(axis)
      const targetValue = getIdleAxisTarget(axis, sinValue)
      currentAxisValues[tag] = lerp(currentValue, targetValue, idleLerp)
    }
  }

  // 動態寫入僅該字型支援的可變字型軸心至 DOM
  canvasRef.value.style.fontVariationSettings = getVariationSettings()
  canvasRef.value.style.fontFamily = font.cssFamily

  // 同步數值至 UI 監測面板
  syncLiveAxisValues()

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
  font-variation-settings: 'wght' 600, 'wdth' 100;
  font-size: clamp(2.5rem, 5vw, 4rem);
  line-height: 1.1;
  letter-spacing: 0;
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
  font-variation-settings: 'wght' 600, 'wdth' 100;
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

.tech-tags-container {
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1rem;
}

.tech-tags {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}

.playground-link {
  color: #10b981;
  text-decoration: none;
  font-family: monospace;
  font-size: 0.85rem;
  transition: opacity 0.2s;
}

.playground-link:hover {
  opacity: 0.8;
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
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(255, 255, 150, 0.4);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 320px;
  backdrop-filter: blur(10px);
}

.debug-title {
  font-family: inherit;
  font-variation-settings: 'wght' 700;
  font-size: 1rem;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 100, 0.9);
  text-transform: uppercase;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5rem;
}

.debug-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: opacity 0.2s ease;
}

.debug-row label {
  font-family: monospace;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  min-width: 120px;
}

.debug-slider {
  flex: 1;
  accent-color: #facc15;
  cursor: pointer;
  height: 6px;
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

.debug-panel .divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0.5rem 0;
}

.debug-playground-link {
  color: #10b981;
  text-decoration: none;
  font-family: monospace;
  font-size: 0.8rem;
  text-align: center;
  margin-top: -0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: rgba(16, 185, 129, 0.1);
  transition: all 0.2s;
  letter-spacing: 0.05em;
}

.debug-playground-link:hover {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

/* Font Switcher Styles */
.font-switcher {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  display: flex;
  align-items: center;
  backdrop-filter: blur(8px);
  z-index: 50;
}

.font-switcher.bottom-right {
  position: absolute;
  bottom: 2rem;
  right: 2rem;
  margin-bottom: 2.5rem; /* Pushed up to make room for tech tags */
}

.font-switcher.top-left {
  position: static;
}

.font-switcher select {
  appearance: none;
  background: transparent;
  border: none;
  color: white;
  font-family: monospace;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  outline: none;
}

.font-switcher select option {
  background: #111;
  color: white;
}

.top-row-controls {
  position: absolute;
  top: 2rem;
  left: 2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  z-index: 60;
}

.monitor-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  backdrop-filter: blur(8px);
  font-family: monospace;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.monitor-toggle:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.4);
  color: white;
}

.monitor-toggle.active {
  background: rgba(250, 204, 21, 0.1);
  border-color: rgba(250, 204, 21, 0.4);
  color: #facc15;
}

/* Axis Monitor Styles */
.axis-monitor {
  position: absolute;
  top: 5rem; /* Adjusted for top-row-controls height */
  left: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 180px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12px);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 50;
  pointer-events: none;
}

/* Monitor Transitions */
.monitor-fade-enter-active,
.monitor-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.monitor-fade-enter-from,
.monitor-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.axis-display-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.axis-tag {
  font-family: monospace;
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.1em;
}

.axis-val-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.axis-current-val {
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: 700;
  color: #facc15; /* 亮黃色，與音量條呼應 */
  min-width: 3.5ch;
  text-shadow: 0 0 10px rgba(250, 204, 21, 0.3);
}

.axis-mini-bar-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.axis-limit-val {
  font-family: monospace;
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.25);
  min-width: 2.5ch;
  text-align: center;
}

.axis-mini-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.axis-mini-fill {
  height: 100%;
  background: #facc15;
  border-radius: 2px;
  transition: width 0.1s ease-out;
}
</style>
