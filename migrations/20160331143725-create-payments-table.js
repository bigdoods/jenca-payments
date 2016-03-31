'use strict';

var dbm;
var type;
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
	db.createTable('payments', {
    id: { type: 'int', primaryKey: true },
    user_id: 'int',
    description: 'text',
    created_at: 'text',
    updated_at: 'text',
  });
  return null;
};

exports.down = function(db) {
	db.dropTable('payments');
  return null;
};
