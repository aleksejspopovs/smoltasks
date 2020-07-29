import {partition} from './utils.js'
import {today, daysToMs, printDate, parseShorthand, parseDate} from './date.js'
import {askForTodo, EditorFields} from './editor.js'

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
    this.deletePending = false
    this.todos = [[], [], []]
    this.blocked = false
    this.reload()
  }

  blockFor(f, showSpinner=false) {
    if (showSpinner) {
      this.root.querySelector('#t-loading').style.display = 'block'
    }
    this.blocked = true

    return f().finally(() => {
      if (showSpinner) {
        this.root.querySelector('#t-loading').style.display = 'none'
      }
      this.blocked = false
    })
  }

  setSelection(value) {
    console.assert(this.validSelection(value))
    this.selected = value
    this.render()
  }

  selectedId() {
    return (this.selected !== null
      ? this.todos[this.selected[0]][this.selected[1]].id
      : null)
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

  deleteSelected() {
    console.assert(this.selected !== null)
    // TODO: error handling
    this.blockFor(() => this.api.markDone(this.selectedId()), true)
    .then(_ => this.reload())
  }

  newTodo(editorRoot) {
    this.blockFor(() => askForTodo(editorRoot))
    .then(todo => {
      this.blockFor(() => this.api.createTodo(todo), true)
      .then(_ => this.reload())
    })
  }

  editSelected(editorRoot, focus=EditorFields.Title) {
    console.assert(this.selected !== null)
    let template = this.todos[this.selected[0]][this.selected[1]]
    this.blockFor(() => askForTodo(editorRoot, template, focus))
    .then(todo => {
      this.blockFor(() => this.api.editTodo(template.id, todo), true)
      .then(_ => this.reload())
    })
  }

  quickPostponeSelected() {
    console.assert(this.selected !== null)
    if (this.selected[0] !== 0) {
      // only TODOs assigned for today can be postponed
      return
    }
    let todo = this.todos[this.selected[0]][this.selected[1]]
    this.blockFor(() => {
      return this.api.editTodo(todo.id, {
        title: todo.title,
        notes: todo.notes,
        not_before: printDate(parseShorthand('1')), // tomorrow
        due: (todo.due === null) ? null : printDate(todo.due),
      })
    }).then(_ => this.reload())
  }

  async reload() {
    // TODO: error handling
    let raw = await this.blockFor(() => this.api.activeTodos(), true)
    let todos = raw.map(todo => ({
      id: todo.id,
      title: todo.title,
      notes: todo.notes,
      notBefore: parseDate(todo.not_before),
      due: (todo.due === null) ? null : parseDate(todo.due),
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
  }

  renderList(root, list) {
    let ol = root.querySelector('ol')

    // prepare to reuse existing child nodes by overwriting
    // their contents
    let nodesToReuse = Array.from(ol.children)
    let nodesReused = 0

    let getNode = () => {
      if (nodesReused === nodesToReuse.length) {
        let template = document.getElementById('t-todo-template')
        let node = template.content.firstElementChild.cloneNode(true)
        ol.appendChild(node)
        return node
      } else {
        return nodesToReuse[nodesReused++]
      }
    }

    // do the thing
    let selectedId = this.selectedId()
    let date = today().getTime()
    for (let todo of list) {
      let node = getNode()

      node.querySelector('.title').innerText = todo.title
      node.querySelector('.notes').innerText = todo.notes
      node.querySelector('.dates').innerText = (
        (todo.due === null)
        ? `nb ${printDate(todo.notBefore, true)}`
        : `nb ${printDate(todo.notBefore, true)}, due ${printDate(todo.due, true)}`
      )

      node.classList.toggle('active', todo.id === selectedId)
      node.classList.toggle('delete-pending', (todo.id === selectedId) && this.deletePending)
      let due = todo.due?.getTime()
      node.classList.toggle('overdue', (due !== null) && (due < date))
      node.classList.toggle('due-today', (due !== null) && (due === date))
      node.classList.toggle(
        'due-tomorrow',
        (due !== null) && (0 < due - date) && (due - date <= daysToMs(1))
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

export async function todos(api, root, editorRoot) {
  root.style.display = 'block'

  let todos = new Todos(api, root)
  document.addEventListener('keydown', e => {
    if (todos.blocked) {
      return
    }

    if (todos.deletePending && (e.code !== 'KeyD')) {
      todos.deletePending = false
      todos.render()
    }

    // first, keys that make sense regardless of whether there is a
    // selection
    switch (e.code) {
      case 'KeyJ':
      case 'ArrowDown':
        if (e.shiftKey) {
          todos.selectLast()
        } else {
          todos.selectNext()
        }
      break
      case 'KeyK':
      case 'ArrowUp':
        if (e.shiftKey) {
          todos.selectFirst()
        } else {
          todos.selectPrev()
        }
      break
      case 'Escape':
        todos.clearSelection()
      break
      case 'KeyR':
        todos.reload()
      break
      case 'KeyN':
        // otherwise this types 'n' into the form
        event.preventDefault()
        todos.newTodo(editorRoot)
      break
    }

    // now, just the keys that require a selection
    if (todos.selected === null) {
      return
    }

    switch (e.code) {
      case 'KeyD':
        if (todos.deletePending) {
          todos.deletePending = false
          todos.deleteSelected()
        } else {
          todos.deletePending = true
          todos.render()
        }
      break
      case 'KeyE':
      case 'Enter':
        event.preventDefault()
        todos.editSelected(editorRoot)
      break
      case 'KeyP':
        if (event.shiftKey) {
          // postpone by editing
          event.preventDefault()
          todos.editSelected(editorRoot, EditorFields.NotBefore)
        } else {
          // just postpone to tomorrow
          todos.quickPostponeSelected()
        }
      break;
    }
  })
}
