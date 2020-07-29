import {parseShorthand, today, daysToMs, printDate} from './date.js'

export const EditorFields = {
  Title: Symbol('EditorFields.Title'),
  Notes: Symbol('EditorFields.Notes'),
  NotBefore: Symbol('EditorFields.NotBefore'),
  Due: Symbol('EditorFields.Due'),
}

export function initEditor(root) {
  function handleShorthandInput(input, display, required) {
    input.addEventListener('input', () => {
      let now = today()
      let parsed = parseShorthand(input.value)
      if (parsed === null) {
        delete input.dataset.date

        display.innerText = 'never'
      } else {
        input.dataset.date = printDate(parsed)

        if (parsed.getTime() === now.getTime()) {
          display.innerText = 'today'
        } else {
          let diff = (parsed.getTime() - now.getTime()) / daysToMs(1)
          display.innerText = `${printDate(parsed)}, in ${diff}d`
        }
      }

      if (required) {
        let valid = (parsed !== null)
        input.setCustomValidity(!valid ? 'cannot be empty or invalid' : '')
      }
    })
  }

  handleShorthandInput(
    root.querySelector('#e-not-before'),
    root.querySelector('#e-not-before-display'),
    true,
  )

  handleShorthandInput(
    root.querySelector('#e-due'),
    root.querySelector('#e-due-display'),
    false,
  )
}

export function askForTodo(root, template=null, focus=EditorFields.Title) {
  // NB: template comes in in the internal storage format of Todos class
  // in todos.js, but the output from askTodo is in the wire format
  // (w.r.t. date formats, camel case vs snake case).

  let form = root.querySelector('form')
  let titleField = root.querySelector('#e-title')
  let notesField = root.querySelector('#e-notes')
  let notBeforeField = root.querySelector('#e-not-before')
  let dueField = root.querySelector('#e-due')

  return new Promise((resolve, reject) => {
    function cleanupAndHide() {
      document.removeEventListener('keydown', escapeHandler)
      root.removeEventListener('click', clickOutsideHandler)
      form.removeEventListener('submit', submitHandler)
      root.style.display = 'none'
    }

    function submitHandler(event) {
      event.preventDefault()

      resolve({
        title: titleField.value,
        notes: notesField.value,
        not_before: notBeforeField.dataset.date || null,
        due: dueField.dataset.date || null,
      })

      cleanupAndHide()
    }

    function clickOutsideHandler(event) {
      if (event.target !== root) {
        return
      }

      reject('canceled')
      cleanupAndHide()
    }

    function escapeHandler(event) {
      if (event.code !== 'Escape') {
        return
      }

      reject('canceled')
      cleanupAndHide()
    }

    root.style.display = 'block'

    titleField.value = template?.title || ''
    notesField.value = template?.notes || ''
    notBeforeField.value = template?.notBefore ? printDate(template.notBefore) : '0'
    dueField.value = template?.due ? printDate(template?.due) : ''

    // force parsing of initial values
    notBeforeField.dispatchEvent(new Event('input'))
    dueField.dispatchEvent(new Event('input'))

    switch (focus) {
      case EditorFields.Title:     titleField.focus();     break
      case EditorFields.Notes:     titleField.focus();     break
      case EditorFields.NotBefore: notBeforeField.focus(); break
      case EditorFields.Due:       dueField.focus();       break
    }

    form.addEventListener('submit', submitHandler)
    root.addEventListener('click', clickOutsideHandler)
    document.addEventListener('keydown', escapeHandler)
  })
}
