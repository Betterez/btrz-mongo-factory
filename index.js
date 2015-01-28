"use strict";
let fs = require("fs"),
  _ = require("lodash"),
  pmongo = require("promised-mongo"),
  schemaFaker = require("json-schema-faker");

function loadFixtures(fixturesPath, fixtureMap) {
  fs
    .readdirSync(fixturesPath)
    .forEach(function (fileName) {
      let fixture = require(`${fixturesPath}/${fileName}`)();
      for (let key of fixture.keys()) {
        fixtureMap.set(key, fixture.get(key));
      }
    });
}

// username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]
function connectionString(dbConfig) {
  let hostPortPairs = dbConfig.uris.map(function (uri) {
    return `${uri}/${dbConfig.options.database}`;
  }).join(",");
  if (dbConfig.options.username.length > 0) {
    return `${dbConfig.options.username}:${dbConfig.options.password}@${hostPortPairs}`;
  }
  return hostPortPairs;
}

function* modelGen(schema, qty, overrides) {
  let x  = 0;
 while(x < qty) {
  x++;
  let model = schemaFaker(schema);
  yield _.merge({}, model, overrides);
 }
}

function MongoFactory(options) {

  let fixturesPath = options.fixtures;
  let fixtureMap = new Map();
  let createdMap = new Map();
  loadFixtures(fixturesPath, fixtureMap);

  this.db = pmongo(connectionString(options.db));

  this.fixtures = function (fixtureName) {
    if (!fixtureName) {
      return fixtureMap;
    } else {
      return fixtureMap.get(fixtureName);
    }
  };

  this.saveIds = function (fixtureName) {
    return function (models) {
      let results = models;
      if (!Array.isArray(models)) {
        results = [models];
      }
      results.forEach(function (model) {
        if (createdMap.has(fixtureName)) {
          createdMap.get(fixtureName).push(model._id);
        } else {
          createdMap.set(fixtureName, [model._id]);
        }
      });
      return models;
    };
  };

  this.created = function (fixtureName) {
    if (!fixtureName) {
      return createdMap;
    } else {
      return createdMap.get(fixtureName);
    }
  };
}

MongoFactory.prototype.create = function (modelName, options) {
  let overrides = options || {};
  let model = modelGen(this.fixtures(modelName), 1, overrides).next().value;
  return this.db.collection(modelName).insert(model).then(this.saveIds(modelName));
};

MongoFactory.prototype.createList = function (modelName, qty, options) {
  let overrides = options || {};
  let models = [];
  for (let model of modelGen(this.fixtures(modelName), qty, overrides)) {
    models.push(model);
  }
  return this.db.collection(modelName).insert(models).then(this.saveIds(modelName));
};

MongoFactory.prototype.clearAll = function (cb) {
  let createdMap = this.created();
  for (let key of createdMap.keys()) {
    let query = {"_id": {"$in": createdMap.get(key)}};
    this.db.collection(key).remove(query);
  }
};

module.exports = MongoFactory;