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

function* modelGen(schema, qty, overrides, references) {
  let x  = 0;
  if (references && !Array.isArray(references)) {
    throw new Error("External references needs to be an array of json-schemas");
  }
  try {
    while(x < qty) {
      let model = schemaFaker(schema, references);
      if (_.isArray(overrides)) {
        let index = x;
        if (overrides.length-1 < x) {
          index = x % overrides.length;
        }
        yield _.merge({}, model, overrides[index]);
      }
      else {
        yield _.merge({}, model, overrides);
      }
      x++;
    }
  } catch(e) {
    throw new Error("There was a problem with the references array, make sure it contains a valid json-schemas: " +  e);
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

MongoFactory.prototype.create = function (modelName, options, references) {
  let overrides = options || {};
  let model = modelGen(this.fixtures(modelName), 1, overrides, references).next().value;
  return this.db.collection(modelName).insert(model).then(this.saveIds(modelName));
};

MongoFactory.prototype.createList = function (modelName, qty, options, references) {
  let overrides = options || {};
  let models = [];
  for (let model of modelGen(this.fixtures(modelName), qty, overrides, references)) {
    models.push(model);
  }
  return this.db.collection(modelName).insert(models).then(this.saveIds(modelName));
};

MongoFactory.prototype.clearAll = function () {
  let createdMap = this.created();
  let removes = [];
  for (let key of createdMap.keys()) {
    let query = {"_id": {"$in": createdMap.get(key)}};
    removes.push(this.db.collection(key).remove(query));
  }
  return Promise.all(removes);
};

exports.MongoFactory = MongoFactory;
