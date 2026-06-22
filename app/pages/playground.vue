<template>
  <div class="playground-container" :style="{ backgroundColor: 'var(--bg-color-idle)' }">
    <!-- Header -->
    <header class="header">
      <NuxtLink :to="homeRoute" class="back-btn">{{ text.backToExperience }}</NuxtLink>
      <h1 class="title">{{ text.title }}</h1>
    </header>

    <div class="content">
      <!-- 控制面板 -->
      <aside class="controls">
        <div class="control-group">
          <label class="font-label">{{ text.fontLabel }}</label>
          <select class="font-select" v-model="currentFontId">
            <option v-for="font in availableFonts" :key="font.id" :value="font.id">
              {{ font.name }}
            </option>
          </select>
        </div>

        <div class="divider"></div>

        <!-- 動態產生專屬於該字型的拉桿 -->
        <div v-for="axis in availableAxes" :key="axis" class="control-group axis-slider">
          <label>
            <span>{{ axis.toUpperCase() }}</span>
            <span class="axis-val">{{ formatAxisValue(axisValues[axis] || 0, axis) }}</span>
          </label>
          <input 
            type="range" 
            :min="getAxisMin(axis)" 
            :max="getAxisMax(axis)" 
            :step="getAxisStep(axis)"
            v-model.number="axisValues[axis]"
            class="slider"
          />
        </div>

        <button @click="resetAxes" class="reset-btn">{{ text.resetButton }}</button>
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
          :placeholder="text.inputPlaceholder"
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
import { DEFAULT_FONT_ID, VARIABLE_FONTS, getVisibleFonts } from '~/config/fonts'
import { DEFAULT_LOCALE, MESSAGES } from '~/config/messages'

// State
const text = MESSAGES[DEFAULT_LOCALE].playground
const route = useRoute()
const isDevFontMode = computed(() => route.query.dev === '1')
const devRouteQuery = computed(() => isDevFontMode.value ? { dev: '1' } : undefined)
const homeRoute = computed(() => ({ path: '/', query: devRouteQuery.value }))
const availableFonts = computed(() => getVisibleFonts(isDevFontMode.value))

const currentFontId = useState<string>('globalFontId', () => DEFAULT_FONT_ID)
const currentFont = computed(() => VARIABLE_FONTS[currentFontId.value] ?? VARIABLE_FONTS[DEFAULT_FONT_ID]!)
const getDefaultPreviewText = () => currentFont.value.playgroundText ?? currentFont.value.defaultText
const previewText = ref(getDefaultPreviewText())

// Dynamic axes states
const axisValues = reactive<Record<string, number>>({})

const getAxisMin = (tag: string) => {
  return currentFont.value.axes[tag]?.min ?? 0
}

const getAxisMax = (tag: string) => {
  return currentFont.value.axes[tag]?.max ?? 100
}

const getAxisStep = (tag: string) => {
  return currentFont.value.axes[tag]?.sliderStep ?? 1
}

const formatAxisValue = (value: number, tag: string) => {
  const decimals = currentFont.value.axes[tag]?.decimals ?? 0
  return value.toFixed(decimals)
}

const availableAxes = computed(() => {
  return currentFont.value.supportedAxes
})

const resetAxes = () => {
  const font = currentFont.value
  for (const axis of font.supportedAxes) {
    const config = font.axes[axis]
    axisValues[axis] = config?.idle?.min ?? config?.min ?? 0
  }
}

watch(availableFonts, (fonts) => {
  if (!fonts.some((font) => font.id === currentFontId.value)) {
    currentFontId.value = DEFAULT_FONT_ID
  }
}, { immediate: true })

// Watch font change and initialize slider defaults
watch(currentFontId, () => {
  for (const key in axisValues) {
    delete axisValues[key] // Clear unneeded keys
  }
  previewText.value = getDefaultPreviewText()
  resetAxes()
}, { immediate: true })

// Computed string to bind to style
const currentVariationSettings = computed(() => {
  return availableAxes.value
    .map((axis) => `'${axis}' ${axisValues[axis]}`)
    .join(', ')
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
