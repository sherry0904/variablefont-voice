export type Locale = 'ja' | 'zh-TW' | 'en';

export const DEFAULT_LOCALE: Locale = 'ja';
export const DEBUG_LOCALE: Locale = 'zh-TW';

export const MESSAGES = {
  ja: {
    index: {
      heroTitle: '声で変わる文字',
      heroDescriptionLine1: '声の大きさと高さに合わせて、',
      heroDescriptionLine2: '文字のかたちが変化します。',
      startButton: 'はじめる',
      micHint: 'マイクの使用を許可してください。音声はこの体験内でのみ使用されます。',
      fontPrefix: 'フォント：',
      monitorToggleTitle: '数値パネルを切り替え',
      showValues: '数値を表示',
      hideValues: '数値を隠す',
    },
    playground: {
      backToExperience: '← 体験に戻る',
      title: '可変フォント Playground',
      fontLabel: 'フォントを選択',
      resetButton: '初期値に戻す',
      inputPlaceholder: '文字を入力...',
    },
    audio: {
      micPermissionError: 'マイクの使用を許可してください。',
    },
    debug: {
      volumeLabel: '音量 Volume',
      pitchLabel: '音の高さ Pitch',
      deltaLabel: '変化量 Delta',
      hint: 'Dキーで閉じる · 0に戻すとマイク入力',
    },
  },
  'zh-TW': {
    index: {
      heroTitle: '聲音改變文字',
      heroDescriptionLine1: '文字會隨著聲音大小與音高，',
      heroDescriptionLine2: '即時改變形狀。',
      startButton: '開始',
      micHint: '請允許使用麥克風。聲音只會用於這個互動體驗。',
      fontPrefix: '字型：',
      monitorToggleTitle: '切換數據監測面板',
      showValues: '顯示數值',
      hideValues: '隱藏數值',
    },
    playground: {
      backToExperience: '← 回聲音互動',
      title: '可變字型測試場域 (Playground)',
      fontLabel: '選擇字型',
      resetButton: '重設預設值',
      inputPlaceholder: '輸入文字測試...',
    },
    audio: {
      micPermissionError: '請允許麥克風權限以啟動聲音視覺化。',
    },
    debug: {
      volumeLabel: '模擬音量 Volume',
      pitchLabel: '模擬音高 Pitch',
      deltaLabel: '模擬爆發 Delta',
      hint: '按 D 關閉 · 滑到 0 恢復麥克風',
    },
  },
  en: {
    index: {
      heroTitle: 'Type responds to voice',
      heroDescriptionLine1: 'Letterforms shift with your',
      heroDescriptionLine2: 'volume and pitch.',
      startButton: 'Start',
      micHint: 'Please allow microphone access. Audio is used only for this experience.',
      fontPrefix: 'Font:',
      monitorToggleTitle: 'Toggle value panel',
      showValues: 'Show values',
      hideValues: 'Hide values',
    },
    playground: {
      backToExperience: '← Back to experience',
      title: 'Variable Font Playground',
      fontLabel: 'Select font',
      resetButton: 'Reset values',
      inputPlaceholder: 'Type to test...',
    },
    audio: {
      micPermissionError: 'Please allow microphone access.',
    },
    debug: {
      volumeLabel: 'Debug Volume',
      pitchLabel: 'Debug Pitch',
      deltaLabel: 'Debug Delta',
      hint: 'Press D to close · Set volume to 0 to use microphone input',
    },
  },
} as const;
