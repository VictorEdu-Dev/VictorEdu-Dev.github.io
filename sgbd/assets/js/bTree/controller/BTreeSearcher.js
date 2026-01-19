class BTreeSearcher {
  constructor(tree) {
    this.tree = tree;
  }

  find(value) {
    let node = this.tree.root;
    while (node) {
      if (node.keys.some(k => k == value)) {
        this.tree.notifyAll({ type: 'highlightNode', data: { node } });
        return node;
      }

      this.tree.notifyAll({ type: 'highlightNode', data: { node } });

      if (node.isLeaf()) return null;

      const i = node.keys.findIndex(k => isLower(value, k));
      if (i !== -1) {
        node = node.pointers[i];
      } else {
        node = node.pointers[node.keys.length];
      }
    }
    return null;
  }

  findSupposedLeafNode(value) {
    let node = this.tree.root;
    while (!node.isLeaf()) {
      const keyIndex = node.keys.findIndex(key => isLower(value, key));
      this.tree.notifyAll({ type: 'highlightNode', data: { node } });

      if (keyIndex === -1) {
        node = node.lastNonNullPointer();
      } else {
        node = node.pointers[keyIndex];
      }
    }
    this.tree.notifyAll({ type: 'highlightNode', data: { node } });
    return node;
  }

  parent(node) {
    const findParent = (currentNode, targetNode) => {
      if (!currentNode || !targetNode || currentNode.isLeaf()) return null;
      const isNodeInPointers = currentNode.pointers.some(
        p => p && p.id === targetNode.id,
      );
      if (isNodeInPointers) return currentNode;

      for (const pointer of currentNode.pointers) {
        if (pointer) {
          const res = findParent(pointer, targetNode);
          if (res) return res;
        }
      }
      return null;
    };
    return findParent(this.tree.root, node);
  }
}