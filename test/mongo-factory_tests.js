/*jshint expr: true*/
"use strict";

describe("MongoFactory", function () {

  let MongoFactory = require("../"),
    expect = require("chai").expect,
    factory;

  beforeEach(function () {
    let options = {
      fixtures: "/test/fixtures",
      "db": {
          "options": {
            "database": "betterez_core",
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
  });
});