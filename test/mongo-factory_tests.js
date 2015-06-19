/*jshint expr: true*/
"use strict";

describe("MongoFactory", function () {

  let MongoFactory = require("../").MongoFactory,
    expect = require("chai").expect,
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

  afterEach(function () {
    factory.clearAll();
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

    it("should return an object with random values", function (done) {
      factory.create("user").then(function (model) {
        expect(model.name).to.not.be.undefined;
        done();
      });
    });

    it("should override the values with the options given", function (done) {
      let options = {name: "Given name", email: "given@example.com"};
      factory.create("user", options).then(function (model) {
        expect(model.name).to.be.eql(options.name);
        expect(model.email).to.be.eql(options.email);
        done();
      });
    });

    it("should create an object with an schema and a $ref", function (done) {
      factory.create("account", {}, [factory.fixtures("tags")]).then(function (model) {
        expect(model.name).to.not.be.undefined;
        expect(model.tags.length).to.not.be.eql(0);
        expect(model.tags[0].id).to.not.be.undefined;
        expect(model.tags[0].name).to.not.be.undefined;
        done();
      });
    });

    it("should throw if references is not an array", function () {
      function sut() {
        factory.create("account", {}, "not-an-array")
      }
      expect(sut).to.throw();
    });

    it("should throw is references contains undefined", function () {
      function sut() {
        factory.create("account", {}, [undefined]);
      }
      expect(sut).to.throw("There was a problem with the references array, make sure it contains json-schemas");
    });

    it("should throw is references contains null", function () {
        function sut() {
          factory.create("account", {}, [null]);
        }
        expect(sut).to.throw("There was a problem with the references array, make sure it contains json-schemas");
    });
  });

  describe("createList", function () {

    it("should return a list of objects with random values of size X", function (done) {
      factory.createList("user", 2).then(function (models) {
        expect(models.length).to.be.eql(2);
        expect(models[0].name).to.not.be.undefined;
        done();
      });
    });

    it("should override the values with the options given in all objects", function (done) {
      let options = {email: "given@example.com"};
      factory.createList("user", 2, options).then(function (models) {
        expect(models.length).to.be.eql(2);
        expect(models[0].email).to.be.eql(options.email);
        expect(models[1].email).to.be.eql(options.email);
        done();
      });
    });


    it("should override the values with the options given in all objects and use external $refs", function (done) {
      let options = {name: "account-name"};
      factory.createList("account", 2, options, [factory.fixtures("tags")]).then(function (models) {
        expect(models.length).to.be.eql(2);
        expect(models[0].name).to.be.eql(options.name);
        expect(models[1].name).to.be.eql(options.name);
        expect(models[0].tags.length).to.not.be.eql(0);
        done();
      });
    });

    it("should override the values with the options given in the array", function (done) {
      let options = [{email: "given@example.com"}, {email: "given2@example.com"}, {email: "given3@example.com"}];
      factory.createList("user", 3, options).then(function (models) {
        expect(models.length).to.be.eql(3);
        expect(models[0].email).to.be.eql(options[0].email);
        expect(models[1].email).to.be.eql(options[1].email);
        expect(models[2].email).to.be.eql(options[2].email);
        done();
      });
    });

    it("should override the values with the options given in the array with less overrides than fixtures created", function (done) {
      let options = [{email: "given@example.com"}, {email: "given2@example.com"}, {email: "given3@example.com"}];
      factory.createList("user", 6, options).then(function (models) {
        expect(models.length).to.be.eql(6);
        expect(models[0].email).to.be.eql(options[0].email);
        expect(models[1].email).to.be.eql(options[1].email);
        expect(models[2].email).to.be.eql(options[2].email);
        expect(models[3].email).to.be.eql(options[0].email);
        expect(models[4].email).to.be.eql(options[1].email);
        expect(models[5].email).to.be.eql(options[2].email);
        done();
      });
    });
  });
});