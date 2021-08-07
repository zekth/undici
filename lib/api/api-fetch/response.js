'use strict'

const { Headers, fill } = require('./headers')
const { extractBody, cloneBody, Body } = require('./body')
const {
  NotSupportedError
} = require('../../core/errors')
const util = require('../../core/util')
const { kEnumerableProperty } = util

const {
  kInit,
  kState,
  kUrlList,
  kHeaders
} = require('./symbols')
const { kHeadersList } = require('../../core/symbols')

// https://fetch.spec.whatwg.org/#response-class
// TODO: Is extending Body spec compliant?
class Response extends Body {
  static error () {
    // The static error() method steps are to return the result of creating a
    // Response object, given a new network error, "immutable", and this’s
    // relevant Realm.
    const response = new Response()
    response[kState].type = 'error'
    response[kState].status = 0
    return response
  }

  static redirect (url, status = 302) {
    throw new NotSupportedError()
    // 1. Let parsedURL be the result of parsing url with current settings
    // object’s API base URL.
    // TODO
    // 2. If parsedURL is failure, then throw a TypeError.
    // TODO
    // 3. If status is not a redirect status, then throw a RangeError.
    // TODO
    // 4. Let responseObject be the result of creating a Response object,
    // given a new response, "immutable", and this’s relevant Realm.
    // TODO
    // 5. Set responseObject’s response’s status to status.
    // TODO
    // 6. Let value be parsedURL, serialized and isomorphic encoded.
    // TODO
    // 7. Append `Location`/value to responseObject’s response’s header list.
    // TODO
    // 8. Return responseObject.
  }

  // https://fetch.spec.whatwg.org/#dom-response
  constructor (body = null, init = {}) {
    super()

    if (body === kInit) {
      this[kState] = init
      this[kHeaders] = new Headers()
      this[kHeaders][kHeadersList] = this[kState].headersList
      return
    }

    // 1. If init["status"] is not in the range 200 to 599, inclusive, then
    // throw a RangeError.
    if ('status' in init) {
      if (!Number.isFinite(init.status)) {
        throw new TypeError()
      }

      if (init.status < 200 || init.status > 599) {
        throw new RangeError()
      }
    }

    if ('statusText' in init) {
      if (typeof init.statusText !== 'string') {
        throw new TypeError()
      }

      // 2. If init["statusText"] does not match the reason-phrase token
      // production, then throw a TypeError.
      // See, https://datatracker.ietf.org/doc/html/rfc7230#section-3.1.2:
      //   reason-phrase  = *( HTAB / SP / VCHAR / obs-text )
      // TODO
    }

    // 3. Set this’s response to a new response.
    this[kState] = {
      status: 200,
      statusText: '',
      headersList: [],
      type: 'default',
      urlList: Array.isArray(init[kUrlList])
        ? init[kUrlList]
        : (init[kUrlList] ? [init[kUrlList]] : [])
    }

    // 4. Set this’s headers to a new Headers object with this’s relevant
    // Realm, whose header list is this’s response’s header list and guard
    // is "response".
    // TODO: relevant Realm?
    // TODO: header guard?
    this[kHeaders] = new Headers()
    this[kHeaders][kHeadersList] = this[kState].headersList

    // 5. Set this’s response’s status to init["status"].
    if ('status' in init) {
      this[kState].status = init.status
    }

    // 6. Set this’s response’s status message to init["statusText"].
    if ('statusText' in init) {
      this[kState].statusText = init.statusText
    }

    // 7. If init["headers"] exists, then fill this’s headers with init["headers"].
    if ('headers' in init) {
      fill(this[kHeaders], init.headers)
    }

    // 8. If body is non-null, then:
    if (body != null) {
      // 1. If init["status"] is a null body status, then throw a TypeError.
      // A null body status is a status that is 101, 204, 205, or 304.
      // TODO
      // if ([101, 204, 205, 304].includes(init.status)) {
      //   throw new TypeError()
      // }

      // 2. Let Content-Type be null.
      // 3. Set this’s response’s body and Content-Type to the result of
      // extracting body.
      const [extractedBody, contentType] = extractBody(body)
      this[kState].body = extractedBody

      // 4. If Content-Type is non-null and this’s response’s header list does
      //  not contain `Content-Type`, then append `Content-Type`/Content-Type
      // to this’s response’s header list.
      if (contentType && !this.headers.has('content-type')) {
        this.headers.set('content-type', contentType)
      }
    }
  }

  get [Symbol.toStringTag] () {
    return this.constructor.name
  }

  toString () {
    return Object.prototype.toString.call(this)
  }

  get type () {
    return this[kState].type
  }

  get url () {
    const urlList = this[kState].urlList
    const length = urlList.length
    return length === 0 ? '' : urlList[length - 1].toString()
  }

  get redirected () {
    return this[kState].urlList.length > 1
  }

  get status () {
    return this[kState].status
  }

  get ok () {
    return this[kState].status >= 200 && this[kState].status <= 299
  }

  get statusText () {
    return this[kState].statusText
  }

  get headers () {
    return this[kHeaders]
  }

  clone () {
    // 1. If this is unusable, then throw a TypeError.
    if (this.bodyUsed || (this.body && this.body.locked)) {
      throw new TypeError()
    }

    // 2. Let clonedResponse be the result of cloning this’s response.
    const { body, ...state } = this[kState]
    const clonedResponse = JSON.parse(JSON.stringify(state))
    clonedResponse.body = cloneBody(body)

    // 3. Return the result of creating a Response object, given
    // clonedResponse, this’s headers’s guard, and this’s relevant Realm.
    const clonedResponseObject = new Response(kInit, clonedResponse)

    return clonedResponseObject
  }
}

Object.defineProperties(Response.prototype, {
  type: kEnumerableProperty,
  url: kEnumerableProperty,
  status: kEnumerableProperty,
  ok: kEnumerableProperty,
  redirected: kEnumerableProperty,
  statusText: kEnumerableProperty,
  headers: kEnumerableProperty,
  clone: kEnumerableProperty
})

module.exports = Response
