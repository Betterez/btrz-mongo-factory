"use strict";
const fs = require("fs");
let __connection = null;
const {SimpleDao} = require("btrz-simple-dao");
let schemaFakerGenerate = null;

const {
  createFixture
} = require("./createFixture");

async function getSchemaFakerGenerate() {
  if (schemaFakerGenerate) {
    return schemaFakerGenerate;
  }

  const schemaFakerModule = await import("json-schema-faker");
  const generate =
    schemaFakerModule.generate ||
    (schemaFakerModule.default && schemaFakerModule.default.generate) ||
    schemaFakerModule.default;

  if (typeof generate !== "function") {
    throw new Error("json-schema-faker generate function was not found");
  }

  schemaFakerGenerate = generate;
  return schemaFakerGenerate;
}

function cloneDeep(value) {
  if (value === undefined || value === null) {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
}

function rewriteLegacyRefs(schema, references) {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  if (!Array.isArray(references) || references.length === 0) {
    return schema;
  }

  const schemaWithRefs = cloneDeep(schema);
  const defs = {};

  for (const refSchema of references) {
    if (refSchema && typeof refSchema === "object" && typeof refSchema.id === "string" && refSchema.id.length > 0) {
      defs[refSchema.id] = cloneDeep(refSchema);
    }
  }

  if (Object.keys(defs).length === 0) {
    return schemaWithRefs;
  }

  schemaWithRefs.$defs = Object.assign({}, schemaWithRefs.$defs || {}, defs);

  function rewriteNode(node) {
    if (!node || typeof node !== "object") {
      return;
    }

    if (typeof node.$ref === "string" && !node.$ref.startsWith("#/") && defs[node.$ref]) {
      node.$ref = `#/$defs/${node.$ref}`;
    }

    if (Array.isArray(node)) {
      node.forEach(rewriteNode);
      return;
    }

    for (const value of Object.values(node)) {
      rewriteNode(value);
    }
  }

  rewriteNode(schemaWithRefs);
  return schemaWithRefs;
}

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


async function* modelGen(schema, qty, overrides, references) {
  let x  = 0;
  if (references && !Array.isArray(references)) {
    throw new Error("External references needs to be an array of json-schemas");
  }
  try {
    const generate = await getSchemaFakerGenerate();
    const schemaForGeneration = rewriteLegacyRefs(schema, references);
    const baseSeed = Date.now() + Math.floor(Math.random() * 1000000);
    while(x < qty) {
      let model = {};
      try {
        model = await generate(schemaForGeneration, {seed: baseSeed + x});
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
  if (references && !Array.isArray(references)) {
    throw new Error("External references needs to be an array of json-schemas");
  }
  let overrides = options || {};
  const schema = this.fixtures(modelName) || (references && references[0]);
  return modelGen(schema, 1, overrides, references).next()
    .then((generated) => generated.value)
    .then((model) => {
      return this.connection
      .then((db) => {
        return db.collection(modelName).insertOne(model);
      })
      .then((result) => {
        this.saveIds(modelName)([result.insertedId]);
        return result.ops[0] || {};
      });
    });
};

MongoFactory.prototype.createList = function (modelName, qty, options, references) {
  if (references && !Array.isArray(references)) {
    throw new Error("External references needs to be an array of json-schemas");
  }
  let overrides = options || {};
  const schema = this.fixtures(modelName) || (references && references[0]);
  return (async () => {
    let models = [];
    for await (let model of modelGen(schema, qty, overrides, references)) {
      models.push(model);
    }
    return models;
  })()
    .then((models) => {
      return this.connection
      .then((db) => {
        return db.collection(modelName).insertMany(models);
      })
      .then((result) => {
        this.saveIds(modelName)(Object.values(result.insertedIds));
        return result.ops;
      });
    });
};

MongoFactory.prototype.clearAll = function () {
  let createdMap = this.created();
  let deletions = [];
  return this.connection.then((db) => {
    for (let key of createdMap.keys()) {
      let query = {"_id": {"$in": createdMap.get(key)}};
      deletions.push(db.collection(key).deleteMany(query));
    }
    return Promise.all(deletions);
  });
};

module.exports = {
  createFixture,
  MongoFactory
};
