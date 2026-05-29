const {describe, it, beforeEach, afterEach} = require("node:test");
const assert = require("node:assert/strict");
const sinon = require("sinon");
const {MongoFactory} = require("../");

describe("MongoFactory", function () {

  let factory;

  beforeEach(function () {
    let options = {
      fixtures: `${__dirname}/fixtures`,
      "db": {
          "options": {
            "database": "btrzMongoFactory",
            "username": "",
            "password": ""
          },
          "uris": [
            "127.0.0.1:27017"
          ]
        }
      };
    factory = new MongoFactory(options);
  });

  it("connection pooling", () => {
    let options = {
      fixtures: `${__dirname}/fixtures`,
      "db": {
        "options": {
          "database": "btrzMongoFactory",
          "username": "",
          "password": ""
        },
        "uris": [
          "127.0.0.1:27017"
        ]
      }
    };
    for (let i = 0; i < 100; i++) {
      new MongoFactory(options);
    }
  });

  afterEach(async function () {
    await factory.clearAll();
  });

  describe("fixtures", function () {

    it("should load all fixtures from the fixtures folder in options", function () {
      assert.notEqual(factory.fixtures(), null);
      assert.equal(factory.fixtures().size, 3);
    });

    it("should return a given fixture by name", function () {
      assert.notEqual(factory.fixtures("account"), null);
      assert.equal(factory.fixtures("account").size, undefined);
    });

    it("should throw if given invalid fixtures", function () {
      function sut() {
        let f = new MongoFactory({fixtures: "/test/invalid-fixtures"});
        return f;
      }
      assert.throws(sut);
    });

  });

  describe("create", function () {

    it("should return an object with random values", async () => {
      const model = await factory.create("user");
      assert.notEqual(model.name, undefined);
    });

    it("should override the values with the options given", async () => {
      let options = {name: "Given name", email: "given@example.com"};
      const model = await factory.create("user", options);
      assert.equal(model.name, options.name);
      assert.equal(model.email, options.email);
    });

    it("should create an object with an schema and a $ref", async () => {
      const model = await factory.create("account", {}, [factory.fixtures("tags")]);
      assert.notEqual(model.name, undefined);
      assert.notEqual(model.tags.length, 0);
      assert.notEqual(model.tags[0].id, undefined);
      assert.notEqual(model.tags[0].name, undefined);
    });

    it("should create an object with an schema and a $ref", async () => {
      const model = await factory.create("account_two", {}, [factory.fixtures("account"), factory.fixtures("tags")]);
      assert.notEqual(model.name, undefined);
      assert.notEqual(model.tags.length, 0);
      assert.notEqual(model.tags[0].id, undefined);
      assert.notEqual(model.tags[0].name, undefined);
    });

    it("should throw if references is not an array", async () => {
      function sut() {
        factory.create("account", {}, "not-an-array");
      }
      assert.throws(sut);
    });

    it("should not throw when schema and reference are undefined", async () => {
      const options = {name: "fallback-name"};
      const model = await factory.create("missing-model", options, [undefined]);
      assert.equal(model.name, options.name);
    });
  });

  describe("createList", function () {

    it("should return a list of objects with random values of size X", async () => {
      const models = await factory.createList("user", 2);
      assert.equal(models.length, 2);
      assert.notEqual(models[0].name, undefined);
    });

    it("should override the values with the options given in all objects", async () => {
      let options = {email: "given@example.com"};
      const models = await factory.createList("user", 2, options);
      assert.equal(models.length, 2);
      assert.equal(models[0].email, options.email);
      assert.equal(models[1].email, options.email);
    });

    it("should generate different random values for each created model", async () => {
      const models = await factory.createList("user", 2);
      assert.equal(models.length, 2);
      assert.notEqual(models[0].email, models[1].email);
    });

    it("should override the values with the options given in all objects and use external $refs", async () => {
      let options = {name: "account-name"};
      const models = await factory.createList("account", 2, options, [factory.fixtures("tags")]);
      assert.equal(models.length, 2);
      assert.equal(models[0].name, options.name);
      assert.equal(models[1].name, options.name);
      assert.notEqual(models[0].tags.length, 0);
    });

    it("should override the values with the options given in the array", async () => {
      let options = [{email: "given@example.com"}, {email: "given2@example.com"}, {email: "given3@example.com"}];
      const models = await factory.createList("user", 3, options);
      assert.equal(models.length, 3);
      assert.equal(models[0].email, options[0].email);
      assert.equal(models[1].email, options[1].email);
      assert.equal(models[2].email, options[2].email);
    });

    it("should override the values with the options given in the array with less overrides than fixtures created", async () => {
      let options = [{email: "given@example.com"}, {email: "given2@example.com"}, {email: "given3@example.com"}];
      const models = await factory.createList("user", 6, options);
      assert.equal(models.length, 6);
      assert.equal(models[0].email, options[0].email);
      assert.equal(models[1].email, options[1].email);
      assert.equal(models[2].email, options[2].email);
      assert.equal(models[3].email, options[0].email);
      assert.equal(models[4].email, options[1].email);
      assert.equal(models[5].email, options[2].email);
    });
  });

  describe("clearAll", function () {

    it("should return a promise", async () => {
      let promise = factory.clearAll();
      assert.ok(promise instanceof Promise);
      return promise;
    });

    it("should remove all created documents", async () => {
      sinon.stub(factory, "created").callsFake(() => {
        let map = new Map();
        map.set("modelOne", ["id1", "id2"]);
        map.set("modelTwo", ["id3"]);
        return map;
      });

      const collections = {
        modelOne: {deleteMany: sinon.stub().resolves()},
        modelTwo: {deleteMany: sinon.stub().resolves()},
      };
      const dbModule = {
        collection: (model) => {
          return collections[model];
        }
      };
      factory.connection = Promise.resolve(dbModule);

      await factory.clearAll();
      factory.created.restore();

      assert.equal(collections.modelOne.deleteMany.calledOnce, true);
      assert.deepEqual(collections.modelOne.deleteMany.firstCall.args[0]._id.$in, ["id1", "id2"]);
      assert.equal(collections.modelTwo.deleteMany.calledOnce, true);
      assert.deepEqual(collections.modelTwo.deleteMany.firstCall.args[0]._id.$in, ["id3"]);
    });

    it("should fail if removing any of the created documents fails", async () => {
      sinon.stub(factory, "created").callsFake(() => {
        let map = new Map();
        map.set("modelOne", ["id1", "id2"]);
        map.set("modelTwo", ["id3"]);
        return map;
      });

      const collections = {
        modelOne: {deleteMany: sinon.stub().resolves()},
        modelTwo: {deleteMany: sinon.stub().rejects(new Error("Some error"))},
      };
      const dbModule = {
        collection: (model) => {
          return collections[model];
        }
      };
      factory.connection = Promise.resolve(dbModule);

      try {
        await factory.clearAll();
        assert.fail("Expected function to reject");
      } catch (error) {
        factory.created.restore();
        assert.equal(error.message, "Some error");
      }
    });
  });
});
