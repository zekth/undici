'use strict'

const { addSignal, removeSignal } = require('../abort-signal')
const { kState } = require('./symbols')
const { AbortError } = require('../../core/errors')
const { STATUS_CODES } = require('http')
const { Headers } = require('./headers')
const Response = require('./response')

let ReadableStream

class FetchHandler {
  constructor (request, callback) {
    this.callback = callback
    this.controller = null

    this.abort = null
    this.context = null
    this.redirect = request.redirect
    this.url = request.url

    addSignal(this, request.signal)
  }

  onConnect (abort, context) {
    if (!this.callback) {
      throw new AbortError()
    }

    this.abort = abort
    this.context = context
  }

  onHeaders (statusCode, headers, resume) {
    const { callback, abort, context } = this

    if (statusCode < 200) {
      return
    }

    headers = new Headers(headers)

    let response
    if (headers.has('location')) {
      if (this.redirect === 'manual') {
        response = new Response(null, { status: 0 })
        response[kState].type = 'opaqueredirect'
        response[kState].urlList = [this.url]
      } else {
        response = Response.error()
      }
    } else {
      const self = this
      if (!ReadableStream) {
        ReadableStream = require('stream/web').ReadableStream
      }
      response = new Response(new ReadableStream({
        async start (controller) {
          self.controller = controller
        },
        async pull () {
          resume()
        },
        async cancel (reason) {
          let err
          if (reason instanceof Error) {
            err = reason
          } else if (typeof reason === 'string') {
            err = new Error(reason)
          } else {
            err = new AbortError()
          }
          abort(err)
        }
      }, { highWaterMark: 16384 }), {
        status: statusCode,
        statusText: STATUS_CODES[statusCode],
        headers
      })
      response[kState].urlList = [this.url, ...((context && context.history) || [])]
    }

    this.callback = null
    callback(null, response)

    return false
  }

  onData (chunk) {
    const { controller } = this

    // Copy the Buffer to detach it from Buffer pool.
    // TODO: Is this required?
    chunk = new Uint8Array(chunk)

    controller.enqueue(chunk)

    return controller.desiredSize > 0
  }

  onComplete () {
    const { controller } = this

    removeSignal(this)

    controller.close()
  }

  onError (err) {
    const { controller, callback } = this

    removeSignal(this)

    if (callback) {
      this.callback = null
      callback(err)
    }

    if (controller) {
      this.controller = null
      controller.error(err)
    }
  }
}

module.exports = FetchHandler
