export function localTzOffset() {
  return (new Date()).getTimezoneOffset()
}

export function parseDate(dateString) {
  // returns 00:00 of the given date in local time
  let [y, m, d] = dateString.split('-').map(x => parseInt(x, 10))
  return new Date(y, m - 1, d)
}

export function today() {
  // returns 00:00 today, local time
  let date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function daysToMs(days) {
  return days * 24 * 60 * 60 * 1000
}
