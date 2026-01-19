/**
 * Essa classe é responsável por escutar os eventos do BPlusTreeNode e
 * atualizar a visualização da árvore.
 */
class BPlusTreeNodeVisualizer {
  constructor(node) {
    this.node = node
    this.element = null
    this.init()
  }

  init() {
    this.createElement()
    this.node.subscribe(payload => this.listenerFunction(payload))
  }

  listenerFunction(event) {
    const eventQueue = EventQueue.getInstance()
    // Bind necessário para não perder o 'this'
    const bind = this.executeEvent.bind(this)
    event.callback = (e) => bind(e)
    eventQueue.enqueue(event)
  }

  // Executa o evento recebido do nó
  executeEvent(event) {
    const { type, data } = event

    switch (type) {
      case 'insertKey':
        this.insertKey(data)
        break
      case 'deleteKey':
        this.deleteKey(data.key.value)
        break
      case 'replaceKey':
        this.replaceKey(data.oldKey.value, data.newKey.value)
        break
      case 'highlightKey':
        this.highlightKey(data.key.value)
        break
      default:
        break
    }
  }

  // Cria o elemento DOM do nó
  createElement() {
    this.element = document.createElement('div')
    this.element.classList.add('node')
    this.element.setAttribute('id', this.node.id)
    this.element.setAttribute('data-type', this.node.constructor.name)

    this.element.addEventListener('mouseenter', (e) => this.showTooltip(e))
    this.element.addEventListener('mousemove', (e) => this.moveTooltip(e))
    this.element.addEventListener('mouseleave', () => this.hideTooltip())

    if (this.node.keys && this.node.keys.length > 0) {
      this.node.keys.forEach((key, index) => {
        this.insertKey({ key: { value: key, index: index } })
      })
    }
  }

  // Insere uma chave visualmente no nó
  insertKey(data) {
    const insertionIndex =
      data.key.index !== -1 && data.key.index !== undefined
        ? data.key.index
        : this.element.children.length

    const keyElement = document.createElement('div')
    keyElement.classList.add('key')
    keyElement.setAttribute('data-key', data.key.value)
    keyElement.innerText = data.key.value

    const referenceNode = this.element.children[insertionIndex] || null
    this.element.insertBefore(keyElement, referenceNode)
  }

  deleteKey(key) {
    const keyElement = this.element.querySelector(`[data-key="${key}"]`)
    if (!keyElement) return
    this.element.removeChild(keyElement)
  }

  replaceKey(oldKey, newKey) {
    const keyElement = this.element.querySelector(`[data-key="${oldKey}"]`)
    if (!keyElement) return
    keyElement.setAttribute('data-key', newKey)
    keyElement.innerText = newKey
  }

  highlightKey(key) {
    const keyElement = this.element.querySelector(`[data-key="${key}"]`)
    if (keyElement) keyElement.classList.add('highlight')
  }

  unhighlightKey(key) {
    const keyElement = this.element.querySelector(`[data-key="${key}"]`)
    if (keyElement) keyElement.classList.remove('highlight')
  }

  highlightNode() {
    this.element.classList.add('highlight')
    const duration = 600

    setTimeout(() => {
      this.element.classList.remove('highlight')
    }, duration)
  }

  /**
   * O ponto de conexão de entrada é o CENTRO superior do nó.
   */
  getPointerInPoint() {
    if (!this.element) return { x: 0, y: 0 }
    const rect = this.element.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top
    return { x, y }
  }

  /**
   * Retorna a coordenada exata entre as chaves visualizadas no DOM.
   * Isso corrige o problema das linhas não saberem onde conectar.
   */
  getPointerOutPoint(pointerIndex) {
    if (!this.element) return { x: 0, y: 0 }
    
    const rect = this.element.getBoundingClientRect()
    const keysElements = Array.from(this.element.querySelectorAll('.key'))
    
    let x = 0
    const y = rect.bottom

    // Caso nó vazio (não deve ocorrer visualmente, mas por segurança)
    if (keysElements.length === 0) {
      x = rect.left + rect.width / 2
      return { x, y }
    }

    if (pointerIndex === 0) {
      // Ponteiro 0: Antes da primeira chave
      const firstKeyRect = keysElements[0].getBoundingClientRect()
      x = (rect.left + firstKeyRect.left) / 2
      // Ajuste fino: se houver muito padding, aproxima da chave
      if (x < rect.left + 5) x = rect.left + 10
    } 
    else if (pointerIndex >= keysElements.length) {
      // Último Ponteiro: Depois da última chave
      const lastKeyRect = keysElements[keysElements.length - 1].getBoundingClientRect()
      x = (lastKeyRect.right + rect.right) / 2
       // Ajuste fino
      if (x > rect.right - 5) x = rect.right - 10
    } 
    else {
      // Ponteiro Intermediário: Entre a chave anterior e a atual
      // pointerIndex 1 fica entre keys[0] e keys[1]
      const prevKeyRect = keysElements[pointerIndex - 1].getBoundingClientRect()
      const nextKeyRect = keysElements[pointerIndex].getBoundingClientRect()
      
      // Média exata do espaço (gap) entre os elementos
      x = (prevKeyRect.right + nextKeyRect.left) / 2
    }

    return { x, y }
  }

