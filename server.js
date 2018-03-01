var http = require('http')
var log = require('pino')()
var twilio = require('twilio')
var url = require('url')

var servers
var twilioClient

try {
  twilioClient = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_TOKEN
  )
} catch (error) {
  log.error(error)
}

function fetchServers () {
  twilioClient.tokens.create({}, function (error, token) {
    if (error) return log.error(error)
    if (!token.iceServers) return log.error('missing ICE servers')
    servers = token.iceServers.map(function (server) {
      if (server.url !== null) {
        server.urls = server.url
        delete server.url
      }
      return server
    })
    log.info(servers, 'servers')
  })
}

var FOUR_HOURS = 4 * 60 * 60 * 1000

if (twilioClient) {
  setInterval(fetchServers, FOUR_HOURS).unref()
  fetchServers()
} else {
  log.error('no Twilio client')
}

var VALID_ORIGIN = /^https?:\/\/localhost(:|$)/

http.createServer()
  .on('request', function (request, response) {
    var parsed = url.parse(request.url)
    if (parsed.pathname === '/_servers') {
      var origin = request.headers.origin
      if (VALID_ORIGIN.test(origin)) {
        response.setHeader('Content-Type', 'application/json')
        response.end(JSON.stringify(servers))
      } else {
        response.setStatus = 500
        response.end()
      }
    } else {
      response.setStatus = 404
      response.end()
    }
  })
  .listen(
    process.env.PORT || 8080,
    function () {
      var port = this.address().port
      log.info({port}, 'listening')
    }
  )
