'use strict'

const { Blob } = require('buffer')
const { kState } = require('./symbols')
const { File } = require('./file')
const { HTMLFormElement } = require('./util')

class FormData {
  constructor (...args) {
    if (args.length > 0 && !(args[0] instanceof HTMLFormElement)) {
      throw new TypeError(
        "Failed to construct 'FormData': parameter 1 is not of type 'HTMLFormElement'"
      )
    }

    this[kState] = []
  }

  append (...args) {
    if (!(this instanceof FormData)) {
      throw new TypeError('Illegal invocation')
    }
    if (args.length < 2) {
      throw new TypeError(
        `Failed to execute 'append' on 'FormData': 2 arguments required, but only ${args.length} present.`
      )
    }
    if (args.length === 3 && !(args[1] instanceof Blob)) {
      throw new TypeError(
        "Failed to execute 'append' on 'FormData': parameter 2 is not of type 'Blob'"
      )
    }
    const name = String(args[0])
    const filename = args.length === 3 ? String(args[2]) : undefined

    // 1. Let value be value if given; otherwise blobValue.
    const value = args[1] instanceof Blob ? args[1] : String(args[1])

    // 2. Let entry be the result of creating an entry with
    // name, value, and filename if given.
    const entry = makeEntry(name, value, filename)

    // 3. Append entry to this’s entry list.
    this[kState].push(entry)
  }

  delete (...args) {
    if (!(this instanceof FormData)) {
      throw new TypeError('Illegal invocation')
    }
    if (args.length < 1) {
      throw new TypeError(
        `Failed to execute 'delete' on 'FormData': 1 arguments required, but only ${args.length} present.`
      )
    }
    const name = String(args[0])

    // The delete(name) method steps are to remove all entries whose name
    // is name from this’s entry list.
    const next = []
    for (const entry of this[kState]) {
      if (entry.name !== name) {
        next.push(entry)
      }
    }

    this[kState] = next
  }

  get (...args) {
    if (!(this instanceof FormData)) {
      throw new TypeError('Illegal invocation')
    }
    if (args.length < 1) {
      throw new TypeError(
        `Failed to execute 'get' on 'FormData': 1 arguments required, but only ${args.length} present.`
      )
    }
    const name = String(args[0])

    // 1. If there is no entry whose name is name in this’s entry list,
    // then return null.
    const idx = this[kState].findIndex((entry) => entry.name === name)
    if (idx === -1) {
      return null
    }

    // 2. Return the value of the first entry whose name is name from
    // this’s entry list.
    return this[kState][idx].value
  }

  getAll (...args) {
    if (!(this instanceof FormData)) {
      throw new TypeError('Illegal invocation')
    }
    if (args.length < 1) {
      throw new TypeError(
        `Failed to execute 'getAll' on 'FormData': 1 arguments required, but only ${args.length} present.`
      )
    }
    const name = String(args[0])

    // 1. If there is no entry whose name is name in this’s entry list,
    // then return the empty list.
    // 2. Return the values of all entries whose name is name, in order,
    // from this’s entry list.
    return this[kState]
      .filter((entry) => entry.name === name)
      .map((entry) => entry.value)
  }

  has (...args) {
    if (!(this instanceof FormData)) {
      throw new TypeError('Illegal invocation')
    }
    if (args.length < 1) {
      throw new TypeError(
        `Failed to execute 'has' on 'FormData': 1 arguments required, but only ${args.length} present.`
      )
    }
    const name = String(args[0])

    // The has(name) method steps are to return true if there is an entry
    // whose name is name in this’s entry list; otherwise false.
    return this[kState].findIndex((entry) => entry.name === name) !== -1
  }

  set (...args) {
    if (!(this instanceof FormData)) {
      throw new TypeError('Illegal invocation')
    }
    if (args.length < 2) {
      throw new TypeError(
        `Failed to execute 'set' on 'FormData': 2 arguments required, but only ${args.length} present.`
      )
    }
    if (args.length === 3 && !(args[1] instanceof Blob)) {
      throw new TypeError(
        "Failed to execute 'set' on 'FormData': parameter 2 is not of type 'Blob'"
      )
    }
    const name = String(args[0])
    const filename = args.length === 3 ? String(args[2]) : undefined

    // The set(name, value) and set(name, blobValue, filename) method steps
    // are:

    // 1. Let value be value if given; otherwise blobValue.
    const value = args[1] instanceof Blob ? args[1] : String(args[1])

    // 2. Let entry be the result of creating an entry with name, value, and
    // filename if given.
    const entry = makeEntry(name, value, filename)

    // 3. If there are entries in this’s entry list whose name is name, then
    // replace the first such entry with entry and remove the others.
    const idx = this[kState].findIndex((entry) => entry.name === name)
    if (idx !== -1) {
      this[kState][idx] = entry
      this[kState] = this[kState].filter((entry) => entry.name !== name)
    } else {
      // 4. Otherwise, append entry to this’s entry list.
      this[kState].push(entry)
    }
  }

  * [Symbol.iterator] () {
    if (!(this instanceof FormData)) {
      throw new TypeError('Illegal invocation')
    }
    // The value pairs to iterate over are this’s entry list’s entries with
    // the key being the name and the value being the value.
    for (const { name, value } of this[kState]) {
      yield [name, value]
    }
  }
}

function makeEntry (name, value, filename) {
  // To create an entry for name, value, and optionally a filename, run these
  // steps:

  // 1. Let entry be a new entry.
  const entry = {
    name: null,
    value: null
  }

  // 2. Set entry’s name to name.
  entry.name = name

  // 3. If value is a Blob object and not a File object, then set value to a new File
  // object, representing the same bytes, whose name attribute value is "blob".
  if (value instanceof Blob && !(value instanceof File)) {
    value = new File([value], 'blob')
  }

  // 4. If value is (now) a File object and filename is given, then set value to a
  // new File object, representing the same bytes, whose name attribute value is
  // filename.
  // TODO: This is a bit weird... What if passed value is a File?
  // Do we just override the name attribute? Since it says "if value is (now)"
  // does that mean that this lives inside the previous condition? In which case
  // creating one more File instance doesn't make much sense....
  if (value instanceof File && filename) {
    value = new File([value], filename)
  }

  // 5. Set entry’s value to value.
  entry.value = value

  // 6. Return entry.
  return entry
}

module.exports = { FormData: globalThis.FormData ?? FormData }
