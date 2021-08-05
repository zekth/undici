/* globals AbortController */

'use strict'

const { METHODS } = require('http')
const { extractBody, Body, cloneBody } = require('./body')
const { Headers, fill: fillHeaders } = require('./headers')
const util = require('../../core/util')
const { kEnumerableProperty } = util
const {
  kHeaders,
  kSignal,
  kState
} = require('./symbols')
const { kHeadersList } = require('../../core/symbols')

const ReferrerPolicy = [
  '',
  'no-referrer',
  'no-referrer-when-downgrade',
  'same-origin',
  'origin',
  'strict-origin',
  'origin-when-cross-origin',
  'strict-origin-when-cross-origin',
  'unsafe-url'
]

const RequestRedirect = [
  'follow',
  'manual',
  'error'
]

const RequestMode = [
  'navigate',
  'same-origin',
  'no-cors',
  'cors'
]

const RequestCredentials = [
  'omit',
  'same-origin',
  'include'
]

const RequestCache = [
  'default',
  'no-store',
  'reload',
  'no-cache',
  'force-cache',
  'only-if-cached'
]

let TransformStream

const kInit = Symbol('init')

// https://fetch.spec.whatwg.org/#request-class
// TODO: Is extending Body spec compliant?
class Request extends Body {
  // https://fetch.spec.whatwg.org/#dom-request
  constructor (input, init = {}) {
    super()

    if (input === kInit) {
      this[kState] = init
      this[kHeaders] = new Headers()
      this[kHeaders][kHeadersList] = init.headersList
      return
    }

    if (typeof input !== 'string' && !(input instanceof Request)) {
      throw new TypeError(`'input' option '${input}' is not a valid value of RequestInfo`)
    }

    // 1. Let request be null.
    let request = null

    // 2. Let fallbackMode be null.
    let fallbackMode = null

    // 3. Let baseURL be this’s relevant settings object’s API base URL.
    // ???

    // 4. Let signal be null.
    let signal = null

    // 5. If input is a string, then:
    if (typeof input === 'string') {
      // 1. Let parsedURL be the result of parsing input with baseURL.
      const parsedUrl = new URL(input).href

      // 2. If parsedURL is failure, then throw a TypeError.

      // 3. If parsedURL includes credentials, then throw a TypeError.

      // 4. Set request to a new request whose URL is parsedURL.
      request = {
        url: parsedUrl,
        method: 'GET',
        mode: null,
        integrity: '',
        redirect: 'follow',
        credentials: null,
        cache: null,
        referrer: null,
        referrerPolicy: null,
        keepalive: false,
        headersList: [],
        body: null
      }

      // 5. Set fallbackMode to "cors".
      fallbackMode = 'cors'
    } else if (input instanceof Request) {
      signal = input[kSignal]
      request = input[kState]
    }

    // 7. Let origin be this’s relevant settings object’s origin.
    // ???

    // 8. Let window be "client".
    let window = 'client'

    // 9. If request’s window is an environment settings object and its origin
    // is same origin with origin, then set window to request’s window.
    // ???

    // 10. If init["window"] exists and is non-null, then throw a TypeError.
    if ('window' in init && window !== null) {
      throw new TypeError(`'window' option '${window}' must be null`)
    }

    // 11. If init["window"] exists, then set window to "no-window".
    if ('window' in init) {
      window = 'no-window'

      if (window !== null) {
        throw new TypeError(`'window' option '${window}' must be null`)
      }
    }

    // 12. Set request to a new request with the following properties:
    request = {
      url: request.url,
      method: request.method,
      headersList: [...request.headersList],
      // TODO: unsafe-request flag set?
      // TODO: This’s relevant settings object?
      window,
      // TODO: priority?
      origin: 'client',
      referrer: request.referrer,
      referrerPolicy: request.referrerPolicy,
      mode: request.mode,
      credentials: request.credentials,
      cache: request.cache,
      redirect: request.redirect,
      integrity: request.integrity,
      keepalive: request.keepalive
      // reload-navigation flag: noop
      // history-navigation flag: noop
    }

    // 13. If init is not empty, then:
    if (Object.keys(init).length > 0) {
      // 1. If request’s mode is "navigate", then set it to "same-origin".
      if (request.mode === 'navigte') {
        request.mode = 'same-origin'
      }

      // 2. Unset request’s reload-navigation flag.
      // Noop

      // 3. Unset request’s history-navigation flag.
      // Noop

      // 4. Set request’s referrer to "client"
      request.referrer = 'client'

      // 5. Set request’s referrer policy to the empty string.
      request.referrerPolicy = ''
    }

    // 14. If init["referrer"] exists, then:
    if ('referrer' in init) {
      // 1. Let referrer be init["referrer"].
      const referrer = init.referrer

      // 2. If referrer is the empty string, then set request’s referrer to "no-referrer".
      if (!referrer === '') {
        request.referrer = 'no-referrer'
      } else {
        if (typeof referrer !== 'string') {
          throw new TypeError(`'referrer' option '${referrer}' is not a valid value of string`)
        }

        // TODO: Implement.
        // 1. Let parsedReferrer be the result of parsing referrer with
        // baseURL.
        // 2. If parsedReferrer is failure, then throw a TypeError.
        // 3. If one of the following is true
        // parsedReferrer’s cannot-be-a-base-URL is true, scheme is "about",
        // and path contains a single string "client"
        // parsedReferrer’s origin is not same origin with origin
        // then set request’s referrer to "client".
        // 4. Otherwise, set request’s referrer to parsedReferrer.
      }
    }

    // 15. If init["referrerPolicy"] exists, then set request’s referrer policy
    //  to it.
    if ('referrerPolicy' in init) {
      request.referrerPolicy = init.referrerPolicy
      if (!ReferrerPolicy.includes(request.referrerPolicy)) {
        throw new TypeError(`'referrer' option '${request.referrerPolicy}' is not a valid value of ReferrerPolicy`)
      }
    }

    // 16. Let mode be init["mode"] if it exists, and fallbackMode otherwise.
    let mode
    if ('mode' in init) {
      mode = init.mode
      if (!RequestMode.includes(mode)) {
        throw new TypeError(`'mode' option '${mode}' is not a valid value of RequestMode`)
      }
    } else {
      mode = fallbackMode
    }

    // 17. If mode is "navigate", then throw a TypeError.
    if (mode === 'navigate') {
      throw new TypeError()
    }

    // 18. If mode is non-null, set request’s mode to mode.
    if (mode != null) {
      request.mode = mode
    }

    // 19. If init["credentials"] exists, then set request’s credentials mode
    // to it.
    if ('credentials' in init) {
      request.credentials = init.credentials
      if (!RequestCredentials.includes(request.credentials)) {
        throw new TypeError(`'credentials' option '${request.credentials}' is not a valid value of RequestCredentials`)
      }
    }

    // 18. If init["cache"] exists, then set request’s cache mode to it.
    if ('cache' in init) {
      request.cache = init.cache
      if (!RequestCache.includes(request.cache)) {
        throw new TypeError(`'cache' option '${request.cache}' is not a valid value of RequestCache`)
      }
    }

    // 21. If request’s cache mode is "only-if-cached" and request’s mode is
    // not "same-origin", then throw a TypeError.
    if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') {
      throw new TypeError()
    }

