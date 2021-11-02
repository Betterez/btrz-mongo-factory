"use strict";
const fs = require("fs");
let __connection = null;
const {SimpleDao} = require("btrz-simple-dao");
const schemaFaker = require("json-schema-faker");

const {
  createFixture
} = require("./createFixture");

function loadFixtures({fixtures, loadFromModels = false}, fixtureMap) {
  if (loadFromModels) {
    const models = require(fixtures);
    // get the models from index file
    for (const model of Object.values(models)) {
      // if the model has the fixturesSchema function loop through its entries
      if (typeof model.fixturesSchema === "function") {
        const fixture = model.fixturesSchema();
        for (const [key, value] of fixture.entries()) {
          fixtureMap.set(key, value);
        }
      }
    }
  } else {
    fs
    .readdirSync(fixtures)
    .forEach(function (fileName) {
      let fixture = require(`${fixtures}/${fileName}`)();
      for (const [key, value] of fixture.entries()) {
          fixtureMap.set(key, value);
        }
      });
  }
}


function* modelGen(schema, qty, overrides, references) {
  let x  = 0;
  if (references && !Array.isArray(references)) {
    throw new Error("External references needs to be an array of json-schemas");
  }
  try {
    while(x < qty) {
      let model = {};
      try {
        model = schemaFaker.generate(schema, references);
      } catch (e) {
        model = {};
      }
      if (Array.isArray(overrides)) {
        let index = x;
        if (overrides.length-1 < x) {
          index = x % overrides.length;
        }
        yield Object.assign({}, model, overrides[index]);
      }
      else {
        yield Object.assign({}, model, overrides);
      }
      x++;
    }
  } catch(e) {
    console.log(e);
    throw new Error("There was a problem with the references array, make sure it contains a valid json-schemas: " +  e);
  }
}

function MongoFactory(config) {
  let fixtureMap = new Map();
  let createdMap = new Map();
  loadFixtures(config, fixtureMap);

  if (!__connection) {
    const simpleDao = new SimpleDao(config);
    __connection = simpleDao.connect();
  }

  this.connection = __connection;

  this.fixtures = function (fixtureName) {
    if (!fixtureName) {
      return fixtureMap;
    } else {
      return fixtureMap.get(fixtureName);
    }
  };

  this.saveIds = function (fixtureName) {
    return function (ids) {
      ids.forEach(function (id) {
        if (createdMap.has(fixtureName)) {
          createdMap.get(fixtureName).push(id);
        } else {
          createdMap.set(fixtureName, [id]);
        }
      });
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
  const schema = this.fixtures(modelName) || references[0];
  let model = modelGen(schema, 1, overrides, references).next().value;
  return this.connection
    .then((db) => {
      return db.collection(modelName).insert(model);
    })
    .then((result) => {
      this.saveIds(modelName)(Object.values(result.insertedIds));
      return result.ops[0] || {};
    });
};

MongoFactory.prototype.createList = function (modelName, qty, options, references) {
  let overrides = options || {};
  let models = [];
  const schema = this.fixtures(modelName) || references[0];
  for (let model of modelGen(schema, qty, overrides, references)) {
    models.push(model);
  }
  return this.connection
    .then((db) => {
      return db.collection(modelName).insert(models);
    })
    .then((result) => {
      this.saveIds(modelName)(Object.values(result.insertedIds));
      return result.ops;
    });
};

MongoFactory.prototype.clearAll = function () {
  let createdMap = this.created();
  let removes = [];
  return this.connection.then((db) => {
    for (let key of createdMap.keys()) {
      let query = {"_id": {"$in": createdMap.get(key)}};
      removes.push(db.collection(key).remove(query));
    }
    return Promise.all(removes);
  });
};

module.exports = {
  createFixture,
  MongoFactory
};
