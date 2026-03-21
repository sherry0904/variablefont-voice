import { ref } from 'vue'

// ========== 聲音分析引擎參數設定區 ==========
// 調整麥克風收音與分析的核心設定
export const AUDIO_CONFIG = {
  volumeMultiplier: 5,        // RMS 真實音量放大倍率 (數值越大，稍微講話就容易滿格)
  volumeDeltaMultiplier: 3.0, // 爆音瞬間加速度的放大倍率 (數值越大，Slant 傾倒越嚴重)
  pitchSmoothing: 0.15,       // 音高變化的平滑度 (0.01~1) 越小越遲鈍
  energyThreshold: 40,        // 判定有聲音的最低頻段能量閥值 (0~255)，避免冷氣噪音亂跳

  // --- 全新加入：人聲音響範圍設定 (基於最新頻譜重心演算法) ---
  pitchMinIndex: 16,          // 男生低音重心的極限值 (平均男生講話大約在 index 12~16，調高會讓男生更容易達到極致出體)
  pitchMaxIndex: 24           // 女生高音/高昂講話重心的極限值 (大約在 index 20~28，調低會更容易達到最細字體)
}
// ==========================================

export const useAudioAnalyzer = () => {
  const isListening = ref(false)

  // 新的聲音特徵輸出
  const rawVolume = ref(0)     // 0-1 (基於 RMS 的真實音量大小)
  const volumeDelta = ref(0)   // 爆音指標 (音量瞬間增加的加速度)
  const pitch = ref(0)         // 0-1 (主音頻頻率，低音至高音)

  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let freqArray: Uint8Array | null = null
  let timeArray: Uint8Array | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let stream: MediaStream | null = null
  let animationFrameId: number

  let lastVolume = 0

  const startListening = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyser = audioContext.createAnalyser()

      // 提高 FFT 解析度 (原本 512 -> 改為 2048)
      // 這可以把低頻切得更細緻，才能精準分辨男生跟女生的基準音高差異
      analyser.fftSize = 2048
      const bufferLength = analyser.frequencyBinCount
      freqArray = new Uint8Array(bufferLength)
      timeArray = new Uint8Array(bufferLength)

      source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      isListening.value = true
      updateVolumeLoop()
    } catch (err) {
      console.error('取得麥克風權限失敗:', err)
      alert('請允許麥克風權限以啟動聲音視覺化。')
    }
  }

  const stopListening = () => {
    isListening.value = false
    cancelAnimationFrame(animationFrameId)
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    if (audioContext) {
      audioContext.close()
    }
    rawVolume.value = 0
    volumeDelta.value = 0
    pitch.value = 0
    lastVolume = 0
  }

  const updateVolumeLoop = () => {
    if (!isListening.value || !analyser || !freqArray || !timeArray) return

    // === 1. 計算真實物理音量 (RMS) ===
    analyser.getByteTimeDomainData(timeArray)
    let sumSquares = 0
    for (let i = 0; i < timeArray.length; i++) {
      // timeDomainData 範圍是 0-255，靜音時中心點是 128
      let normalized = (timeArray[i] - 128) / 128
      sumSquares += normalized * normalized
    }
    const rms = Math.sqrt(sumSquares / timeArray.length)

    // RMS 放大倍率 (靈敏度)。RMS 通常數值偏小，乘以 3.5 倍讓一般說話就能觸發 0.5 以上
    const currentVol = Math.min(1, rms * AUDIO_CONFIG.volumeMultiplier)

    // 平滑化避免雜訊跳動
    rawVolume.value += (currentVol - rawVolume.value) * 0.4

    // === 2. 計算音量爆發力 (Delta) 以反映衝擊感 ===
    const delta = currentVol - lastVolume
    // 只有聲音變大時有 delta，聲音變小不特別處理
    const currentDelta = Math.max(0, delta * AUDIO_CONFIG.volumeDeltaMultiplier)
    volumeDelta.value += (currentDelta - volumeDelta.value) * 0.5
    lastVolume = currentVol

    // === 3. 計算頻譜重心 (Spectral Centroid) 以穩定判斷音高與音色 ===
    analyser.getByteFrequencyData(freqArray)
    let totalEnergy = 0
    let weightedSum = 0
    let maxEnergy = 0

    // 因為改了 FFT 解析度，我們只看前 40 個頻段 (大約 0~800Hz)，這涵蓋了人類男女的主音高與泛音
    for (let i = 2; i < 40; i++) {
      const energy = freqArray[i] || 0
      if (energy > maxEnergy) maxEnergy = energy

      // 計算所有頻率的總能量與加權
      totalEnergy += energy
      weightedSum += energy * i
    }

    // 有一定音量時才更新音高
    if (maxEnergy > AUDIO_CONFIG.energyThreshold && totalEnergy > 0) {
      // 使用重心 (Centroid) 取代最高點，不怕泛音(假音)干擾，能完美反映聲音整體的「厚實/低音」還是「清脆/高音」
      let centroid = weightedSum / totalEnergy

      // 動態抓取設定的頻段範圍，並映射到 0~1 的 Pitch 訊號
      const range = Math.max(1, AUDIO_CONFIG.pitchMaxIndex - AUDIO_CONFIG.pitchMinIndex)
      let targetPitch = Math.min(1, Math.max(0, (centroid - AUDIO_CONFIG.pitchMinIndex) / range))
      pitch.value += (targetPitch - pitch.value) * AUDIO_CONFIG.pitchSmoothing // 稍微平滑
    } else {
      // 沒有足夠聲音時慢慢歸零
      pitch.value += (0 - pitch.value) * 0.05
    }

    animationFrameId = requestAnimationFrame(updateVolumeLoop)
  }

  return {
    isListening,
    rawVolume,
    volumeDelta,
    pitch,
    startListening,
    stopListening
  }
}
