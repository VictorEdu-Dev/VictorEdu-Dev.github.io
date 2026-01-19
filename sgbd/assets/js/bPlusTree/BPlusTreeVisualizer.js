class LevelVisualizer {
  constructor(levelNodes = [], levelNumber = 0) {
    this.levelNodes = levelNodes
    this.levelNumber = levelNumber
    this.init()
  }

  init() {
    this.createElement()
  }

  setLevelNumber(levelNumber) {
    this.levelNumber = levelNumber
    if (this.levelNumberElement) {
      this.levelNumberElement.innerText = this.levelNumber
    }
  }

  updateLevelNodes() {
    this.levelNodes.forEach(node => {
      if (!node || !node.element) return
      this.levelNodesElement.appendChild(node.element)
    })
  }

  createElement() {
    this.element = document.createElement('div')
    this.element.classList.add('level')

    this.levelNumberElement = document.createElement('div')
    this.levelNumberElement.classList.add('level-number')
    this.levelNumberElement.innerText = this.levelNumber

    this.levelNodesElement = document.createElement('div')
    this.levelNodesElement.classList.add('level-nodes')

    this.updateLevelNodes()

    this.element.appendChild(this.levelNumberElement)
    this.element.appendChild(this.levelNodesElement)
  }

  render() {
    if (!this.element) return
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild)
    }
    this.element.appendChild(this.levelNumberElement)
    this.element.appendChild(this.levelNodesElement)
  }
}

class BPlusTreeVisualizer {
  constructor(tree) {
    this.tree = tree
    this.levels = []
    this.nodeVisualizers = {}
    this.drawingPointersInterval = null
    this.init()
  }

  createRoot(data) { this.createVisualizer(data) }
  createNode(data) { this.createVisualizer(data) }

  deleteRoot(data) {
    const { node } = data
    if (this.nodeVisualizers[node.id]) delete this.nodeVisualizers[node.id]
  }

  deleteNode(data) {
    const { node } = data
    if (this.nodeVisualizers[node.id]) delete this.nodeVisualizers[node.id]
  }

  createVisualizer(data) {
    const { node } = data
    if (!node) return
    if (!this.nodeVisualizers[node.id]) {
      this.nodeVisualizers[node.id] = new BPlusTreeNodeVisualizer(node)
    }
  }

  highlightNode(data) {
    const { node } = data
    if (this.nodeVisualizers[node.id]) {
      this.nodeVisualizers[node.id].highlightNode()
    }
  }

  init() {
    this.createElement()
    this.tree.subscribe(payload => this.listenerFunction(payload))
    this.startDrawingPointers()
  }

  startDrawingPointers() {
    if (this.drawingPointersInterval) clearInterval(this.drawingPointersInterval)
    // Reduzido para 30ms para animação mais fluida
    this.drawingPointersInterval = setInterval(() => { this.drawPointers() }, 30)
  }

  stopDrawingPointers() {
    clearInterval(this.drawingPointersInterval)
  }

  createElement() {
    this.element = document.querySelector('#tree')
  }

  listenerFunction(event) {
    if (event.type === 'createdNewNode') {
      this.createVisualizer(event.data)
      return
    }
    const eventQueue = EventQueue.getInstance()
    const bind = this.executeEvent.bind(this)
    event.callback = event => bind(event)
    eventQueue.enqueue(event)
  }

  executeEvent(event) {
    const { type, data } = event
    switch (type) {
      case 'createRoot': this.createRoot(data); break;
      case 'createNode': this.createNode(data); break;
      case 'deleteRoot': this.deleteRoot(data); break;
      case 'highlightNode': this.highlightNode(data); break;
      case 'deleteNode': this.deleteNode(data); break;
    }
    this.render()
  }

