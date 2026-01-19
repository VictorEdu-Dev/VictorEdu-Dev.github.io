class InternalNode extends BPlusTreeNode {
  constructor(fanout) {
    super(fanout)
  }

  hasTooFewKeys() {
    const minimumKeys = Math.ceil(this.fanout / 2) - 1
    return this.keys.length < minimumKeys
  }

  insert(value, pointer) {
    const i = this.keys.findIndex(k => isLower(value, k))
    const insertKeyIndex = i !== -1 ? i : this.keys.length
    
    this.keys.splice(insertKeyIndex, 0, value)
    this.pointers.splice(insertKeyIndex + 1, 0, pointer)
    
    super.insert(value, pointer, insertKeyIndex)
  }

  delete(value) {
    const i = this.keys.findIndex(k => isLowerOrEqual(value, k))

    // SEGURANÇA: Só deleta se a chave realmente existir nesta posição
    if (i === -1 || value !== this.keys[i]) return

    // Em nós internos, remove a chave e o ponteiro à direita dela
    this.keys.splice(i, 1)
    this.pointers.splice(i + 1, 1)
    
    super.delete(value)
  }

  split(rightNode) {
    const middleIndex = Math.floor(this.keys.length / 2)
    const promotedKey = this.keys[middleIndex]

    const keysToMove = this.keys.slice(middleIndex + 1)
    const pointersToMove = this.pointers.slice(middleIndex + 1)

    // O primeiro ponteiro do nó da direita deve ser setado manualmente
    if (pointersToMove.length > 0) {
      rightNode.pointers[0] = pointersToMove[0]
    }

    keysToMove.forEach((key, i) => {
      // i+1 porque o pointers[0] já foi usado
      rightNode.insert(key, pointersToMove[i + 1])
    })

    // Remove do nó atual
    for (let i = keysToMove.length - 1; i >= 0; i--) {
      this.delete(keysToMove[i])
    }
    this.delete(promotedKey)

    return promotedKey
  }

  redistribute(sibling, parent, k) {
    const isSiblingLeft = isLowerOrEqual(sibling.mostRightKey(), this.mostLeftKey())

    if (isSiblingLeft) {
      // Rotação à Direita
      const siblingKey = sibling.mostRightKey()
      const siblingPointer = sibling.mostRightPointer()

      this.keys.unshift(k)
      this.pointers.unshift(siblingPointer) 
      parent.replaceKey(k, siblingKey)

      sibling.keys.pop()
      sibling.pointers.pop()

      this.notifyAll({ type: 'insertKey', data: { key: { value: k, index: 0 }, node: this } })
      sibling.notifyAll({ type: 'deleteKey', data: { key: { value: siblingKey }, node: sibling } })
    } else {
      // Rotação à Esquerda
      const siblingKey = sibling.mostLeftKey()
      const siblingPointer = sibling.mostLeftPointer()

      this.keys.push(k)
      this.pointers.push(siblingPointer)
      parent.replaceKey(k, siblingKey)

      sibling.keys.shift()
      sibling.pointers.shift()

      this.notifyAll({ type: 'insertKey', data: { key: { value: k, index: this.keys.length - 1 }, node: this } })
      sibling.notifyAll({ type: 'deleteKey', data: { key: { value: siblingKey }, node: sibling } })
    }
  }
}