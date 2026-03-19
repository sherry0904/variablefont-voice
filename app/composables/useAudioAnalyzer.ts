import { ref } from 'vue'

export const useAudioAnalyzer = () => {
  const isListening = ref(false)
  const rawVolume = ref(0) // 0-1 之間的原始響度
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let dataArray: Uint8Array | null = null
  let source: MediaStreamAudioSourceNode | null = null
  let stream: MediaStream | null = null
  let animationFrameId: number

  const startListening = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      analyser = audioContext.createAnalyser()
      
      // 設定頻率解析度
      analyser.fftSize = 256
      const bufferLength = analyser.frequencyBinCount
      dataArray = new Uint8Array(bufferLength)

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
  }

  const updateVolumeLoop = () => {
    if (!isListening.value || !analyser || !dataArray) return

    analyser.getByteFrequencyData(dataArray)
    
    // 計算平均音量
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    const average = sum / dataArray.length
    
    // 正規化至 0-1
    rawVolume.value = average / 255

    animationFrameId = requestAnimationFrame(updateVolumeLoop)
  }

  return {
    isListening,
    rawVolume,
    startListening,
    stopListening
  }
}
