class BTreeDeleter {
  constructor(tree) {
    this.tree = tree;
  }

  // Deleta um valor da árvore B
  delete(value) {
    if (!this.tree.root) return;

    this.deleteRecursive(this.tree.root, value);

    if (this.tree.root && this.tree.root.keys.length === 0) {
      if (this.tree.root.isLeaf()) {
        this.tree.notifyAll({ type: 'deleteRoot', data: { node: this.tree.root } });
        this.tree.root = null;
      } else {
        const oldRoot = this.tree.root;
        this.tree.root = this.tree.root.pointers[0];
        this.tree.notifyAll({ type: 'deleteRoot', data: { node: oldRoot } });
      }
    }
  }

  // Função recursiva para deletar um valor
  deleteRecursive(node, value) {
    const idx = node.keys.findIndex(k => k == value);

    if (idx !== -1) {
      if (node.isLeaf()) {
        node.delete(node.keys[idx]);
      } else {
        const leftChild = node.pointers[idx];
        const rightChild = node.pointers[idx + 1];

        if (leftChild.keys.length >= Math.ceil(this.tree.fanout / 2)) {
          const predecessor = this.getPredecessor(leftChild);
          node.replaceKey(node.keys[idx], predecessor);
          this.deleteRecursive(leftChild, predecessor);
        } else if (rightChild.keys.length >= Math.ceil(this.tree.fanout / 2)) {
          const successor = this.getSuccessor(rightChild);
          node.replaceKey(node.keys[idx], successor);
          this.deleteRecursive(rightChild, successor);
        } else {
          this.merge(node, idx);
          this.deleteRecursive(leftChild, value);
        }
      }
    } else {
      if (node.isLeaf()) return;

      let childIdx = node.keys.findIndex(k => isLower(value, k));
      if (childIdx === -1) childIdx = node.keys.length;

      const child = node.pointers[childIdx];
      const minKeys = Math.ceil(this.tree.fanout / 2) - 1;

      if (child.keys.length <= minKeys) {
        this.fill(node, childIdx);
        if (childIdx > node.keys.length) childIdx = node.keys.length;
      }

      let nextNodeIdx = node.keys.findIndex(k => isLower(value, k));
      if (nextNodeIdx === -1) nextNodeIdx = node.keys.length;

      this.deleteRecursive(node.pointers[nextNodeIdx], value);
    }
  }

  // Obtém o predecessor de um nó
  getPredecessor(node) {
    let curr = node;
    while (!curr.isLeaf()) {
      curr = curr.lastNonNullPointer();
    }
    return curr.mostRightKey();
  }

  // Obtém o sucessor de um nó
  getSuccessor(node) {
    let curr = node;
    while (!curr.isLeaf()) {
      curr = curr.pointers[0];
    }
    return curr.mostLeftKey();
  }

  // Preenche um nó que tem menos do que o número mínimo de chaves
  fill(parent, idx) {
    const minKeys = Math.ceil(this.tree.fanout / 2) - 1;

    if (idx > 0 && parent.pointers[idx - 1].keys.length > minKeys) {
      this.borrowFromPrev(parent, idx);
    } else if (
      idx < parent.pointers.length - 1 &&
      parent.pointers[idx + 1].keys.length > minKeys
    ) {
      this.borrowFromNext(parent, idx);
    } else {
      if (idx < parent.pointers.length - 1) {
        this.merge(parent, idx);
      } else {
        this.merge(parent, idx - 1);
      }
    }
  }

  // Pega emprestado uma chave do irmão anterior
  borrowFromPrev(parent, idx) {
    const child = parent.pointers[idx];
    const sibling = parent.pointers[idx - 1];

    const keyFromParent = parent.keys[idx - 1];
    child.keys.unshift(keyFromParent);
    child.notifyAll({
      type: 'insertKey',
      data: { key: { value: keyFromParent, index: 0 }, node: child },
    });

    const keyFromSibling = sibling.mostRightKey();
    parent.replaceKey(keyFromParent, keyFromSibling);

    if (!child.isLeaf()) {
      const ptr = sibling.mostRightPointer();
      child.pointers.unshift(ptr);
    }
    sibling.delete(keyFromSibling);
  }

  // Pega emprestado uma chave do irmão seguinte
  borrowFromNext(parent, idx) {
    const child = parent.pointers[idx];
    const sibling = parent.pointers[idx + 1];

    const keyFromParent = parent.keys[idx];
    child.keys.push(keyFromParent);
    child.notifyAll({
      type: 'insertKey',
      data: {
        key: { value: keyFromParent, index: child.keys.length - 1 },
        node: child,
      },
    });

    const keyFromSibling = sibling.mostLeftKey();
    parent.replaceKey(keyFromParent, keyFromSibling);

    if (!child.isLeaf()) {
      const ptr = sibling.pointers[0];
      child.pointers.push(ptr);
      sibling.pointers.shift();
    }

    if (!sibling.isLeaf()) {
      sibling.keys.shift();
      sibling.notifyAll({ type: 'deleteKey', data: { node: sibling, key: { value: keyFromSibling } } });
    } else {
      sibling.delete(keyFromSibling);
    }
  }

  // Mescla um nó com seu irmão
  merge(parent, idx) {
    const leftChild = parent.pointers[idx];
    const rightChild = parent.pointers[idx + 1];
    
    const level = this.tree.getNodeLevel(rightChild);
    const keyFromParent = parent.keys[idx];

    leftChild.keys.push(keyFromParent);
    leftChild.notifyAll({
      type: 'insertKey',
      data: {
        key: { value: keyFromParent, index: leftChild.keys.length },
        node: leftChild,
      },
    });

    rightChild.keys.forEach(k => {
      leftChild.keys.push(k);
      leftChild.notifyAll({
        type: 'insertKey',
        data: {
          key: { value: k, index: leftChild.keys.length },
          node: leftChild,
        },
      });
    });

    if (!leftChild.isLeaf()) {
      leftChild.pointers.push(...rightChild.pointers);
    }

    parent.delete(parent.keys[idx]);

    this.tree.notifyAll({
      type: 'deleteNode',
      data: { node: rightChild, level: level },
    });
  }
}