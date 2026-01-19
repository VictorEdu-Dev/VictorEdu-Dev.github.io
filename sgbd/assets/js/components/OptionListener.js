class OptionListener {
  constructor() {
    this.init()
    this.fanout = 4
    this.addEventListeners()
    
    // Inicializa o tooltip com o valor padrão
    this.updateTooltip()
  }

  static getInstance() {
    if (!OptionListener.instance) {
      OptionListener.instance = new OptionListener()
    }

    return OptionListener.instance
  }

  init() {
    this.showFanout = document.getElementById('show-fanout')
    this.speedSelector = document.getElementById('tree-speed-selector')
    this.tooltip = document.getElementById('slider-tooltip') // Referência ao tooltip

    this.descreaseFanoutButton = document.getElementById(
      'decrease-fanout-button',
    )
    this.increaseFanoutButton = document.getElementById(
      'increase-fanout-button',
    )

    this.clearTreeButton = document.getElementById('clear-tree-button')
  }

  get fanout() {
    return Number(this.showFanout.textContent)
  }

  set fanout(fanout) {
    this.showFanout.textContent = fanout
  }

  // Função para calcular posição e texto do tooltip
  updateTooltip() {
    const val = Number(this.speedSelector.value)
    const min = Number(this.speedSelector.min) || 1
    const max = Number(this.speedSelector.max) || 1219
    
    // 1. Calcula a porcentagem da posição (0% a 100%)
    const percent = ((val - min) * 100) / (max - min)
    
    // 2. Move o tooltip (ajuste fino de pixels pode ser necessário dependendo do tamanho da "bolinha")
    // O calc compensa levemente o tamanho do polegar (thumb) do slider
    this.tooltip.style.left = `calc(${percent}% + (${8 - percent * 0.15}px))`

    // 3. Calcula o multiplicador de velocidade
    // Base: 610 (meio) = 1x.
    // Fórmula: 610 / (1220 - val)
    // Se val = 610 -> delay = 610ms -> 1x
    // Se val = 1219 -> delay = 1ms -> 610x
    // Se val = 1 -> delay = 1219ms -> 0.5x
    const delay = 1220 - val
    const multiplier = (610 / delay).toFixed(2)
    
    this.tooltip.textContent = `${multiplier}x`
  }

  addEventListeners() {
    this.increaseFanoutButton.addEventListener('click', e => {
      e.preventDefault()

      if (this.fanout === 10) return
      this.fanout = this.fanout + 1
      this.changeFanoutCallback(this.fanout)
    })

    this.descreaseFanoutButton.addEventListener('click', e => {
      e.preventDefault()

      if (this.fanout === 3) return
      this.fanout = this.fanout - 1
      this.changeFanoutCallback(this.fanout)
    })

    // --- Lógica do Slider ---

    // Evento 'input': Atualiza o visual EM TEMPO REAL enquanto arrasta
    this.speedSelector.addEventListener('input', e => {
      this.updateTooltip()
      this.tooltip.classList.add('show')
    })

    // Evento 'change': Atualiza a engine da árvore apenas ao SOLTAR o mouse
    // (Isso evita reiniciar o timer do processador de eventos 60x por segundo)
    this.speedSelector.addEventListener('change', e => {
      const timeInterval = 1220 - Number(e.target.value)
      EventProcessor.getInstance().changeTimeInterval(timeInterval)
      this.tooltip.classList.remove('show') // Opcional: esconder ao soltar
    })

    // Mostra o tooltip ao clicar/tocar
    this.speedSelector.addEventListener('mousedown', () => {
      this.updateTooltip()
      this.tooltip.classList.add('show')
    })
    
    this.speedSelector.addEventListener('touchstart', () => {
      this.updateTooltip()
      this.tooltip.classList.add('show')
    })

    // Esconde o tooltip ao sair/soltar
    this.speedSelector.addEventListener('mouseup', () => {
      this.tooltip.classList.remove('show')
    })
    
    this.speedSelector.addEventListener('touchend', () => {
      this.tooltip.classList.remove('show')
    })
    
    // --- Fim Lógica Slider ---

    this.clearTreeButton.addEventListener('click', e => {
      e.preventDefault()
      this.clearTreeCallback()
    })
  }

  setChangeFanoutCallback(callback) {
    this.changeFanoutCallback = callback
    this.changeFanoutCallback(this.fanout)
  }

  setClearTreeCallback(callback) {
    this.clearTreeCallback = callback
  }
}