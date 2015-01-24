"use strict";

function userSchema () {
  return  {
    type: "object",
    properties: {
      id: {
        type: "integer",
        minimum: 0,
        minimumExclusive: true
      },
      name: {
        type: "string",
        faker: "name.findName"
      },
      email: {
        type: "string",
        format: "email",
        faker: "internet.email"
      }
    },
    required: ["id", "name", "email"]
  };
}

function tagsFixture () {
  return "";
}

module.exports = function () {
  var fixtures = new Map();
  fixtures.set("user", userSchema());
  fixtures.set("tags", tagsFixture());
  return fixtures;
};