  rebuildLevels() {
    this.levels = []
    if (!this.tree.root) return

    const queue = [{ node: this.tree.root, level: 0 }]

    while (queue.length > 0) {
      const { node, level } = queue.shift()

      if (!this.levels[level]) this.levels[level] = []
      this.levels[level].push(node)

      // Varredura para renderizar
      if (node instanceof InternalNode || (node.pointers && node.keys.length > 0)) {
        node.pointers.forEach(child => {
          if (child) {
            queue.push({ node: child, level: level + 1 })
          }
        })
      }
    }
  }

  render() {
    if (!this.element) return 
    
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild)
    }

    this.rebuildLevels()

    this.levels.forEach((levelNodes, index) => {
      const nodeVisualizers = levelNodes
        .map(node => this.nodeVisualizers[node.id])
        .filter(v => v !== undefined)

      const levelVisualizer = new LevelVisualizer(nodeVisualizers, index)
      levelVisualizer.render()
      this.element.appendChild(levelVisualizer.element)
    })
  }

  clear() {
    this.levels = []
    this.nodeVisualizers = {}
    this.render()
    this.clearPointers()
    this.stopDrawingPointers()
  }

  clearPointers() {
    const canvas = document.querySelector('#canvas')
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  drawPointers() {
    const canvas = document.querySelector('#canvas')
    const treeElement = document.querySelector('#tree')
    if (!canvas || !treeElement) return
    
    // Atualiza tamanho do canvas se a árvore cresceu
    const treeWidth = Math.max(treeElement.scrollWidth, window.innerWidth)
    const treeHeight = Math.max(treeElement.scrollHeight, window.innerHeight)

    if (canvas.width !== treeWidth || canvas.height !== treeHeight) {
      canvas.width = treeWidth
      canvas.height = treeHeight
      canvas.style.width = `${treeWidth}px`
      canvas.style.height = `${treeHeight}px`
    }

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const canvasRect = canvas.getBoundingClientRect()
    const connections = this.tree.getPointerConnections()

    ctx.lineWidth = 2
    ctx.strokeStyle = '#94a3b8';

    connections.forEach(connection => {
      const { parent, child } = connection
      if (!parent || !child) return

      const parentVisualizer = this.nodeVisualizers[parent.id]
      const childVisualizer = this.nodeVisualizers[child.id]

      if (!parentVisualizer || !childVisualizer) return

      // Pega coordenadas (agora baseadas no DOM real)
      const parentCoordinates = connection.isBrother
        ? parentVisualizer.getLateralOutPoint()
        : parentVisualizer.getPointerOutPoint(connection.index)
        
      const childCoordinates = connection.isBrother
        ? childVisualizer.getLateralInPoint()
        : childVisualizer.getPointerInPoint()

      if (!parentCoordinates || !childCoordinates) return

      const startX = parentCoordinates.x - canvasRect.left
      const startY = parentCoordinates.y - canvasRect.top
      const endX = childCoordinates.x - canvasRect.left
      const endY = childCoordinates.y - canvasRect.top

      ctx.beginPath()

      if (connection.isBrother) {
        // Linha entre folhas (Irmãos)
        ctx.strokeStyle = '#3b82f6'; // Azul para destacar
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()
        ctx.strokeStyle = '#94a3b8'; // Volta para cinza
        
        // Seta na ponta (opcional, visual agradável)
        const headlen = 5; 
        const dx = endX - startX;
        const dy = endY - startY;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(endX - headlen * Math.cos(angle - Math.PI / 6), endY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(endX - headlen * Math.cos(angle + Math.PI / 6), endY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.fillStyle = '#3b82f6';
        ctx.fill();

      } else {
        // Curva Pai -> Filho
        ctx.moveTo(startX, startY)
        const verticalGap = endY - startY;
        const cp1y = startY + (verticalGap * 0.5);
        const cp2y = endY - (verticalGap * 0.5);
        ctx.bezierCurveTo(startX, cp1y, endX, cp2y, endX, endY);
        ctx.stroke()
      }
    })
  }
}