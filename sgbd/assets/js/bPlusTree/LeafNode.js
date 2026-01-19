class LeafNode extends BPlusTreeNode {
  constructor(fanout) {
    super(fanout)
  }

  hasTooFewKeys() {
    // Em nós folha, o mínimo é geralmente (fanout-1)/2.
    // Usamos Math.ceil para garantir inteiros.
    const minimumKeys = Math.ceil((this.fanout - 1) / 2)
    return this.keys.length < minimumKeys
  }

  insert(value, pointer) {
    const i = this.keys.findIndex(k => isLowerOrEqual(value, k))

    // Caso a chave seja menor que uma das chaves do nó, insere na posição i
    // Caso contrário (maior que todas), insere no final
    const insertKeyIndex = i !== -1 ? i : this.keys.length
    
    this.keys.splice(insertKeyIndex, 0, value)
    this.pointers.splice(insertKeyIndex, 0, pointer)
    
    // Chama o super apenas para notificar a visualização
    super.insert(value, pointer, insertKeyIndex)
  }

  delete(value) {
    const i = this.keys.findIndex(k => isLowerOrEqual(value, k))

    // CORREÇÃO DE SEGURANÇA:
    // Verifica se o índice é válido e se o valor encontrado é realmente o alvo.
    if (i === -1 || value !== this.keys[i]) return

    this.keys.splice(i, 1)
    this.pointers.splice(i, 1)
    
    // Chama o super apenas para notificar a visualização
    super.delete(value)
  }

  /**
   * Divide o nó em dois e retorna a chave (Cópia) que deve subir para o pai.
   */
  split(rightSibling) {
    const middleIndex = Math.ceil(this.fanout / 2)
    
    // Identifica chaves e ponteiros para mover para o novo nó (Direita)
    const keysToMove = this.keys.slice(middleIndex)
    const pointersToMove = this.pointers.slice(middleIndex)

    // Insere no nó da direita
    keysToMove.forEach((key, index) => {
      rightSibling.insert(key, pointersToMove[index])
    })

    // Remove do nó atual (Esquerda)
    // Usamos um loop reverso chamando delete para garantir que
    // as visualizações/eventos de deleção ocorram corretamente e na ordem certa.
    for (let i = keysToMove.length - 1; i >= 0; i--) {
      this.delete(keysToMove[i])
    }

    // CORREÇÃO CRÍTICA B+ Tree:
    // Em nós folha, a chave que sobe é uma CÓPIA da primeira chave do nó da direita.
    return rightSibling.keys[0]
  }

  redistribute(sibling, parent, k) {
    const isSiblingLeft = isLowerOrEqual(sibling.mostRightKey(), this.mostLeftKey())

    if (isSiblingLeft) {
      // === Empresta da Esquerda (Rotação à Direita) ===
      const borrowedKey = sibling.mostRightKey()
      const borrowedPointer = sibling.mostRightPointer()

      sibling.delete(borrowedKey)
      this.insert(borrowedKey, borrowedPointer)
      
      // A chave separadora no pai deve se tornar a nova menor chave deste nó (Right)
      parent.replaceKey(k, this.keys[0]) 
    } else {
      // === Empresta da Direita (Rotação à Esquerda) ===
      const borrowedKey = sibling.mostLeftKey()
      const borrowedPointer = sibling.mostLeftPointer()

      sibling.delete(borrowedKey)
      this.insert(borrowedKey, borrowedPointer)
      
      // A chave separadora no pai deve se tornar a nova menor chave do irmão (que agora mudou)
      parent.replaceKey(k, sibling.keys[0]) 
    }
  }
}