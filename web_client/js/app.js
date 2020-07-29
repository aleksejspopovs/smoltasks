import {checkToken, ApiClient} from './api.js'
import {login} from './login.js'
import {todos} from './todos.js'
import {initEditor} from './editor.js'

const LOCALSTORAGE_TOKEN_KEY = 'smolltasks-auth-token'

import {askForTodo} from './editor.js' // TEMP

async function app() {
  initEditor(document.getElementById('section-editor'))

  let token = window.localStorage.getItem(LOCALSTORAGE_TOKEN_KEY)

  if (!await checkToken(token)) {
    token = await login(document.getElementById('section-login'))
    window.localStorage.setItem(LOCALSTORAGE_TOKEN_KEY, token)
  }

  let api = new ApiClient(token)
  await todos(
    api,
    document.getElementById('section-todos'),
    document.getElementById('section-editor'),
  )
}

app()
