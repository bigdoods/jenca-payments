var fs = require('fs');
var uuid = require('uuid');
var path = require('path');
var settings = require('../settings');
var sqlite3 = require('sqlite3').verbose();

/*

  var state = {
    users:{
      user1:{
        projects:{
          56:{
            name:'test',
            containers:{
              test:{

              },
              bimserver:{

              }
            }
          }
        }
      }
    }
  }

*/

module.exports = function(opts){

  opts = opts || {}
  var db = new sqlite3.Database(opts.datafile);

  function create_payment(userid, data, done){
    var id = uuid.v1()
    var params = {}
    var set_query = Object.keys(data).map(function(key){
      params['$' + key] = data[key]
      return '$'+ key
    })
    params['user_id'] = userid
    params['id'] = id

    var stmt = db.prepare("INSERT INTO payments ("+ ",".join(Object.keys(data)) +") VALUES ("+ ",".join(set_query) +")");
    stmt.run(params, function(err){
      if(err) return done(err)
      done()
    });
    stmt.finalize();
  }

  function get_payment(userid, paymentid, done){
    var stmt = db.prepare("SELECT * FROM payments WHERE user_id =? AND id =? LIMIT 1", userid, paymentid);
    stmt.get(function(err, row){
      if(err) return done(err)

      if(row == undefined){
        done('there is no payment with id: ' + projectid + ' for userid:'+ userid)
      }else{
        done(null, row)
      }
    });
  }

  function list_payments(userid, done){
    var stmt = db.prepare("SELECT * FROM payments WHERE user_id =?", userid, paymentid);
    stmt.all(function(err, rows){
      if(err) return done(err)

      if(rows.length == 0){
        done('no payments for userid:'+ userid)
      }else{
        done(null, rows)
      }
    });
  }

  function delete_payment(userid, paymentid, done){
    var stmt = db.prepare("DELETE * FROM payments WHERE user_id =? AND id =? LIMIT 1", userid, paymentid);
    stmt.run(function(err){
      if(err) return done(err)

      if(row == undefined){
        done('there is no payment with id: ' + projectid + ' for userid:'+ userid)
      }else{
        done(null, row)
      }
    });
  }

  function save_payment(userid, paymentid, data, done){
    var params = {}
    var set_query = Object.keys(data).map(function(key){
      params['$' + key] = data[key]
      return key + '= $'+ key
    })
    params['user_id'] = userid
    params['id'] = paymentid

    var stmt = db.prepare("UPDATE payments SET "+ (",".join(set_query)) +" WHERE user_id = $user_id AND id = $id LIMIT 1");
    stmt.run(params, function(err){
      done(err)
    });
  }

  return {
    create_payment:create_payment,
    get_payment:get_payment,
    list_payments:list_payments,
    delete_payment:delete_payment,
    save_payment:save_payment
  }
}