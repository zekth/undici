'use strict'

const { kState } = require('./symbols')
const { AbortError } = require('../../core/errors')
const { STATUS_CODES } = require('http')
const { Headers } = require('./headers')
const Response = require('./response')

let ReadableStream

class FetchHandler {
  constructor (context, request, callback) {
    this.context = context
    this.callback = callback
    this.controller = null

    this.abort = null
    this.redirect = request.redirect
    this.url = request.url
  }

  onConnect (abort) {
    if (!this.callback) {
      throw new AbortError()
    }

    if (this.context.aborted) {
      abort()
    } else {
      this.context.abort = abort
    }
  }

  onHeaders (statusCode, headers, resume) {
    const { callback, abort } = this

    if (statusCode < 200) {
      return
    }

    headers = new Headers(headers)

    const self = this
    if (!ReadableStream) {
      ReadableStream = require('stream/web').ReadableStream
    }

    const response = new Response(new ReadableStream({
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
    response[kState].urlList.push(this.url)

    this.callback = null
    callback(null, response[kState])

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

    controller.close()
  }

  onError (err) {
    const { controller, callback } = this

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
