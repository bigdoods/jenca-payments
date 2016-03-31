var tape = require("tape")
var async = require("async")
var Router = require("./router")
var database = require("./database")
var datastore = require("./storage/"+ database.test.driver)
var path = require("path")
var http = require("http")
var from2 = require("from2-string")
var hyperquest = require("hyperquest")
var hyperrequest = require("hyperrequest")
var concat = require("concat-stream")

var jenca_user_id = "banana-man"
var testing_port = 8060
var subject_payment_index = 5


/*

  boot a test server for each test so the state from one
  does not affect another test

*/
function createServer(done){

  // keep the storage in memory for the tests
  var router = Router({
    datafile:':memory'
  })
  var server = http.createServer(router.handler)
  server.listen(testing_port, function(err){
    done(err, server)
  })
}

/*

  make a list of N payments

*/
function getPaymentData(count){

  count = count || 10;

  var paymentData = []
  for(i=1;i<=count;i++){
    paymentData.push({
      description:"Testing Payment "+i
    })
  }
  return paymentData
}

/*

  post 10 payments to the test server
  return an array of the 10 payments as they exist on the server

*/
function populateData(payments, done){
  var paymentData = []
  /*

    map the array of names onto an array of functions
    that will POST a payment with that name

  */
  var createFunctions = payments.map(function(data){

    /*

      this is the async function that will run via async.series

    */
    return function(next){
      hyperrequest({
        url: "http://127.0.0.1:"+ testing_port +"/v1/payments",
        method: "POST",
        json: data,
        headers: {
            "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){

        // always return errors so parent code is notified
        if(err) return next(err.toString())

        paymentData.push(resp.body)

        next()
      })
    }
  })

  /*

    run over the payment creation
    return the array of returned payment data

  */
  async.series(createFunctions, function(err){
    if(err) return done(err)
    done(null, paymentData)
  })
}

/*
  Test that the version of the module returns the correct string
*/
tape("GET /v1/version", function (t) {

  var config = require(path.join(__dirname, "package.json"))
  var server;

  async.series([

    // create the server
    function(next){
      createServer(function(err, s){
        if(err) return next(err)
        server = s
        next()
      })
    },

    // read the version from the API
    function(next){
      var req = hyperquest("http://127.0.0.1:"+testing_port+"/v1/version", {
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      })

      var destStream = concat(function(result){

        t.equal(result.toString(), config.version.toString(), "the version is correct")

        next()
      })

      req.pipe(destStream)

      req.on("response", function(res){
        t.equal(res.statusCode, 200, "The status code == 200")
      })

      req.on("error", function(err){
        next(err.toString())
      })
    },
  ], function(err){
    if(err){
      t.error(err)
      server.close()
      t.end()
      return
    }
    server.close()
    t.end()
  })

})


/*

  Query the api to check the payments we have saved are actually there

*/

tape("GET /v1/payments", function (t) {

  var payments;
  var server;

  async.series([

    // create the server
    function(next){
      createServer(function(err, s){
        if(err) return next(err)
        server = s
        next()
      })
    },

    // populate some payments
    function(next){
      var rawData = getPaymentData(10)
      populateData(rawData, function(err, paymentsReturned){
        if(err) return next(err)
        payments = paymentsReturned;
        next()
      })
    },

    // test the length of payments matches
    function(next){
      hyperrequest({
        "url":"http://127.0.0.1:"+ testing_port +"/v1/payments",
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return next(err)
        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(resp.body.length, payments.length, "the number of payments matches")

        next()
      })

    },
  ], function(err){
    if(err){
      t.error(err)
      server.close()
      t.end()
      return
    }
    server.close()
    t.end()
  })

})

/*

  seed the system with payments and retrieve one to check it's attributes

*/
tape("GET /v1/payments/:paymentid", function (t) {

  var server;
  async.series([

    // create the server
    function(next){
      createServer(function(err, s){
        if(err) return next(err)
        server = s
        next()
      })
    },


    // populate some payments
    function(next){
      var rawData = getPaymentData(10)
      populateData(rawData, function(err, paymentsReturned){
        if(err) return next(err)
        payments = paymentsReturned;
        next()
      })
    },

    // get a single payment
    function(next){

      hyperrequest({
        "url": "http://127.0.0.1:"+testing_port+"/v1/payments/"+ payments[subject_payment_index].id,
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(resp.body.name, payments[subject_payment_index].name, "the requested payment's name matches")

        next()
      })
    }
  ], function(err){
    if(err){
      t.error(err)
      server.close()
      t.end()
      return
    }
    server.close()
    t.end()
  })

})

/*

  seed the system with payments and update one with known data to check it is updated

*/
tape("PUT /v1/payments/:paymentid", function (t) {

  var payments;
  var server;

  async.series([

    // create the server
    function(next){
      createServer(function(err, s){
        if(err) return next(err)
        server = s
        next()
      })
    },

    // populate some payments
    function(next){
      var rawData = getPaymentData(10)
      populateData(rawData, function(err, paymentsReturned){
        if(err) return next(err)
        payments = paymentsReturned;
        next()
      })
    },

    function(next){

      payments[subject_payment_index].name = "A totally different name"

      var req = hyperrequest({
        "url":"http://127.0.0.1:"+testing_port+"/v1/payments/"+ payments[subject_payment_index].id,
        method:"PUT",
        json:payments[subject_payment_index],
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(resp.body.name, payments[subject_payment_index].name, "the requested payment's name matches")

        next()
      });

    },

    function(next){
      var req = hyperrequest({
        "url":"http://127.0.0.1:"+testing_port+"/v1/payments/"+ payments[subject_payment_index].id,
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(resp.body.name, payments[subject_payment_index].name, "the requested payment's name matches")

        next()
      });

    }
  ], function(err){
    if(err){
      t.error(err)
      server.close()
      t.end()
      return
    }
    server.close()
    t.end()
  })

})


// seed the system with payments and delete one
tape("DELETE /v1/payments/:paymentid", function (t) {

  var payments;
  var server;

  async.series([


    // create the server
    function(next){
      createServer(function(err, s){
        if(err) return next(err)
        server = s
        next()
      })
    },

    // populate some payments
    function(next){
      var rawData = getPaymentData(10)
      populateData(rawData, function(err, paymentsReturned){
        if(err) return next(err)
        payments = paymentsReturned;
        next()
      })
    },

    function(next){

      var req = hyperrequest({
        "url":"http://127.0.0.1:"+testing_port+"/v1/payments/"+ payments[subject_payment_index].id,
        method:"DELETE",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return subnext(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        next()
      });

    },

    function(next){
      hyperrequest({
        "url":"http://127.0.0.1:"+ testing_port +"/v1/payments",
        method:"GET",
        headers:{
          "x-jenca-user":jenca_user_id
        }
      }, function(err, resp){
        if(err) return next(err)

        t.equal(resp.statusCode, 200, "The status code == 200")
        t.equal(resp.body.length, (payments.length-1), "the number of payments is less one")

        next()
      })

    }
  ], function(err){
    if(err){
      t.error(err)
      server.close()
      t.end()
      return
    }
    server.close()
    t.end()
  })

})

/*

  unit test for the storage mechanism

*/
tape("jsonfile: create payment", function(t){

  var storage = JSONFileStorage({
    memory:true
  })

  // create a payment
  storage.create_payment(jenca_user_id, {
    apples:10
  }, function(err){
    if(err) t.err(err.toString())
    var state = storage.get_state()

    var payment_keys = Object.keys(state.users[jenca_user_id].payments)
    t.equal(payment_keys.length, 1, "there is 1 payment")

    var payment_id = payment_keys.pop()
    var payment = state.users[jenca_user_id].payments[payment_id]

    t.equal(payment.apples, 10, "the payment setting is set")
    t.deepEqual(payment.containers, [], "there is an empty list of containers")

    t.end()
  })
})