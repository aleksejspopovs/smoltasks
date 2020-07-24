import {login} from './login.js'
import {checkToken, ApiClient} from './api.js'
import {todos} from './todos.js'

const LOCALSTORAGE_TOKEN_KEY = 'smolltasks-auth-token'

async function app() {
  let token = window.localStorage.getItem(LOCALSTORAGE_TOKEN_KEY)

  if (!await checkToken(token)) {
    token = await login(document.getElementById('section-login'))
    window.localStorage.setItem(LOCALSTORAGE_TOKEN_KEY, token)
  }

  let api = new ApiClient(token)
  await todos(api, document.getElementById('section-todos'))
}

app()