    // 22. If init["redirect"] exists, then set request’s redirect mode to it.
    if ('redirect' in init) {
      request.redirect = init.redirect
      if (!RequestRedirect.includes(request.redirect)) {
        throw new TypeError(`'redirect' option '${request.redirect}' is not a valid value of RequestRedirect`)
      }
    }

    // 23. If init["integrity"] exists, then set request’s integrity metadata to it.
    if ('integrity' in init) {
      request.integrity = init.integrity
      if (typeof request.integrity !== 'string') {
        throw new TypeError(`'integrity' option '${request.integrity}' is not a valid value of string`)
      }
    }

    // 24. If init["keepalive"] exists, then set request’s keepalive to it.
    if ('keepalive' in init) {
      request.keepalive = init.keepalive
      if (typeof request.keepalive !== 'boolean') {
        throw new TypeError(`'keepalive' option '${request.keepalive}' is not a valid value of boolean`)
      }
    }

    // 25. If init["method"] exists, then:
    if ('method' in init) {
      // 1. Let method be init["method"].
      let method = init.method

      // 2. If method is not a method or method is a forbidden method, then
      // throw a TypeError.
      if (typeof init.method !== 'string') {
        throw TypeError(`Request method: ${init.method} must be type 'string'`)
      }

      if (METHODS.indexOf(method.toUpperCase()) === -1) {
        throw Error(`Normalized request init.method: ${method} must be one of ${METHODS.join(', ')}`)
      }

      // 3. Normalize method.
      method = init.method.toUpperCase()

      // 4. Set request’s method to method.
      request.method = method
    }

