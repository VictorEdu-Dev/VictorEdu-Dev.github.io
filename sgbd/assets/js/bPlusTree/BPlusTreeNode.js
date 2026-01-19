class BPlusTreeNode extends BaseNode {
  constructor(fanout) {
    super(fanout)
    this.id = uuidv4()
    this.keys = []
    this.pointers = []
  }

  mostLeftKey() {
    return this.keys[0]
  }

  mostLeftPointer() {
    return this.pointers[0]
  }

  mostRightKey() {
    return this.keys[this.keys.length - 1]
  }

  mostRightPointer() {
    return this.pointers[this.pointers.length - 1]
  }

  isNodeFull() {
    return this.keys.length === this.fanout - 1
  }

  isNodeOverfull() {
    return this.keys.length >= this.fanout
  }

  hasMinimumKeys() {
    // Default para folhas. InternalNode sobrescreve isso.
    const minimumKeys = Math.ceil((this.fanout - 1) / 2)
    return this.keys.length >= minimumKeys
  }

  hasKey(key) {
    return this.keys.includes(key)
  }

  nonNullPointers() {
    return this.pointers.filter(p => p !== null && p !== undefined)
  }

  lastNonNullPointer() {
    const validPointers = this.nonNullPointers()
    return validPointers[validPointers.length - 1]
  }

  // Método base apenas notifica. Subclasses fazem a inserção real e chamam super.
  insert(value, pointer, index) {
    this.notifyAll({
      type: 'insertKey',
      data: {
        key: {
          node: this,
          value,
          index,
        },
        pointer,
      },
    })
  }

  // Helper para inserir apenas chave (usado em manipulações manuais ou merges)
  insertKey(value) {
    const i = this.keys.findIndex(k => isLowerOrEqual(value, k))
    const insertKeyIndex = i !== -1 ? i : this.keys.length
    this.keys.splice(insertKeyIndex, 0, value)

    this.notifyAll({
      type: 'insertKey',
      data: {
        node: this,
        key: {
          value,
          index: insertKeyIndex,
        },
      },
    })
  }

  // Método base apenas notifica. Subclasses fazem a remoção real e chamam super.
  delete(value) {
    this.notifyAll({
      type: 'deleteKey',
      data: {
        node: this,
        key: {
          value,
        },
      },
    })
  }

  toJSON() {
    const clone = JSON.parse(
      JSON.stringify({
        id: this.id,
        keys: this.keys,
        pointers: this.pointers,
      }),
    )
    return clone
  }

  replaceKey(oldKey, newKey) {
    // Encontra a posição onde a chave antiga deveria estar
    const i = this.keys.findIndex(k => isLowerOrEqual(oldKey, k))
    
    if (i === -1 || this.keys[i] !== oldKey) return

    this.keys[i] = newKey

    this.notifyAll({
      type: 'replaceKey',
      data: {
        node: this,
        oldKey: {
          value: oldKey,
        },
        newKey: {
          value: newKey,
        },
      },
    })
  }

  deleteKey(value) {
    const i = this.keys.findIndex(k => isLowerOrEqual(value, k))

    // Verifica se a chave realmente existe antes de deletar
    if (i === -1 || value !== this.keys[i]) return
    
    this.keys.splice(i, 1)

    this.notifyAll({
      type: 'deleteKey',
      data: {
        node: this,
        key: {
          value,
        },
      },
    })
  }
}