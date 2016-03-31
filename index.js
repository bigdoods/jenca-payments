var path = require('path')
var http = require('http')
var fs = require('fs')
var Router = require('./router')
var settings = require('./settings')
var database = require('./database')

var args = require('minimist')(process.argv, {
  alias:{
    p:'port',
    s:'storage',
    d:'datafile'
  },
  default:{
    port:process.env.PORT || 80,
    storage:process.env.STORAGE || database.other.driver,
    datafile:process.env.DATAFILE || database.other.filename
  }
})

var datastore = require('storage/' + args.storage)(args)
var router = Router({
  storage:datastore,
  datafile:datafile
})

var server = http.createServer(router.handler)

server.listen(args.port, function(err){
  if(err){
    console.error(err.toString())
    return
  }
  console.log('server listening on port: ' + args.port)
})