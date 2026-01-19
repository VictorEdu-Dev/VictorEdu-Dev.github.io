class Controlls {
  constructor() {
    this.fanout = 4
    this.treeKeys = new Set()
    this.treeSelector = TreeSelector.getInstance()
    this.init()
  }

  static getInstance() {
    if (!Controlls.instance) {
      Controlls.instance = new Controlls()
    }

    return Controlls.instance
  }

  createNewTree(treeType) {
    if (!treeType) treeType = this.treeSelector.getSelectedTreeType()
    if (this.treeVisualizer) this.treeVisualizer.clear()

    this.treeKeys = new Set()

    switch (treeType) {
      case 'b-tree':
        this.createNewBTree()
        break
      case 'b-plus-tree':
        this.createNewBPlusTree()
        break
      default:
        break
    }

    BottomBar.getInstance().reset()
    this.updateDashboard();
  }

  createNewBPlusTree() {
    this.tree = new BPlusTree(this.fanout)
    this.treeVisualizer = new BPlusTreeVisualizer(this.tree)
  }

  createNewBTree() {
    this.tree = new BTree(this.fanout)
    this.treeVisualizer = new BTreeVisualizer(this.tree)
  }

  init() {
    this.createNewTree('b-plus-tree')

    this.treeSelector.setChangeTreeCallback(data => {
      this.createNewTree(data)
    })

    ActionListener.getInstance().setCallback(data => {
      this.handleAction(data)
    })

    OptionListener.getInstance().setChangeFanoutCallback(fanout => {
      this.fanout = fanout
      this.createNewTree()
    })

    OptionListener.getInstance().setClearTreeCallback(() => {
      this.createNewTree()
    })
  }

  showNotification(message, type = 'info') {
    let container = document.getElementById('notification-container')
    if (!container) {
      container = document.createElement('div')
      container.id = 'notification-container'
      document.body.appendChild(container)
    }

    const toast = document.createElement('div')
    toast.classList.add('toast', type)
    toast.innerText = message

    container.appendChild(toast)

    // TEMPO DE EXIBIÇÃO: 3000ms = 3 segundos
    setTimeout(() => {
      // Adiciona a classe que faz a animação de saída (fade out)
      toast.classList.add('hiding')

      // FORÇA A REMOÇÃO: Espera o tempo da animação (ex: 500ms) e remove do DOM
      // Isso é mais seguro que esperar pelo evento 'transitionend'
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast)
        }
      }, 500) // Espera 0.5s para a animação terminar antes de destruir o elemento
    }, 3000)
  }

  updateSequenceDisplay(numbers, type) {
    const container = document.getElementById('sequence-display-container')
    const content = document.getElementById('sequence-content')
    
    if (!container || !content) return

    const label = container.querySelector('.sequence-label')
    
    container.style.display = 'flex'
    if (label) {
        label.innerText = type === 'insert' 
          ? 'Sequência de Inserção Gerada:' 
          : 'Sequência de Deleção Gerada:'
    }

    content.innerHTML = numbers
      .map(n => `<span class="number-item">${n}</span>`)
      .join('')
  }

  handleAction(data) {
    const { type } = data

    switch (type) {
      case 'manual':
        this.handleManualAction(data)
        break
      case 'random':
        this.handleRandomAction(data)
        break
      default:
        break
    }

    this.updateDashboard();

    console.log(data)
    console.log(this.tree.root)
  }

  handleRandomAction(data) {
    const { action, count } = data
    BottomBar.getInstance().startTimer()

    switch (action) {
      case 'insert':
        const { start, end } = data
        // Gera os números usando a função que já existe no seu código
        const randomNumbers = generateRandomUniqueNumbers(start, end, count)

        if (!randomNumbers)
          return alert('[ERRO] Certifique-se que o intervalo é válido!')

        // --- MOSTRA A SEQUÊNCIA NA TELA ---
        this.updateSequenceDisplay(randomNumbers, 'insert')

        randomNumbers.forEach(value => {
          this.treeKeys.add(value)
          this.tree.insert(value)
        })
        break

      case 'delete':
        if (this.treeKeys.size < count) return

        const keysToDelete = []
        const tempKeysArray = Array.from(this.treeKeys) 
        
        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * tempKeysArray.length)
    
            const key = tempKeysArray.splice(randomIndex, 1)[0]
            keysToDelete.push(key)
        }

        this.updateSequenceDisplay(keysToDelete, 'delete')

        keysToDelete.forEach(key => {
          this.treeKeys.delete(key)
          this.tree.delete(key)
        })
        break
        
      default:
        break
    }
  }

  handleManualAction(data) {
    const { action, value } = data

    switch (action) {
      case 'insert':
        this.treeKeys.add(value)
        this.tree.insert(value)
        break

      case 'search':
        const found = this.tree.find(value)
        
        // === ALTERAÇÃO AQUI: Adicionadas as aspas "" em volta de ${value} ===
        const message = `Chave "${value}"${found ? '' : ' não'} encontrada!`
        
        if (found) {
            this.showNotification(message, 'success')
        } else {
            this.showNotification(message, 'error')
        }
        break

      case 'delete':
        this.treeKeys.delete(value)
        this.tree.delete(value)
        break
      default:
        break
    }
  }

  updateSequenceDisplay(numbers, type) {
    const container = document.getElementById('sequence-display-container');
    const content = document.getElementById('sequence-content');
    const label = container.querySelector('.sequence-label');

    if (!container || !content) return;

    container.style.display = 'flex';
    
    label.innerText = type === 'insert' ? 'Sequência de Inserção Gerada:' : 'Sequência de Deleção Gerada:';

    content.innerHTML = numbers.map(n => `<span class="number-item">${n}</span>`).join('');
  }

  updateDashboard() {
     if (!this.tree) return;
     
     // Pega os dados da árvore
     const stats = this.tree.getStatistics();
     
     // Atualiza o HTML
     const heightEl = document.getElementById('stat-height-value');
     const nodesEl = document.getElementById('stat-nodes-value');
     const keysEl = document.getElementById('stat-keys-value');

     if (heightEl) heightEl.innerText = stats.height;
     if (nodesEl) nodesEl.innerText = stats.nodeCount;
     // Para total de chaves, usamos o Set que você já tem no controlador (mais rápido)
     if (keysEl) keysEl.innerText = this.treeKeys.size;
  }
}

window.addEventListener('load', () => {
  Controlls.getInstance()
})
