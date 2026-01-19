class BTreeNode extends BaseNode {
  constructor(fanout) {
    super(fanout)
    this.id = uuidv4()
    this.keys = []
    this.pointers = []
  }

  // Insere uma chave e um ponteiro na posição correta
  insert(value, pointer = null) {
    const keyIndex = this.keys.findIndex(key => isLowerOrEqual(value, key))
    const insertKeyIndex = keyIndex !== -1 ? keyIndex : this.keys.length

    this.keys.splice(insertKeyIndex, 0, value)

    if (pointer !== null) this.pointers.splice(insertKeyIndex + 1, 0, pointer)

    this.notifyAll({
      type: 'insertKey',
      data: {
        key: {
          node: this,
          value,
          index: insertKeyIndex,
        },
        pointer,
      },
    })
  }

  // Deleta uma chave e seu ponteiro associado
  delete(value) {
    const keyIndex = this.keys.findIndex(key => key == value)

    if (keyIndex === -1) return

    this.keys.splice(keyIndex, 1)
    this.pointers.splice(keyIndex + 1, 1)

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

  // Substitui uma chave por outra
  replaceKey(oldKey, newKey) {
    // Encontra a chave antiga
    const index = this.keys.findIndex(k => k == oldKey)
    
    if (index === -1) return

    this.keys[index] = newKey

    this.notifyAll({
      type: 'replaceKey',
      data: {
        node: this,
        oldKey: { value: oldKey },
        newKey: { value: newKey }
      }
    })
  }

  // Divide o nó atual em dois, movendo metade das chaves para o nó direito
  split(rightNode) {
    const keyMiddleIndex = Math.ceil(this.fanout / 2)
    const keysRightNode = this.keys.slice(keyMiddleIndex)
    const pointersMiddleIndex = Math.ceil(this.fanout / 2)
    const pointersToInsertInRightNode = this.pointers.slice(pointersMiddleIndex)

    if (pointersToInsertInRightNode.length)
      rightNode.pointers.push(pointersToInsertInRightNode[0])

    keysRightNode.forEach((key, index) => {
      this.delete(key)
      rightNode.insert(key, pointersToInsertInRightNode[index + 1])
    })
  }

  // Verifica se o nó é folha
  isLeaf() {
    if (this.pointers.length) {
      return false
    }
    return true
  }

  // Retorna a chave mais à esquerda
  mostLeftKey() {
    return this.keys[0]
  }

  // Retorna o ponteiro mais à esquerda
  mostLeftPointer() {
    return this.pointers[0]
  }

  // Retorna a chave mais à direita
  mostRightKey() {
    return this.keys[this.keys.length - 1]
  }

  // Retorna o ponteiro mais à direita
  mostRightPointer() {
    return this.pointers[this.pointers.length - 1]
  }

  // Verifica se o nó está cheio
  isNodeFull() {
    return this.keys.length === this.fanout - 1
  }

  // Verifica se o nó está sobrecarregado
  isNodeOverfull() {
    return this.keys.length >= this.fanout
  }

  // Verifica se o nó tem o número mínimo de chaves
  hasMinimumKeys() {
    const minimumKeys = Math.ceil((this.fanout - 1) / 2)
    return this.keys.length >= minimumKeys
  }

  // Verifica se o nó tem o número máximo de chaves
  hasMaximumKeys() {
    const maximumKeys = this.fanout - 1
    return this.keys.length >= maximumKeys
  }

  // Verifica se o nó contém uma chave específica
  hasKey(key) {
    return this.keys.includes(key)
  }

  // Retorna todos os ponteiros não nulos
  nonNullPointers() {
    return this.pointers.filter(pointer => pointer !== null)
  }

  // Retorna o último ponteiro não nulo
  lastNonNullPointer() {
    const validPointers = this.pointers.filter(p => p !== null)
    const lastNonNullPointerIndex = validPointers.length - 1
    return this.pointers[lastNonNullPointerIndex]
  }
}