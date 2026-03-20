export const VARIABLE_FONTS = {
  robotoFlex: {
    id: 'robotoFlex',
    name: 'Roboto Flex',
    cssVar: 'var(--font-primary)',
    axes: {
      // 聲音爆發時的映射範圍
      volumeToWidth:  { min: 25,   max: 150,  cssTag: 'wdth' },
      volumeToWeight: { min: 100,  max: 1000, cssTag: 'wght' },
      volumeToSlant:  { min: 0,    max: -10,  cssTag: 'slnt' }, // 傾斜：大聲時往後歪斜
      volumeToGrade:  { min: -200, max: 150,  cssTag: 'GRAD' }, // Grade：無空間佔位的視覺字重
      // 待機呼吸幅度
      idleWidth:  { min: 35, max: 37 },
      idleWeight: { min: 100, max: 110 },
      idleSlant:  { min: 0, max: 0 },
      idleGrade:  { min: -200, max: -100 },
    }
  }
}
