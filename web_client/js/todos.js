import {partition} from './utils.js'
import {today, daysToMs} from './date.js'

const SOON_IN_DAYS = 7

function cmpByDue(a, b) {
  if (a.due === null) {
    return (b.due === null) ? 0 : 1
  }
  if (b.due === null) {
    return -1
  }
  return a.due - b.due
}

function cmpByNotBefore(a, b) {
  let aKey = (a.due !== null) ? Math.min(a.due, a.notBefore) : a.notBefore
  let bKey = (b.due !== null) ? Math.min(b.due, b.notBefore) : b.notBefore
  return aKey - bKey
}

class Todos {
  constructor (api, root) {
    this.api = api
    this.root = root
    this.selected = null
    this.todos = [[], [], []]
    this.blocked = false
    this.reload()
  }

  block() {
    this.root.querySelector('#t-loading').style.display = 'block'
    this.blocked = true
  }

  unblock() {
    this.root.querySelector('#t-loading').style.display = 'none'
    this.blocked = false
  }

  setSelection(value) {
    console.assert(this.validSelection(value))
    this.selected = value
    this.render()
  }

  validSelection(value) {
    if (value === null) {
      return true
    }
    let [group, idx] = value
    return (
      (0 <= group)
      && (group < this.todos.length)
      && (0 <= idx)
      && (idx < this.todos[group].length)
    )
  }

  // findNext and findPrev can accept input selections that do not
  // refer to existing todos, and will always output a selection that
  // does (or null)
  findNext(selection) {
    let [group, idx] = (selection !== null) ? selection : [0, -1]
    if (idx + 1 < this.todos[group].length) {
      return [group, idx + 1]
    }
    for (let i = group + 1; i < this.todos.length; i++) {
      if (this.todos[i].length > 0) {
        return [i, 0]
      }
    }
    return this.validSelection(selection) ? selection : null
  }

  findPrev(selection) {
    let [group, idx] = (selection !== null)
      ? selection
      : [this.todos.length - 1, this.todos[this.todos.length - 1].length]

    if (idx - 1 >= 0) {
      return [group, idx - 1]
    }
    for (let i = group - 1; i >= 0; i--) {
      if (this.todos[i].length > 0) {
        return [i, this.todos[i].length - 1]
      }
    }
    return this.validSelection(selection) ? selection : null
  }

  selectNext() {
    this.setSelection(this.findNext(this.selected))
  }

  selectPrev() {
    this.setSelection(this.findPrev(this.selected))
  }

  selectFirst() {
    this.setSelection(this.findNext(null))
  }

  selectLast() {
    this.setSelection(this.findPrev(null))
  }

  clearSelection() {
    this.setSelection(null)
  }

  async reload() {
    this.block()
    let raw = await this.api.activeTodos()
    let todos = raw.map(todo => ({
      id: todo.id,
      title: todo.title,
      notes: todo.notes,
      notBefore: new Date(todo.not_before),
      due: (todo.due === null) ? null : new Date(todo.due),
    }))

    let day = today()
    this.todos = partition(
      todos,
      todo => (todo.notBefore <= day),
      todo => (todo.notBefore - day <= daysToMs(SOON_IN_DAYS)),
    )

    this.todos[0].sort(cmpByDue)
    this.todos[1].sort(cmpByNotBefore)
    this.todos[2].sort(cmpByNotBefore)

    // fix up the selection, in case there is no longer anything
    // at the selected position
    if (!this.validSelection(this.selected)) {
      this.setSelection(this.findPrev(this.selected))
    }

    this.render()
    this.unblock()
  }

  renderList(root, list) {
    let ol = root.querySelector('ol')

    // prepare to reuse existing child nodes by overwriting
    // their contents
    let nodesToReuse = Array.from(ol.children)
    let nodesReused = 0

    let getNode = () => {
      if (nodesReused === nodesToReuse.length) {
        let node = document.createElement('li')
        ol.appendChild(node)
        return node
      } else {
        return nodesToReuse[nodesReused++]
      }
    }

    // do the thing
    let selectedId = this.selected !== null
      ? this.todos[this.selected[0]][this.selected[1]].id
      : null
    let date = today()
    for (let todo of list) {
      let node = getNode()
      node.innerText = todo.title
      node.classList.toggle('active', todo.id === selectedId)
      node.classList.toggle('overdue', (todo.due !== null) && (todo.due < date))
      node.classList.toggle('due-today', (todo.due !== null) && (todo.due == date))
      node.classList.toggle(
        'due-tomorrow',
        (todo.due !== null) && (todo.due - date > 0) && (todo.due - date <= daysToMs(1))
      )
    }

    // clean up unused child nodes
    while (nodesReused < nodesToReuse.length) {
      let child = nodesToReuse.pop()
      ol.removeChild(child)
    }
  }

  render() {
    console.assert(this.todos.length == 3)
    this.renderList(this.root.querySelector('#t-now'), this.todos[0])
    this.renderList(this.root.querySelector('#t-soon'), this.todos[1])
    this.renderList(this.root.querySelector('#t-later'), this.todos[2])
  }
}

export async function todos(api, root) {
  root.style.display = 'block'

  let todos = new Todos(api, root)
  document.addEventListener('keydown', e => {
    if (todos.blocked) {
      return
    }

    switch (e.code) {
      case "KeyJ":
      case "ArrowDown":
        if (e.shiftKey) {
          todos.selectLast()
        } else {
          todos.selectNext()
        }
      break
      case "KeyK":
      case "ArrowUp":
        if (e.shiftKey) {
          todos.selectFirst()
        } else {
          todos.selectPrev()
        }
      break
      case "Escape":
        todos.clearSelection()
      break
      case "KeyR":
        todos.reload()
      break
      break
      // default:
      // console.log('key', e.code)
    }
  })
}
