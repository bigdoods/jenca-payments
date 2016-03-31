var HttpHashRouter = require('http-hash-router')

var Version = require('./routes/version')
var Payments = require('./routes/payments')

module.exports = function(config){

  var router = HttpHashRouter();

  router.set('/v1/version', Version(config))

  var paymentHandlers = Payments(config)

  // fish out user id from headers
  router.set('/v1/payments', paymentHandlers.index)
  router.set('/v1/payments/:paymentid', paymentHandlers.show)


  function handler(req, res) {
    router(req, res, {}, onError);

    function onError(err) {
      if (err) {
        res.statusCode = err.statusCode || 500;
        res.end(err.message);
      }
    }
  }

  return {
    handler:handler
  }
}