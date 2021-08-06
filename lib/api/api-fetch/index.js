// https://github.com/Ethan-Arrowood/undici-fetch

'use strict'

const FetchHandler = require('./handler')
const Response = require('./response')
const Request = require('./request')
const { kState, kSignal } = require('./symbols')

const RedirectStatus = [301, 302, 303, 307, 308]

// https://fetch.spec.whatwg.org/#fetching

// https://fetch.spec.whatwg.org/#fetch-method
async function fetch (resource, init) {
  // 1. Let p be a new promise.

  // 2. Let requestObject be the result of invoking the initial value of
  // Request as constructor with input and init as arguments. If this throws
  // an exception, reject p with it and return p.
  const requestObject = new Request(resource, init)

  // 3. Let request be requestObject’s request.
  const request = requestObject[kState]

  // TODO: This is incorrect.
  request.client = this

  // 1. Let taskDestination be null.
  // TODO

  // 2. Let crossOriginIsolatedCapability be false.
  // TODO

  // 3. If request’s client is non-null, then:
  // TODO

  // 4. If useParallelQueue is true, then set taskDestination to the result of
  // starting a new parallel queue.

  // 5. Let timingInfo be a new fetch timing info whose start time and
  // post-redirect start time are the coarsened shared current time given
  // crossOriginIsolatedCapability.

  // 6. Let fetchParams be a new fetch params whose request is request, timing
  // info is timingInfo, process request body is processRequestBody,
  // process request end-of-body is processRequestEndOfBody, process response
  // is processResponse, process response end-of-body is
  // processResponseEndOfBody, process response done is processResponseDone,
  // task destination is taskDestination, and cross-origin isolated capability
  // is crossOriginIsolatedCapability.
  // TODO: signal is incorrect. How should we propagate signal?
  const fetchParams = { request, signal: requestObject[kSignal] }

  // 7. If request’s body is a byte sequence, then set request’s body to the
  // first return value of safely extracting request’s body.
  // TODO

  // 8. If request’s window is "client", then set request’s window to request’s
  // client, if request’s client’s global object is a Window object; otherwise
  // "no-window".
  // TODO

  // 9. If request’s origin is "client", then set request’s origin to request’s
  // client’s origin.
  // TODO

  // 10. If request’s policy container is "client", then:
  // TODO

  // 11. If request’s header list does not contain `Accept`, then:
  if (!requestObject.headers.has('accept')) {
    // 1. Let value be `*/*`.
    const value = '*/*'

    // 2. A user agent should set value to the first matching statement, if
    // any, switching on request’s destination:
    // "document"
    // "frame"
    // "iframe"
    // `text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8`
    // "image"
    // `image/png,image/svg+xml,image/*;q=0.8,*/*;q=0.5`
    // "style"
    // `text/css,*/*;q=0.1`

    // 3. Append `Accept`/value to request’s header list.
    requestObject.headers.set('accept', value)

    // 12. If request’s header list does not contain `Accept-Language`, then
    // user agents should append `Accept-Language`/an appropriate value to
    // request’s header list.
    if (!requestObject.headers.has('accept-language')) {
      requestObject.headers.set('accept-language', '*')
    }
  }

  // 13. If request’s priority is null, then use request’s initiator and
  // destination appropriately in setting request’s priority to a
  // user-agent-defined object.
  // TODO

  // 14. If request is a subresource request, then:
  // TODO

  // 15. Run main fetch given fetchParams.
  return mainFetch(fetchParams)
}

// https://fetch.spec.whatwg.org/#concept-main-fetch
function mainFetch (fetchParams) {
  return schemeFetch(fetchParams)
}

