export const DaysOfTheWeek = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa']
export const Months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const _DaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

// see parseShorthand below
const RegExpDay = '([0-2]?[1-9]|30|31)'
const RegExpMonth = '(0?[1-9]|1[0-2])'
const ShorthandPatterns = [
  /* a */
  [/^(\d+)$/, true, (from, days) => new Date(from.getTime() + daysToMs(days))],
  /* b */
  [/^(\d+)w$/, true, (from, weeks) => new Date(from.getTime() + daysToMs(7 * weeks))],
  /* c */
  [/^(\d+)m$/, true, (from, months) => {
    let newMonth = from.getMonth() + months
    let newYear = from.getFullYear() + Math.floor(newMonth / 12)
    newMonth %= 12
    let newDate = Math.min(from.getDate(), daysInMonth(newYear, newMonth))
    return new Date(newYear, newMonth, newDate)
  }],
  /* d */
  [new RegExp(`^(${DaysOfTheWeek.join('|')})$`), false, (from, day) => {
    let destDay = DaysOfTheWeek.indexOf(day)
    let extraDays = destDay - from.getDay()
    if (extraDays <= 0) {
      extraDays += 7
    }
    return new Date(from.getTime() + daysToMs(extraDays))
  }],
  /* e */
  [new RegExp(`^${RegExpDay}(?:\.|st|nd|rd|th)$`), true, (from, date) => {
    if ((date > from.getDate()) && (date <= daysInMonth(from.getFullYear(), from.getMonth()))) {
      return new Date(from.getFullYear(), from.getMonth(), date)
    } else {
      let newYear = (from.getMonth() < 11) ? from.getFullYear() : (from.getFullYear + 1)
      let newMonth = (from.getMonth() + 1) % 12
      if (date > daysInMonth(newYear, newMonth)) {
        return null
      }
      return new Date(newYear, newMonth, date)
    }
  }],
  /* f */
  [new RegExp(`^${RegExpMonth}[/-]${RegExpDay}$`), true, (from, month, day) => {
    let result = new Date(from.getFullYear(), month - 1, day)
    if (result <= from) {
      result = new Date(from.getFullYear() + 1, month - 1, day)
    }
    return result
  }],
  /* g */
  [new RegExp(`^(\\d{4})-${RegExpMonth}-${RegExpDay}$`), true, (_, year, month, date) => {
    if (date > daysInMonth(year, month - 1)) {
      return null
    }
    return new Date(year, month - 1, date)
  }],
  /* h */
  [new RegExp(`^(${Months.join('|')}) ${RegExpDay}$`), false, (from, monthName, day) => {
    day = parseInt(day, 10)
    let month = Months.indexOf(monthName)
    let result = new Date(from.getFullYear(), month, day)
    if (result <= from) {
      result = new Date(from.getFullYear() + 1, month, day)
    }
    return result
  }]
]

function daysInMonth(year, month) {
  // NB: follows javascript's convention of zero-numbering months
  if ((month === 1) && (isLeap(year))) {
    return 29
  }
  return _DaysInMonth[month]
}

export function isLeap(year) {
  // from https://stackoverflow.com/a/43819507
  return new Date(year, 1, 29).getDate() === 29
}

export function localTzOffset() {
  return (new Date()).getTimezoneOffset()
}

export function parseDate(dateString) {
  // takes in 'YYYY-MM-DD',
  // returns 00:00 of the given date in local time
  if (dateString === null) {
    return null
  }
  let [y, m, d] = dateString.split('-').map(x => parseInt(x, 10))
  return new Date(y, m - 1, d)
}

export function printDate(date, short=false) {
  // returns 'YYYY-MM-DD'. if short is true, returns MM-DD for dates
  // within the next 335 days.
  if (short && (date - (new Date()) <= daysToMs(335))) {
    return date.toISOString().slice(5, 10)
  }
  return date.toISOString().slice(0, 10)
}

export function today() {
  // returns 00:00 today, local time
  return dateTimeToDate(new Date())
}

export function dateTimeToDate(datetime) {
  // returns midnight of the given date, local time
  return new Date(datetime.getFullYear(), datetime.getMonth(), datetime.getDate())
}

export function daysToMs(days) {
  return days * 24 * 60 * 60 * 1000
}

