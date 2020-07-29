import {ApiClient} from './api.js'

export function login(root) {
  let username = () => root.querySelector('#l-username').value
  let password = () => root.querySelector('#l-password').value
  let status = (value) => { root.querySelector('#l-status').innerText = value }
  let show = () => { root.style.display = 'block' }
  let hide = () => { root.style.display = 'none' }
  let api = new ApiClient()

  return new Promise((resolve, reject) => {
    async function loginHandler(event) {
      event.preventDefault()
      status('doing the thing...')

      let token = null
      try {
        token = await api.login(username(), password())
      } catch (err) {
        status(err)
        return
      }

      // TODO: remove the event listeners so that this component can be reused
      hide()
      resolve(token)
    }

    async function signupHandler(event) {
      event.preventDefault()
      status('doing the thing...')

      try {
        await api.signUp(username(), password())
      } catch (err) {
        status(err)
        return
      }

      status('done! you can log in now.')
    }

    root.querySelector('#l-form').addEventListener('submit', loginHandler)
    root.querySelector('#l-login').addEventListener('click', loginHandler)
    root.querySelector('#l-signup').addEventListener('click', signupHandler)
    show()
  })
}