// https://fetch.spec.whatwg.org/#scheme-fetch
function schemeFetch (fetchParams) {
  const { request } = fetchParams

  const url = new URL(request.url)

  if (url.protocol === 'about:') {
    // TODO: Implement
    return Response.error()
  } else if (url.protocol === 'blob:') {
    // TODO: Implement
    return Response.error()
  } else if (url.protocol === 'data:') {
    // TODO: Implement
    return Response.error()
  } else if (url.protocol === 'file:') {
    // TODO: Implement
    return Response.error()
  } else if (url.protocol === 'http:') {
    return httpFetch(fetchParams)
  } else if (url.protocol === 'https:') {
    return httpFetch(fetchParams)
  } else {
    return Response.error()
  }
}

// https://fetch.spec.whatwg.org/#http-fetch
async function httpFetch (fetchParams) {
  // 1. Let request be fetchParams’s request.
  const request = fetchParams.request

  // 2. Let response be null.
  let response = null

  // 3. Let actualResponse be null.
  let actualResponse = null

  // 4. Let timingInfo be fetchParams’s timing info.
  // TODO

  // 5. If request’s service-workers mode is "all", then:
  // TODO

  // 6. If response is null, then:
  if (response === null) {
    // 1. If makeCORSPreflight is true and one of these conditions is true:
    // TODO

    // 2. If request’s redirect mode is "follow", then set request’s
    // service-workers mode to "none".
    // TODO

    // 3. Set response and actualResponse to the result of running
    // HTTP-network-or-cache fetch given fetchParams.
    actualResponse = response = await httpNetworkOrCacheFetch(fetchParams)

    // 4. If request’s response tainting is "cors" and a CORS check
    // for request and response returns failure, then return a network error.
    // TODO

    // 5. If the TAO check for request and response returns failure, then set
    // request’s timing allow failed flag.
    // TODO
  }

  // 7. If either request’s response tainting or response’s type
  // is "opaque", and the cross-origin resource policy check with
  // request’s origin, request’s client, request’s destination,
  // and actualResponse returns blocked, then return a network error.
  // TODO

  // 8. If actualResponse’s status is a redirect status, then:
  if (RedirectStatus.includes(actualResponse.status)) {
    // 1. If actualResponse’s status is not 303, request’s body is not null,
    // and the connection uses HTTP/2, then user agents may, and are even
    // encouraged to, transmit an RST_STREAM frame.

    // 2. Switch on request’s redirect mode:
    // TODO: What do we do with actualResponse? Do we kill it?
    if (request.redirect === 'follow') {
      response = await httpRedirectFetch(fetchParams)
    } else if (request.redirect === 'manual') {
      response = new Response(null, { status: 0 })
      response[kState].type = 'opaqueredirect'
      response[kState].urlList = [this.url]
      response = Response.error()
    } else {
      response = Response.error()
    }
  }

  // 9. Set response’s timing info to timingInfo.
  // TODO

  // 10. Return response.
  return response
}

// https://fetch.spec.whatwg.org/#http-redirect-fetch
function httpRedirectFetch (fetchParams) {
  // TODO
  return Response.error()
}

// https://fetch.spec.whatwg.org/#http-network-or-cache-fetch
function httpNetworkOrCacheFetch (fetchParams) {
  return httpNetworkFetch(fetchParams)
}

// https://fetch.spec.whatwg.org/#http-network-fetch
function httpNetworkFetch (fetchParams) {
  const { request, signal } = fetchParams

  const url = new URL(request.url)

  let body = null
  if (request.body) {
    // TODO (fix): Do we need to lock the Request stream and if
    // so do we need to do it immediatly?

    if (request.body.source) {
      // We can bypass stream and use source directly
      // since Request already should have locked the
      // source stream thus making it "unusable" for
      // anyone else.
      body = request.body.source
    } else {
      body = request.body.stream
    }
  }

  return new Promise((resolve, reject) => request.client.dispatch({
    path: url.pathname + url.search,
    origin: url.origin,
    method: request.method,
    body,
    headers: request.headersList,
    signal,
    maxRedirections: 0
  }, new FetchHandler(request, (err, res) => {
    if (err) {
      reject(err)
    } else {
      resolve(res)
    }
  })))
}

module.exports = fetch
