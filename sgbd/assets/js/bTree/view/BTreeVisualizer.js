class BTreeVisualizer {
  constructor(tree) {
    this.tree = tree;
    this.levels = [];
    this.nodeVisualizers = {};
    this.drawingPointersInterval = null;
    
    this.init();
  }
  
  getNodeLevel(node) {
    if (node === null || !this.tree.root) return 0;
    
    let curr = this.tree.root;
    let level = 0;

    while (curr) {
      if (curr.pointers.includes(node)) return level + 1;
      if (curr === node) return level;
      if (curr.isLeaf()) break;

      const targetKey = node.keys && node.keys.length > 0 ? node.keys[0] : null;
      let i = -1;
      if (targetKey !== null) {
          i = curr.keys.findIndex(k => isLower(targetKey, k));
      }

      if (i === -1) curr = curr.lastNonNullPointer();
      else curr = curr.pointers[i];

      level++;
    }
    return 0;
  }

  getPointerConnections() {
    const connections = [];
    if (!this.tree.root) return connections;

    const stack = [this.tree.root];
    while (stack.length > 0) {
      const currentNode = stack.pop();
      if (currentNode.pointers && currentNode.pointers.length > 0) {
        currentNode.pointers.forEach((child, index) => {
          if (child) {
            connections.push({
              parent: currentNode,
              child: child,
              index: index,
            });
            stack.push(child);
          }
        });
      }
    }
    return connections;
  }

  init() {
    this.createElement();
    const renderFixedScope = this.render.bind(this);
    // Se você tiver a função createArrayObserver no escopo global
    if (typeof createArrayObserver === 'function') {
        createArrayObserver(this.levels, () => renderFixedScope());
    }
    
    // Inscreve para ouvir os eventos da árvore principal
    this.tree.subscribe(payload => this.listenerFunction(payload));
    
    this.startDrawingPointers();
  }

  createElement() {
    this.element = document.querySelector('#tree');
  }

  listenerFunction(event) {
    if (event.type === 'createdNewNode') {
      this.createVisualizer(event.data);
      return;
    }
    
    // Se existir EventQueue global
    if (typeof EventQueue !== 'undefined') {
        const eventQueue = EventQueue.getInstance();
        const bind = this.executeEvent.bind(this);
        event.callback = event => bind(event);
        eventQueue.enqueue(event);
    } else {
        // Fallback se não tiver fila de eventos
        this.executeEvent(event);
    }
  }

  executeEvent(event) {
    const { type, data } = event;
    switch (type) {
      case 'createRoot': this.createRoot(data); break;
      case 'createNode': this.createNode(data); break;
      case 'deleteRoot': this.deleteRoot(data); break;
      case 'highlightNode': this.highlightNode(data); break;
      case 'deleteNode': this.deleteNode(data); break;
      default: break;
    }
    this.render();
  }

  createVisualizer(data) {
    const { node } = data;
    const nodeVisualizer = new BPlusTreeNodeVisualizer(node);
    this.nodeVisualizers[node.id] = nodeVisualizer;
  }

  createRoot(data) {
    const { node } = data;
    this.levels.unshift([node]);
  }

  createNode(data) {
    const { node, leftNode, level } = data;

    if (this.levels.length === level) {
      this.levels.push([node]);
      return;
    }

    const levelIndex = this.levels.findIndex(l => l.includes(leftNode));
    if (levelIndex !== -1) {
        const nodeIndex = this.levels[levelIndex].findIndex(n => n === leftNode);
        this.levels[levelIndex].splice(nodeIndex + 1, 0, node);
    }
  }

  deleteRoot(data) {
    const { node } = data;
    this.levels.shift();
    delete this.nodeVisualizers[node.id];
  }

  deleteNode(data) {
    const { node, level } = data;
    if (this.levels[level]) {
        this.levels[level] = this.levels[level].filter(n => n !== node);
        delete this.nodeVisualizers[node.id];
    }
  }

  highlightNode(data) {
    const { node } = data;
    if (this.nodeVisualizers[node.id]) {
        this.nodeVisualizers[node.id].highlightNode();
    }
  }

  render() {
    if (!this.element) return;
    
    while (this.element.firstChild) {
      this.element.removeChild(this.element.firstChild);
    }

    this.levels.forEach((level, index) => {
      const nodeVisualizers = level.map(node => this.nodeVisualizers[node.id]);
      const levelVisualizer = new LevelVisualizer(nodeVisualizers, index);
      levelVisualizer.setLevelNumber(index);
      levelVisualizer.render();
      this.element.appendChild(levelVisualizer.element);
    });
  }

  startDrawingPointers() {
    if (this.drawingPointersInterval) clearInterval(this.drawingPointersInterval);
    this.drawingPointersInterval = setInterval(() => { this.drawPointers() }, 50);
  }

  stopDrawingPointers() {
    clearInterval(this.drawingPointersInterval);
  }

  clearPointers() {
    const canvas = document.querySelector('#canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  drawPointers() {
    const canvas = document.querySelector('#canvas');
    const treeElement = document.querySelector('#tree');
    if (!canvas || !treeElement) return;
    
    const treeWidth = treeElement.scrollWidth;
    const treeHeight = treeElement.scrollHeight;

    if (canvas.width !== treeWidth || canvas.height !== treeHeight) {
        canvas.width = treeWidth;
        canvas.height = treeHeight;
        canvas.style.width = `${treeWidth}px`;
        canvas.style.height = `${treeHeight}px`;
    }

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const canvasRect = canvas.getBoundingClientRect();
    // Aqui usamos o método auxiliar que está nesta mesma classe
    const connections = this.getPointerConnections();

    // Estilo da Linha
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94a3b8'; 

    connections.forEach(connection => {
      const { parent, child, index } = connection;
      if (!parent || !child) return;

      const parentVisualizer = this.nodeVisualizers[parent.id];
      const childVisualizer = this.nodeVisualizers[child.id];

      if (!parentVisualizer || !childVisualizer) return;

      const parentCoordinates = parentVisualizer.getPointerOutPoint(index);
      const childCoordinates = childVisualizer.getPointerInPoint();

      if (!parentCoordinates || !childCoordinates) return;
      
      const startX = parentCoordinates.x - canvasRect.left;
      const startY = parentCoordinates.y - canvasRect.top;
      const endX = childCoordinates.x - canvasRect.left;
      const endY = childCoordinates.y - canvasRect.top;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      const verticalGap = endY - startY;
      const cp1y = startY + (verticalGap * 0.5); 
      const cp2y = endY - (verticalGap * 0.5);

      ctx.bezierCurveTo(startX, cp1y, endX, cp2y, endX, endY);
      ctx.stroke();
    });
  }

  clear() {
    this.levels = [];
    this.nodeVisualizers = {};
    this.render();
    this.clearPointers();
  }
}