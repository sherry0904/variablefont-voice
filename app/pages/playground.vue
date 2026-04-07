<template>
  <div class="playground-container" :style="{ backgroundColor: 'var(--bg-color-idle)' }">
    <!-- Header -->
    <header class="header">
      <NuxtLink to="/" class="back-btn">← 回聲音互動</NuxtLink>
      <h1 class="title">可變字型測試場域 (Playground)</h1>
    </header>

    <div class="content">
      <!-- 控制面板 -->
      <aside class="controls">
        <div class="control-group">
          <label class="font-label">選擇字型</label>
          <select class="font-select" v-model="currentFontId">
            <option v-for="font in Object.values(VARIABLE_FONTS)" :key="font.id" :value="font.id">
              {{ font.name }}
            </option>
          </select>
        </div>

        <div class="divider"></div>

        <!-- 動態產生專屬於該字型的拉桿 -->
        <div v-for="axis in availableAxes" :key="axis" class="control-group axis-slider">
          <label>
            <span>{{ axis.toUpperCase() }}</span>
            <span class="axis-val">{{ Math.round(axisValues[axis] || 0) }}</span>
          </label>
          <input 
            type="range" 
            :min="getAxisMin(axis)" 
            :max="getAxisMax(axis)" 
            step="1"
            v-model.number="axisValues[axis]"
            class="slider"
          />
        </div>

        <button @click="resetAxes" class="reset-btn">重設預設值</button>
      </aside>

      <!-- 預覽區 -->
      <main class="preview-area">
        <textarea 
          v-model="previewText"
          class="preview-input"
          :style="{
            fontFamily: currentFont.cssFamily,
            fontVariationSettings: currentVariationSettings
          }"
          placeholder="輸入文字測試..."
        ></textarea>
        <div class="css-display">
          font-variation-settings: {{ currentVariationSettings || 'normal' }};
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { VARIABLE_FONTS } from '~/config/fonts'

// State
const currentFontId = useState<string>('globalFontId', () => 'dfpKingGothic')
const currentFont = computed(() => VARIABLE_FONTS[currentFontId.value]!)
const previewText = ref('VOICE\n可變字型')

// Dynamic axes states
const axisValues = reactive<Record<string, number>>({})

// Helper to pull the absolute min/max limits from our config context for the slider bounds
const getAxisMin = (tag: string) => {
  // We look into the most extreme limits defined in the font config
  const font = currentFont.value
  let min = 0
  if (tag === 'wdth') min = font.axes.volumeToWidth?.min ?? 25
  if (tag === 'wght') min = font.axes.volumeToWeight?.min ?? 100
  if (tag === 'slnt') min = font.axes.volumeToSlant?.max ?? -10 // slnt goes negative usually, so min is the negative max
  if (tag === 'GRAD') min = font.axes.volumeToGrade?.min ?? -200
  return min
}

const getAxisMax = (tag: string) => {
  const font = currentFont.value
  let max = 1000
  if (tag === 'wdth') max = font.axes.volumeToWidth?.max ?? 150
  if (tag === 'wght') max = font.axes.volumeToWeight?.max ?? 1000
  if (tag === 'slnt') max = font.axes.volumeToSlant?.min ?? 0
  if (tag === 'GRAD') max = font.axes.volumeToGrade?.max ?? 150
  return max
}

const availableAxes = computed(() => {
  return currentFont.value.supportedAxes
})

const resetAxes = () => {
  const font = currentFont.value
  if (font.supportedAxes.includes('wdth')) axisValues.wdth = font.axes.idleWidth?.min ?? 100
  if (font.supportedAxes.includes('wght')) axisValues.wght = font.axes.idleWeight?.min ?? 400
  if (font.supportedAxes.includes('slnt')) axisValues.slnt = font.axes.idleSlant?.min ?? 0
  if (font.supportedAxes.includes('GRAD')) axisValues.GRAD = font.axes.idleGrade?.min ?? 0
}

// Watch font change and initialize slider defaults
watch(currentFontId, () => {
  for (const key in axisValues) {
    delete axisValues[key] // Clear unneeded keys
  }
  resetAxes()
}, { immediate: true })

// Computed string to bind to style
const currentVariationSettings = computed(() => {
  const settings = []
  if (availableAxes.value.includes('wdth')) settings.push(`'wdth' ${axisValues.wdth}`)
  if (availableAxes.value.includes('wght')) settings.push(`'wght' ${axisValues.wght}`)
  if (availableAxes.value.includes('slnt')) settings.push(`'slnt' ${axisValues.slnt}`)
  if (availableAxes.value.includes('GRAD')) settings.push(`'GRAD' ${axisValues.GRAD}`)
  return settings.join(', ')
})

</script>

<style scoped>
.playground-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  color: white;
}

.header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 2rem;
}

.back-btn {
  color: #10b981;
  text-decoration: none;
  font-family: monospace;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
  border: 1px solid #10b981;
  border-radius: 6px;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(16, 185, 129, 0.1);
}

.title {
  font-family: monospace;
  font-size: 1.25rem;
  margin: 0;
  letter-spacing: 0.1em;
}

.content {
  display: flex;
  flex: 1;
}

.controls {
  width: 350px;
  background: rgba(0, 0, 0, 0.3);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.font-label {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.05em;
}

.font-select {
  padding: 0.75rem;
  background: #111;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
  cursor: pointer;
}

.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 1rem 0;
}

.axis-slider label {
  display: flex;
  justify-content: space-between;
  font-family: monospace;
  font-size: 0.9rem;
}

.axis-val {
  color: #facc15;
}

.slider {
  width: 100%;
  accent-color: #facc15;
  cursor: pointer;
}

.reset-btn {
  margin-top: auto;
  padding: 0.75rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.reset-btn:hover {
  color: white;
  background: rgba(255, 255, 255, 0.1);
}

.preview-area {
  flex: 1;
  padding: 3rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.preview-input {
  flex: 1;
  width: 100%;
  background: transparent;
  border: none;
  color: white;
  font-size: 10vw; /* HUGE PREVIEW SIZE */
  line-height: 1.1;
  resize: none;
  outline: none;
  text-align: center;
  overflow: hidden;
}

.preview-input::placeholder {
  color: rgba(255, 255, 255, 0.1);
}

.css-display {
  background: #111;
  padding: 1rem;
  border-radius: 8px;
  font-family: monospace;
  font-size: 0.9rem;
  color: #60a5fa;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>