    // 26. If init["signal"] exists, then set signal to it.
    if ('signal' in init) {
      signal = init.signal
    }

    // 27. Set this’s request to request.
    this[kState] = request

    // 28. Set this’s signal to a new AbortSignal object with this’s relevant
    // Realm.
    // TODO: relevant Realm?
    const ac = new AbortController()
    this[kSignal] = ac.signal

    // 29. If signal is not null, then make this’s signal follow signal.
    if (signal != null) {
      if (
        typeof signal.aborted !== 'boolean' &&
        typeof signal.addEventListener !== 'function') {
        throw new TypeError(`'signal' option '${signal}' is not a valid value of AbortSignal`)
      }

      if (signal.aborted) {
        ac.abort()
      } else {
        signal.addEventListener('abort', function () {
          ac.abort()
        })
      }
    }

    // 30. Set this’s headers to a new Headers object with this’s relevant
    // Realm, whose header list is request’s header list and guard is
    // "request".
    // TODO: relevant Realm?
    // TODO: header guard?
    this[kHeaders] = new Headers()
    this[kHeaders][kHeadersList] = request.headersList

    // 31. If this’s request’s mode is "no-cors", then:
    if (mode === 'no-cors') {
      // 1. If this’s request’s method is not a CORS-safelisted method,
      // then throw a TypeError.
      // TODO
      // 2. Set this’s headers’s guard to "request-no-cors".
      // TODO
    }

    // 32. If init is not empty, then:
    if (Object.keys(init).length !== 0) {
      // 1. Let headers be a copy of this’s headers and its associated header
      // list.
      let headers = new Headers(this.headers)
      // 2. If init["headers"] exists, then set headers to init["headers"].
      if ('headers' in init) {
        headers = init.headers
      }
      // TODO
      // 3. Empty this’s headers’s header list.
      this[kState].headersList = []
      this[kHeaders][kHeadersList] = this[kState].headersList
      // 4. If headers is a Headers object, then for each header in its header
      //  list, append header’s name/header’s value to this’s headers.
      // 5. Otherwise, fill this’s headers with headers.
      fillHeaders(this[kHeaders], headers)
    }

    // 33. Let inputBody be input’s request’s body if input is a Request
    // object; otherwise null.
    const inputBody = input instanceof Request ? input[kState].body : null

    // 34. If either init["body"] exists and is non-null or inputBody is
    // non-null, and request’s method is `GET` or `HEAD`, then throw a
    // TypeError.
    if (
      (('body' in init && init != null) || inputBody != null) &&
      (request.method === 'GET' || request.method === 'HEAD')
    ) {
      throw new TypeError()
    }

    // 35. Let initBody be null.
    let initBody = null

    // 36. If init["body"] exists and is non-null, then:
    if ('body' in init && init != null) {
      // 1. Let Content-Type be null.
      // 2. Set initBody and Content-Type to the result of extracting
      // init["body"], with keepalive set to request’s keepalive.
      const [extractedBody, contentType] = extractBody(init.body)
      initBody = extractedBody

      // 3, If Content-Type is non-null and this’s headers’s header list does
      // not contain `Content-Type`, then append `Content-Type`/Content-Type to
      // this’s headers.
      if (contentType && !this[kHeaders].has('content-type')) {
        this[kHeaders].append('content-type', contentType)
      }
    }

