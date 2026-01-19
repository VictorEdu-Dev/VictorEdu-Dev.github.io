class BTreeInserter {
  constructor(tree) {
    this.tree = tree;
  }

  // Insere um valor na árvore B
  insert(value) {
    // Usa o searcher da árvore para verificar duplicatas
    if (this.tree.searcher.find(value)) return;

    if (this.tree.isEmpty()) {
      this.tree.root = this.tree.createNodeFunction(this.tree.fanout);
      this.tree.root.insert(value);
      this.tree.notifyAll({ type: 'createRoot', data: { node: this.tree.root } });
      return;
    }

    const leafNode = this.tree.searcher.findSupposedLeafNode(value);

    if (leafNode.keys.length < leafNode.fanout - 1) {
      leafNode.insert(value);
      return;
    }

    leafNode.insert(value);
    const rightNode = this.tree.createNodeFunction(this.tree.fanout);
    
    // Chama o método estrutural da árvore para calcular o nível
    const level = this.tree.getNodeLevel(leafNode);

    this.tree.notifyAll({
      type: 'createNode',
      data: { leftNode: leafNode, node: rightNode, level: level },
    });

    leafNode.split(rightNode);
    this.insertParent(leafNode, rightNode);
  }

  // Insere um nó pai após uma divisão
  insertParent(node, newNode) {
    const value = node.mostRightKey();

    if (this.tree.root == node) {
      const newRoot = this.tree.createNodeFunction(this.tree.fanout);
      this.tree.notifyAll({ type: 'createRoot', data: { node: newRoot } });

      node.delete(value);
      newRoot.insert(value);
      newRoot.pointers[0] = node;
      newRoot.pointers[1] = newNode;

      this.tree.root = newRoot;
      return;
    }

    const parent = this.tree.searcher.parent(node);
    node.delete(value);

    if (parent.keys.length < this.tree.fanout - 1) {
      parent.insert(value, newNode);
      return;
    }

    parent.insert(value, newNode);
    const rightNode = this.tree.createNodeFunction(this.tree.fanout);
    const level = this.tree.getNodeLevel(parent);

    this.tree.notifyAll({
      type: 'createNode',
      data: { leftNode: parent, node: rightNode, level: level },
    });

    parent.split(rightNode);
    this.insertParent(parent, rightNode);
  }
}