  getLateralInPoint() {
    if (!this.element) return { x: 0, y: 0 }
    const rect = this.element.getBoundingClientRect()
    const x = rect.left 
    const y = rect.top + rect.height / 2
    return { x, y }
  }

  getLateralOutPoint() {
    if (!this.element) return { x: 0, y: 0 }
    const rect = this.element.getBoundingClientRect()
    const x = rect.right 
    const y = rect.top + rect.height / 2
    return { x, y }
  }

  showTooltip(e) {
    const tooltip = document.getElementById('node-tooltip')
    if (!tooltip) return

    // --- 1. Coleta os Dados Básicos ---
    const keysCount = this.node.keys.length
    const fanout = this.node.fanout || 4 
    const maxKeys = fanout - 1
    const occupancyRate = ((keysCount / maxKeys) * 100).toFixed(1)
    
    // Contagem de Filhos
    const pointersCount = this.node.pointers 
        ? this.node.pointers.filter(p => p !== undefined && p !== null).length 
        : 0

    // --- 2. Tipo do Nó ---
    let typeName = this.node.constructor.name.replace('Node', '')
    if (typeName === 'BTree') {
        typeName = this.node.isLeaf() ? 'Folha' : 'Interno'
    } else if (typeName === 'Leaf') {
        typeName = 'Folha'
    } else if (typeName === 'Internal') {
        typeName = 'Interno'
    }

    // --- 3. NOVAS MÉTRICAS (Nível e Range) ---
    
    // A. Nível: Acessa o controlador global para perguntar a altura deste nó
    let level = '-'
    try {
        if (Controlls && Controlls.getInstance() && Controlls.getInstance().tree) {
            level = Controlls.getInstance().tree.getNodeLevel(this.node)
        }
    } catch (err) { console.warn('Erro ao calcular nível:', err) }

    // B. Range: Pega a primeira e a última chave armazenada no nó
    let rangeText = 'Vazio'
    if (this.node.keys.length > 0) {
        const min = this.node.keys[0]
        const max = this.node.keys[this.node.keys.length - 1]
        rangeText = (min === max) ? `${min}` : `${min} → ${max}`
    }

    // --- 4. Cores Condicionais ---
    let colorClass = 'stat-warn'
    if (Number(occupancyRate) >= 60) colorClass = 'stat-good'
    if (Number(occupancyRate) <= 40) colorClass = 'stat-bad'

    // --- 5. Monta o HTML (Sem ID, Com Nível e Range) ---
    tooltip.innerHTML = `
        <div class="tooltip-row">
            <span class="tooltip-label">Nível</span>
            <span class="tooltip-value">${level}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Tipo</span>
            <span class="tooltip-value">${typeName}</span>
        </div>
        
        <div class="tooltip-divider"></div>

        <div class="tooltip-row">
            <span class="tooltip-label">Range</span>
            <span class="tooltip-value" style="letter-spacing: -0.5px;">${rangeText}</span>
        </div>
        
        <div class="tooltip-row">
            <span class="tooltip-label">Ocupação</span>
            <span class="tooltip-value ${colorClass}">${occupancyRate}%</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Chaves</span>
            <span class="tooltip-value">${keysCount} / ${maxKeys}</span>
        </div>
        <div class="tooltip-row">
            <span class="tooltip-label">Filhos</span>
            <span class="tooltip-value">${pointersCount}</span>
        </div>
    `

    tooltip.style.display = 'block'
    this.moveTooltip(e)
  }

  // Faz o bloquinho seguir o mouse
  moveTooltip(e) {
    const tooltip = document.getElementById('node-tooltip')
    if (!tooltip || tooltip.style.display === 'none') return

    // Offset de 15px para não ficar embaixo do cursor
    const x = e.clientX + 15
    const y = e.clientY + 15

    tooltip.style.left = `${x}px`
    tooltip.style.top = `${y}px`
  }

  // Esconde quando sai de cima
  hideTooltip() {
    const tooltip = document.getElementById('node-tooltip')
    if (tooltip) tooltip.style.display = 'none'
  }
}