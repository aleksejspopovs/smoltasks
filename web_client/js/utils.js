export function* enumerate(iterator, start=0) {
  let i = start
  for (let item of iterator) {
    yield [i++, item]
  }
}

export function partition(list, ...predicates) {
  let results = []
  for (let i = 0; i < predicates.length + 1; i++) {
    results.push([])
  }

  for (let element of list) {
    let destination = predicates.length

    for (let [i, pred] of enumerate(predicates)) {
      if (pred(element)) {
        destination = i
        break
      }
    }

    results[destination].push(element)
  }

  return results
}
