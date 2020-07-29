function findApiBase() {
  let url = new URL(document.location)
  return `${url.origin}/api/`
}

export class ApiError {
  constructor (error) {
    this.helpText = error.help_text
  }

  toString() {
    return this.helpText
  }
}

export class ServerError {
  constructor (error) {
    this.helpText = error.help_text
  }

  toString() {
    return `internal errror: ${this.helpText}`
  }
}

export class ApiClient {
  constructor (token=null) {
    this.apiBase = findApiBase()
    this.token = token
  }

  async _fetch (endpoint, data, method, authed) {
    let headers = {}
    if (authed) {
      console.assert(this.token !== null)
      headers['x-smoltasks-token'] = this.token
    }
    if (data !== undefined) {
      headers['content-type'] = 'application/json'
    }

    let response = await fetch(
      `${this.apiBase}${endpoint}`,
      {
        method,
        headers,
        body: JSON.stringify(data),
      }
    )

    let response_data = await response.json()

    switch (response.status) {
      case 200:
        return response_data
      break;
      case 400:
        throw new ApiError(response_data)
      break;
      case 500:
        throw new ServerError(response_data)
      break;
      default:
        console.assert(false, `unknown response status ${response.status}`)
    }
  }

  async login(username, password) {
    return await this._fetch(
      'users/login',
      {username, password},
      'POST',
      false,
    )
  }

  async signUp(username, password) {
    let result = await this._fetch(
      'users/sign_up',
      {username, password},
      'POST',
      false,
    )
    console.assert(result === true, 'sign_up returns true')
  }

  async whoami() {
    return await this._fetch('users/whoami', undefined, 'GET', true)
  }

  async activeTodos() {
    return await this._fetch('todos', undefined, 'GET', true)
  }

  async markDone(id) {
    let result = await this._fetch(`todos/${id}/done`, true, 'POST', true)
    console.assert(result === true, 'POST todos/xx/done returns true')
  }

  async createTodo(todo) {
    return await this._fetch('todos', todo, 'PUT', true)
  }

  async editTodo(id, todo) {
    let result = await this._fetch(`todos/${id}`, todo, 'PUT', true)
    console.assert(result === true, 'PUT todos/xx returns true')
  }
}

export async function checkToken(token) {
  if ((token === null) || (token === undefined) || (token === '')) {
    return false
  }

  let api = new ApiClient(token)
  try {
    api.whoami()
  } catch {
    return false
  }
  return true
}