    // 37. Let inputOrInitBody be initBody if it is non-null; otherwise
    // inputBody.
    const inputOrInitBody = initBody ?? inputBody

    // 38. If inputOrInitBody is non-null and inputOrInitBody’s source is
    // null, then:
    if (inputOrInitBody != null && inputOrInitBody.source == null) {
      // 1. If this’s request’s mode is neither "same-origin" nor "cors",
      // then throw a TypeError.
      if (request.mode !== 'same-origin' && request.mode !== 'cors') {
        throw new TypeError()
      }

      // 2. Set this’s request’s use-CORS-preflight flag.
      // ???
    }

    // 39. Let finalBody be inputOrInitBody.
    let finalBody = inputOrInitBody

    // 40. If initBody is null and inputBody is non-null, then:
    if (initBody == null && inputBody != null) {
      // 1. If input is unusable, then throw a TypeError.
      if (util.isDisturbed(inputBody.stream) || inputBody.stream.locked) {
        throw new TypeError('unusable')
      }

      // 2. Set finalBody to the result of creating a proxy for inputBody.
      if (!TransformStream) {
        TransformStream = require('stream/web').TransformStream
      }

      // https://streams.spec.whatwg.org/#readablestream-create-a-proxy
      const identityTransform = new TransformStream()
      inputBody.stream.pipeThrough(identityTransform)
      finalBody = {
        source: inputBody.source,
        length: inputBody.length,
        stream: identityTransform.readable
      }
    }

    // 41. Set this’s request’s body to finalBody.
    this[kState].body = finalBody
  }

  get [Symbol.toStringTag] () {
    return this.constructor.name
  }

  toString () {
    return Object.prototype.toString.call(this)
  }

  get method () {
    return this[kState].method
  }

  get url () {
    return this[kState].url
  }

  get headers () {
    return this[kHeaders]
  }

  get destination () {
    return ''
  }

  get referrer () {
    return this[kState].referrer
  }

  get referrerPolicy () {
    return this[kState].referrerPolicy
  }

  get mode () {
    return this[kState].mode
  }

  get credentials () {
    return this[kState].credentials
  }

  get cache () {
    return this[kState].cache
  }

  get redirect () {
    return this[kState].redirect
  }

  get integrity () {
    return this[kState].integrity
  }

  get keepalive () {
    return this[kState].keepalive
  }

  get isReloadNavigation () {
    return false
  }

  get isHistoryNavigation () {
    return false
  }

  get signal () {
    return this[kSignal]
  }

  clone () {
    // 1. If this is unusable, then throw a TypeError.
    if (this.bodyUsed || (this.body && this.body.locked)) {
      throw new TypeError()
    }

    // 2. Let clonedRequest be the result of cloning this’s request.
    const { body, ...state } = this[kState]
    const clonedRequest = JSON.parse(JSON.stringify(state))
    clonedRequest.body = cloneBody(body)

    // 3. Let clonedRequestObject be the result of creating a Request object,
    // given clonedRequest, this’s headers’s guard, and this’s relevant Realm.
    // TODO: headers's guard?
    // TODO: relevant Realm?
    const clonedRequestObject = new Request(kInit, clonedRequest)

    // 4. Make clonedRequestObject’s signal follow this’s signal.
    const ac = new AbortController()
    if (this.signal.aborted) {
      ac.abort()
    } else {
      this.signal.addEventListener('abort', function () {
        ac.abort()
      })
    }
    clonedRequestObject[kSignal] = ac.signal

    // 4. Return clonedRequestObject.
    return clonedRequestObject
  }
}

Object.defineProperties(Request.prototype, {
  method: kEnumerableProperty,
  url: kEnumerableProperty,
  headers: kEnumerableProperty,
  redirect: kEnumerableProperty,
  clone: kEnumerableProperty,
  signal: kEnumerableProperty
})

module.exports = Request
