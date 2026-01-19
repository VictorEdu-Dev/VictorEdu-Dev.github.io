class BTree extends Observable {
  constructor(fanout) {
    super();
    this.fanout = fanout;
    this.root = null;
    this.createNodeFunction = this.defaultCreateNodeFunction;

    this.searcher = new BTreeSearcher(this);
    this.inserter = new BTreeInserter(this);
    this.deleter = new BTreeDeleter(this);
  
  }

  getRoot() {
    return this.root;
  }

  defaultCreateNodeFunction(fanout) {
    const createdNode = new BTreeNode(fanout);
    this.notifyAll({
      type: 'createdNewNode',
      data: { node: createdNode },
    });
    return createdNode;
  }

  setCreateNodeFunction(createNodeFunction) {
    this.createNodeFunction = createNodeFunction;
  }

  isEmpty() {
    return this.root === null;
  }

  insert(value) {
    this.inserter.insert(value);
  }

  delete(value) {
    this.deleter.delete(value);
  }

  find(value) {
    return this.searcher.find(value);
  }

  findSupposedLeafNode(value) {
    return this.searcher.findSupposedLeafNode(value);
  }

  
  getNodeLevel(node) {
    if (node === null || !this.root) return 0;
    
    let curr = this.root;
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
    if (!this.root) return connections;

    const stack = [this.root];
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

  getStatistics() {
    if (!this.root) return { height: 0, nodeCount: 0 };

    let height = 0;
    let nodeCount = 0;

    // 1. Calcula Altura
    let current = this.root;
    while (current) {
        height++;
        if (!current.isLeaf() && current.pointers.length > 0) {
            current = current.pointers[0];
        } else {
            break;
        }
    }

    // 2. Conta Nós
    const stack = [this.root];
    while (stack.length > 0) {
        const node = stack.pop();
        nodeCount++;
        
        if (!node.isLeaf()) {
             // Em B-Tree os ponteiros são acessados de forma diferente dependendo da sua implementação
             // Assumindo estrutura padrão de pointers array:
             node.pointers.forEach(ptr => {
                 if (ptr) stack.push(ptr);
             });
        }
    }

    return { height, nodeCount };
  }
}