export function parseShorthand(input, from=null) {
  /*
    a.  0, 1, 2, 3, ... ?          → ? days from now (0 == today)
    b.  1w, 2w, ..., ?w            → ?*7 days from now
    c.  1m, 2m, ..., ?m            → today's date in ?th next month
    d.  mo, tu, we, th, fr, sa, su → closest such day of the week
    e.  1., 2., ..., 31.
        also 1st, 2nd, 3rd, ...    → closest such day of the month
    f   1/1, 1/2, ..., 12/31
        also 1-1, 1-2,             → closest such day of the year
    g.  2020-09-01                 → this day
    h.  jan 1, jan 2, ..., dec 31  → same as f

    zero-padding days and months in efg is optional.

    abc may return today, but not a date in the past.
    defh always return a date strictly in the future.
    g is the only method that can return any date.

    c will clamp (on Jan 31, "1m" means Feb 28).
    e will error if the closest such day is neither in the current
    nor next month.
  */
  from = (from !== null) ? dateTimeToDate(from) : today()

  for (let [pattern, integerCaptures, parse] of ShorthandPatterns) {
    let match = input.match(pattern)
    if (match === null) {
      continue
    }
    let [_, ...captures] = match
    if (integerCaptures) {
      captures = captures.map(x => parseInt(x, 10))
    }
    return parse(from, ...captures)
  }
  return null
}

function test_parseShorthand() {
  const tests = [
    /* a */
    ['2020-07-24', '0', '2020-07-24'],
    ['2020-07-24', '1', '2020-07-25'],
    ['2020-07-24', '9', '2020-08-02'],
    /* b */
    ['2020-07-24', '1w', '2020-07-31'],
    ['2020-07-24', '2w', '2020-08-07'],
    /* c */
    ['2020-07-24', '1m', '2020-08-24'],
    ['2020-07-24', '2m', '2020-09-24'],
    ['2020-07-24', '6m', '2021-01-24'],
    ['2020-07-31', '2m', '2020-09-30'],
    /* d */
    ['2020-07-24', 'fr', '2020-07-31'],
    ['2020-07-24', 'sa', '2020-07-25'],
    ['2020-07-24', 'th', '2020-07-30'],
    /* e */
    ['2020-07-24', '25.', '2020-07-25'],
    ['2020-07-24', '24th', '2020-08-24'],
    ['2020-07-24', '23rd', '2020-08-23'],
    ['2020-08-31', '31.', null],
    ['2020-01-31', '30.', null],
    ['2020-01-31', '29.', '2020-02-29'],
    ['2021-01-31', '29.', null],
    /* f */
    ['2020-07-24', '07/26', '2020-07-26'],
    ['2020-07-24', '7/26', '2020-07-26'],
    ['2020-07-24', '7-26', '2020-07-26'],
    ['2020-07-24', '07/26', '2020-07-26'],
    ['2020-07-24', '7/2', '2021-07-02'],
    ['2020-07-24', '7/02', '2021-07-02'],
    ['2020-07-24', '3/9', '2021-03-09'],
    ['2020-07-24', '12/22', '2020-12-22'],
    /* g */
    ['2020-07-24', '2020-07-24', '2020-07-24'],
    ['2020-07-24', '2020-07-23', '2020-07-23'],
    ['2020-07-24', '2020-07-25', '2020-07-25'],
    ['2020-07-24', '2020-02-29', '2020-02-29'],
    ['2020-07-24', '2021-02-29', null],
    /* h */
    ['2020-07-24', 'jul 26', '2020-07-26'],
    ['2020-07-24', 'jul 2', '2021-07-02'],
    ['2020-07-24', 'jul 02', '2021-07-02'],
    ['2020-07-24', 'mar 9', '2021-03-09'],
    ['2020-07-24', 'dec 22', '2020-12-22'],
  ]

  for (let [from, input, expected] of tests) {
    let from_parsed = parseDate(from)
    let expected_parsed = parseDate(expected)
    let result = parseShorthand(input, from_parsed)
    console.assert(
      result?.getTime() === expected_parsed?.getTime(),
      `parsing ${input} on ${from}: expected ${expected}, got ${result}`
    )
  }
}

if (false) {
  test_parseShorthand()
}

