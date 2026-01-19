class BPlusTree extends Observable {
  constructor(fanout) {
    super()
    this.fanout = fanout
    this.root = null
    this.createNodeFunction = this.defaultCreateNodeFunction
  }

  // Cria um novo nó (folha ou interno)
  defaultCreateNodeFunction(fanout, isLeaf) {
    const createdNode = isLeaf ? new LeafNode(fanout) : new InternalNode(fanout)
    this.notifyAll({
      type: 'createdNewNode',
      data: {
        node: createdNode,
      },
    })
    return createdNode
  }

  

  // Define a função de criação de nós personalizada
  setCreateNodeFunction(createNodeFunction) {
    this.createNodeFunction = createNodeFunction
  }

  // Retorna o nível de um nó específico
  getNodeLevel(node) {
    if (!node || !this.root) return 0
    if (node === this.root) return 0

    let current = this.root
    let level = 0

    while (current) {
      if (current === node) return level
      if (current instanceof LeafNode) break
      if (current.pointers.includes(node)) return level + 1

      const targetKey = (node.keys && node.keys.length > 0) ? node.keys[0] : null

      if (targetKey !== null) {
          const i = current.keys.findIndex(k => isLower(targetKey, k))

          if (i === -1) {
             current = current.pointers[current.keys.length] || current.lastNonNullPointer()
          } else {
             current = current.pointers[i]
          }
      } else {
          current = current.pointers[0]
      }

      level++
    }

    return level
  }

  // Verifica se a árvore está vazia
  isEmpty() {
    return this.root === null
  }

  // Retorna todas as conexões de ponteiros na árvore
  getPointerConnections() {
    const levelConnections = this.getLevelConnections()
    const leafConnections = this.getLeafConnections()
    return [...levelConnections, ...leafConnections]
  }

  // Retorna as conexões de ponteiros entre níveis da árvore
  getLevelConnections() {
    const connections = []
    const stack = []
    const visited = new Set()

    if (this.root) stack.push(this.root)

    while (stack.length > 0) {
      const currentNode = stack.pop()
      // só processamos nós internos para conexões verticais
      if (currentNode instanceof InternalNode) {
        for (let i = 0; i < currentNode.pointers.length; i++) {
          const childNode = currentNode.pointers[i]
          
          // Se o ponteiro existe
          if (childNode) {
            connections.push({
              parent: currentNode,
              child: childNode,
              index: i,
            })

            if (!visited.has(childNode)) {
              stack.push(childNode)
              visited.add(childNode)
            }
          }
        }
      }
    }
    return connections
  }

  // Retorna as conexões entre nós folha (lista ligada)
  getLeafConnections() {
    const connections = []
    if (!this.root) return []

    // Helper para coletar folhas EM ORDEM (Esquerda -> Direita)
    const collectLeaves = (node, leavesList) => {
      if (!node) return
      
      if (node instanceof LeafNode) {
        leavesList.push(node)
      } else if (node instanceof InternalNode) {
        for (const ptr of node.pointers) {
          if (ptr) collectLeaves(ptr, leavesList)
        }
      }
    }

    const leafNodes = []
    collectLeaves(this.root, leafNodes)

    // Cria as conexões entre a folha atual e a próxima (Linked List visual)
    for (let i = 0; i < leafNodes.length - 1; i++) {
      connections.push({
        parent: leafNodes[i],
        child: leafNodes[i + 1],
        isBrother: true,
      })
    }
    return connections
  }

  // Encontra o nó folha onde um valor deveria estar
  findSupposedLeafNode(value) {
    let c = this.root
    if (!c) return null

    while (c instanceof InternalNode) {
      const i = c.keys.findIndex(k => isLower(value, k))
      this.notifyAll({ type: 'highlightNode', data: { node: c } })

      if (i === -1) {
        // Se maior que todos, vai para o último ponteiro válido
        c = c.pointers[c.keys.length] || c.lastNonNullPointer()
      } else {
        c = c.pointers[i]
      }
    }
    this.notifyAll({ type: 'highlightNode', data: { node: c } })
    return c
  }

  find(value) {
    const leafNode = this.findSupposedLeafNode(value)
    if (leafNode && leafNode.hasKey(value)) return leafNode
    return null
  }

  // Encontra o nó pai de um nó específico
  parent(node) {
    const findParent = (currentNode, targetNode) => {
      if (!currentNode || !targetNode || currentNode instanceof LeafNode) return null
      
      const isNodeInPointers = currentNode.pointers.some(pointer => pointer && pointer.id === targetNode.id)
      if (isNodeInPointers) return currentNode

      for (const pointer of currentNode.pointers) {
        if (pointer) {
          const parent = findParent(pointer, targetNode)
          if (parent !== null) return parent
        }
      }
      return null
    }
    return findParent(this.root, node)
  }

  // Substitui uma chave interna por outra
  replaceInternalKey(oldKey, newKey) {
    if (!this.root || this.root instanceof LeafNode) return

    let node = this.root
    while (node instanceof InternalNode) {
      const idx = node.keys.findIndex(k => k == oldKey)
      if (idx !== -1) {
        node.replaceKey(oldKey, newKey)
        return
      }

      const i = node.keys.findIndex(k => isLower(oldKey, k))
      if (i === -1) {
        node = node.lastNonNullPointer()
      } else {
        node = node.pointers[i]
      }
      
      if (!node) return
    }
  }

  // Insere um novo nó pai
  insertParent(node, newKey, newNode) {
    if (this.root === node) {
      const newRoot = this.createNodeFunction(this.fanout, false)
      this.notifyAll({ type: 'createRoot', data: { node: newRoot } })

      newRoot.pointers[0] = node 
      newRoot.insert(newKey, newNode)
      this.root = newRoot
      return
    }

    const parent = this.parent(node)
    if (parent.pointers.length < this.fanout) {
      parent.insert(newKey, newNode)
      return
    }

    parent.insert(newKey, newNode)
    const rightNode = this.createNodeFunction(this.fanout, false)
    
    const level = this.getNodeLevel(parent) 
    
    this.notifyAll({
      type: 'createNode',
      data: { leftNode: parent, node: rightNode, level },
    })

    const promotedKey = parent.split(rightNode)
    this.insertParent(parent, promotedKey, rightNode)
  }

  // Insere um valor na árvore
  insert(value, pointer) {
    let leafNode
    if (this.isEmpty()) {
      this.root = this.createNodeFunction(this.fanout, true)
      leafNode = this.root
      this.notifyAll({ type: 'createRoot', data: { node: this.root } })
    } else {
      leafNode = this.findSupposedLeafNode(value)
    }

    if (leafNode.keys.length < leafNode.fanout - 1) {
      leafNode.insert(value, pointer)
      return
    }

    leafNode.insert(value, pointer)
    const rightNode = this.createNodeFunction(this.fanout, true)
    
    this.notifyAll({
      type: 'createNode',
      data: { leftNode: leafNode, node: rightNode, level: this.getNodeLevel(leafNode) },
    })

    const keyToParent = leafNode.split(rightNode)
    this.insertParent(leafNode, keyToParent, rightNode)
  }

  // Deleta um valor da árvore
  delete(value, pointer) {
    const leafNode = this.findSupposedLeafNode(value)
    
    if (leafNode && !leafNode.hasKey(value)) {
       if (leafNode.keys.length > 0) {
         this.replaceInternalKey(value, leafNode.keys[0])
       }
       return
    }

    if (!leafNode) return 
    this.deleteEntry(value, pointer, leafNode)
  }

  deleteEntry(value, pointer, node) {
    // 1. Executa a remoção local no nó
    node.delete(value)

    // 2. Se for folha, atualiza a chave separadora interna (típico de B+ Tree)
    if (node instanceof LeafNode && node.keys.length > 0) {
      this.replaceInternalKey(value, node.keys[0])
    }

    // 3. Verifica se a raiz precisa ser alterada ou deletada
    if (this.handleRootUnderflow(node)) {
      return
    }

    // 4. Se não for raiz e tiver poucas chaves, trata o underflow (Merge ou Redistribuição)
    if (node.hasTooFewKeys()) {
      this.handleNodeUnderflow(node)
    }
  }

  /**
   * Trata os casos onde a raiz fica vazia ou precisa reduzir a altura da árvore.
   * Retorna true se houve alteração na raiz que encerra o processo.
   */
  handleRootUnderflow(node) {
    if (this.root !== node) return false

    // Caso A: Raiz é folha e ficou vazia -> Árvore vazia
    if (node instanceof LeafNode && node.keys.length === 0) {
      this.c({ type: 'deleteRoot', data: { node } })
      this.root = null
      return true
    }

    // Caso B: Raiz é nó interno e só sobrou 1 filho -> Reduz altura
    if (node instanceof InternalNode && node.pointers.length === 1) {
      this.notifyAll({ type: 'deleteRoot', data: { node } })
      this.root = this.root.pointers[0]
      return true
    }

    return false
  }

  /**
   * Gerencia a lógica de escolher entre Merge (Fusão) ou Redistribute (Empréstimo).
   */
  handleNodeUnderflow(node) {
    const parent = this.parent(node)
    if (!parent) return

    // Busca contexto (irmãos, chaves separadoras, índices)
    const ctx = this.getUnderflowContext(parent, node)
    if (!ctx) return

    const { leftNode, rightNode, separatorKey, nodeToRemove } = ctx

    // Calcula se cabe tudo em um nó só (Merge) ou se precisa redistribuir
    const totalKeys = leftNode.keys.length + rightNode.keys.length
    const neededSpace = (node instanceof InternalNode) ? totalKeys + 1 : totalKeys

    if (neededSpace <= this.fanout - 1) {
      this.performMerge(parent, leftNode, rightNode, separatorKey, nodeToRemove)
    } else {
      // Redistribute (Empréstimo)
      // Nota: recuperei a lógica original de pegar o 'sibling' correto baseado no índice
      const index = parent.pointers.indexOf(node) !== -1 
        ? parent.pointers.indexOf(node) 
        : parent.pointers.findIndex(p => p && p.id === node.id)
        
      const sibling = (index > 0) ? leftNode : rightNode
      const k = (index > 0) ? parent.keys[index - 1] : parent.keys[index]
      
      node.redistribute(sibling, parent, k)
    }
  }

  /**
   * Identifica quem são os vizinhos (left/right node) e qual a chave separadora no pai.
   */
  getUnderflowContext(parent, node) {
    let index = parent.pointers.indexOf(node)
    if (index === -1) index = parent.pointers.findIndex(p => p && p.id === node.id)

    let leftNode, rightNode, separatorKey, nodeToRemove

    if (index > 0) {
      // Tenta fundir/emprestar com o irmão da ESQUERDA
      leftNode = parent.pointers[index - 1]
      rightNode = node
      separatorKey = parent.keys[index - 1]
      nodeToRemove = rightNode // O nó atual será removido no merge
    } else {
      // Tenta fundir/emprestar com o irmão da DIREITA (pois é o primeiro filho)
      leftNode = node
      rightNode = parent.pointers[index + 1]
      separatorKey = parent.keys[index]
      nodeToRemove = rightNode // O irmão da direita será removido no merge
    }

    if (!leftNode || !rightNode) return null

    return { leftNode, rightNode, separatorKey, nodeToRemove }
  }

  /**
   * Executa a fusão de dois nós e chama recursivamente o delete no pai.
   */
  performMerge(parent, leftNode, rightNode, separatorKey, nodeToRemove) {
    // 1. Move chaves e ponteiros do rightNode para o leftNode
    if (leftNode instanceof InternalNode) {
      // Nó Interno: Desce a chave separadora do pai
      leftNode.keys.push(separatorKey)
      leftNode.notifyAll({
        type: 'insertKey',
        data: { key: { value: separatorKey, index: leftNode.keys.length - 1 }, node: leftNode }
      })

      rightNode.keys.forEach(k => {
        leftNode.keys.push(k)
        leftNode.notifyAll({
          type: 'insertKey',
          data: { key: { value: k, index: leftNode.keys.length - 1 }, node: leftNode }
        })
      })
      leftNode.pointers.push(...rightNode.pointers)

    } else {
      // Nó Folha: Apenas move as chaves (em B+ Tree a separadora já existe nas folhas ou é descartada)
      rightNode.keys.forEach(k => {
        leftNode.keys.push(k)
        leftNode.notifyAll({
          type: 'insertKey',
          data: { key: { value: k, index: leftNode.keys.length - 1 }, node: leftNode }
        })
      })
      leftNode.pointers.push(...rightNode.pointers)
    }

    // 2. Notifica visualização da remoção do nó
    this.notifyAll({
      type: 'deleteNode',
      data: { node: nodeToRemove, level: this.getNodeLevel(nodeToRemove) },
    })

    // 3. Recursão: Remove a chave separadora do pai (que desceu ou não é mais necessária)
    this.deleteEntry(separatorKey, nodeToRemove, parent)
  }

  getStatistics() {
    if (!this.root) return { height: 0, nodeCount: 0 };

    let height = 0;
    let nodeCount = 0;

    // 1. Calcula Altura (descendo pela esquerda até a folha)
    let current = this.root;
    while (current) {
        height++;
        if (current instanceof InternalNode && current.pointers.length > 0) {
            current = current.pointers[0];
        } else {
            break;
        }
    }

    // 2. Conta Total de Nós (percurso BFS simples)
    const stack = [this.root];
    while (stack.length > 0) {
        const node = stack.pop();
        nodeCount++;
        
        if (node instanceof InternalNode) {
            for (const ptr of node.pointers) {
                if (ptr) stack.push(ptr);
            }
        }
    }

    return { height, nodeCount };
  }
}