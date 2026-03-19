export const VARIABLE_FONTS = {
  robotoFlex: {
    id: 'robotoFlex',
    name: 'Roboto Flex',
    cssVar: 'var(--font-primary)',
    axes: {
      // 提供聲音轉換的映射範圍
      volumeToWidth: { min: 25, max: 150, cssTag: 'wdth' },
      volumeToWeight: { min: 100, max: 1000, cssTag: 'wght' },
      // 待機與呼吸感的動畫範圍 (調整得非常小，甚至不感覺到明顯變化)
      idleWidth: { min: 35, max: 37 },
      idleWeight: { min: 100, max: 110 },
    }
  }
}
