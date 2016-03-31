var path = require('path')
var datastore = require('../storage/sqlite3')
var concat = require('concat-stream')

module.exports = function(config){

  var storage = datastore(config)

  return {
    index:{
      GET:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')
        storage.list_payments(req.headers['x-jenca-user'], function(err, data){
          if(err){
            res.statusCode = 500;
            res.end(err.toString());
            return;
          }

          res.end(JSON.stringify(data))
        })
      },
      POST:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')

        req.pipe(concat(function(body){
          body = JSON.parse(body.toString())
          storage.create_payment(req.headers['x-jenca-user'], body, function(err, data){
            if(err){
              res.statusCode = 500;
              res.end(err.toString());
              return;
            }

            // trigger build and upload of kubernetes manifest
            res.statusCode = 201
            res.end(JSON.stringify(data))
          })
        }))

      }

    },
    show:{
      GET:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')
        storage.get_payment(req.headers['x-jenca-user'], opts.params.paymentid, function(err, data){
          if(err){
            res.statusCode = 500;
            res.end(err.toString());
            return;
          }
          res.end(JSON.stringify(data))
        })
      },
      PUT:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')

        req.pipe(concat(function(body){
          body = JSON.parse(body.toString())
          storage.save_payment(req.headers['x-jenca-user'], opts.params.paymentid, body, function(err, data){
            if(err){
              res.statusCode = 500;
              res.end(err.toString());
              return;
            }
            // trigger build and upload of updated kubernetes manifest
            res.end(JSON.stringify(data))
          })
        }))

      },
      DELETE:function(req, res, opts, cb){
        res.setHeader('content-type', 'application/json')
        storage.delete_payment(req.headers['x-jenca-user'], opts.params.paymentid, function(err, data){
          if(err){
            res.statusCode = 500;
            res.end(err.toString());
            return;
          }
          // trigger kubernetes to kill of relevant containers
          res.end()
        })
      }
    }
  }
}