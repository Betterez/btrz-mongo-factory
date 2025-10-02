/*jshint expr: true*/
"use strict";

describe("MongoFactory", function () {

  let MongoFactory = require("../").MongoFactory,
    expect = require("chai").expect,
    sinon = require("sinon"),
    factory;

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

  afterEach(function (done) {
    factory.clearAll().then(function () { done(); }).catch(done);
  });

  describe("fixtures", function () {

    it("should load all fixtures from the fixtures folder in options", function () {
      expect(factory.fixtures()).to.not.be.null;
      expect(factory.fixtures().size).to.be.eql(3);
    });

    it("should return a given fixture by name", function () {
      expect(factory.fixtures("account")).to.not.be.null;
      expect(factory.fixtures("account").size).to.be.undefined;
    });

    it("should throw if given invalid fixtures", function () {
      function sut() {
        let f = new MongoFactory({fixtures: "/test/invalid-fixtures"});
        return f;
      }
      expect(sut).to.throw();
    });

  });

  describe("create", function () {

    it("should return an object with random values", async () => {
      const model = await factory.create("user");
      expect(model.name).to.not.be.undefined;
    });

    it("should override the values with the options given", async () => {
      let options = {name: "Given name", email: "given@example.com"};
      const model = await factory.create("user", options);
      expect(model.name).to.be.eql(options.name);
      expect(model.email).to.be.eql(options.email);
    });

    it("should create an object with an schema and a $ref", async () => {
      const model = await factory.create("account", {}, [factory.fixtures("tags")]);
      expect(model.name).to.not.be.undefined;
      expect(model.tags.length).to.not.be.eql(0);
      expect(model.tags[0].id).to.not.be.undefined;
      expect(model.tags[0].name).to.not.be.undefined;
    });

    it("should create an object with an schema and a $ref", async () => {
      const model = await factory.create("account_two", {}, [factory.fixtures("account"), factory.fixtures("tags")]);
      expect(model.name).to.not.be.undefined;
      expect(model.tags.length).to.not.be.eql(0);
      expect(model.tags[0].id).to.not.be.undefined;
      expect(model.tags[0].name).to.not.be.undefined;
    });

    it("should throw if references is not an array", async () => {
      function sut() {
        factory.create("account", {}, "not-an-array");
      }
      expect(sut).to.throw();
    });
  });

  describe("createList", function () {

    it("should return a list of objects with random values of size X", async () => {
      const models = await factory.createList("user", 2);
      expect(models.length).to.be.eql(2);
      expect(models[0].name).to.not.be.undefined;
    });

    it("should override the values with the options given in all objects", async () => {
      let options = {email: "given@example.com"};
      const models = await factory.createList("user", 2, options);
      expect(models.length).to.be.eql(2);
      expect(models[0].email).to.be.eql(options.email);
      expect(models[1].email).to.be.eql(options.email);
    });

    it("should override the values with the options given in all objects and use external $refs", async () => {
      let options = {name: "account-name"};
      const models = await factory.createList("account", 2, options, [factory.fixtures("tags")]);
      expect(models.length).to.be.eql(2);
      expect(models[0].name).to.be.eql(options.name);
      expect(models[1].name).to.be.eql(options.name);
      expect(models[0].tags.length).to.not.be.eql(0);
    });

    it("should override the values with the options given in the array", async () => {
      let options = [{email: "given@example.com"}, {email: "given2@example.com"}, {email: "given3@example.com"}];
      const models = await factory.createList("user", 3, options);
      expect(models.length).to.be.eql(3);
      expect(models[0].email).to.be.eql(options[0].email);
      expect(models[1].email).to.be.eql(options[1].email);
      expect(models[2].email).to.be.eql(options[2].email);
    });

    it("should override the values with the options given in the array with less overrides than fixtures created", async () => {
      let options = [{email: "given@example.com"}, {email: "given2@example.com"}, {email: "given3@example.com"}];
      const models = await factory.createList("user", 6, options);
      expect(models.length).to.be.eql(6);
      expect(models[0].email).to.be.eql(options[0].email);
      expect(models[1].email).to.be.eql(options[1].email);
      expect(models[2].email).to.be.eql(options[2].email);
      expect(models[3].email).to.be.eql(options[0].email);
      expect(models[4].email).to.be.eql(options[1].email);
      expect(models[5].email).to.be.eql(options[2].email);
    });
  });

  describe("clearAll", function () {

    it("should return a promise", async () => {
      let promise = factory.clearAll();
      expect(promise).to.be.an.instanceof(Promise);
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

      expect(collections.modelOne.deleteMany.calledOnce).to.be.true;
      expect(collections.modelOne.deleteMany.firstCall.args[0]._id.$in).to.deep.equal(["id1", "id2"]);
      expect(collections.modelTwo.deleteMany.calledOnce).to.be.true;
      expect(collections.modelTwo.deleteMany.firstCall.args[0]._id.$in).to.deep.equal(["id3"]);
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
        expect.fail("Expected function to reject");
      } catch (error) {
        factory.created.restore();
        expect(error.message).to.eql("Some error");
      }
    });
  });
});
