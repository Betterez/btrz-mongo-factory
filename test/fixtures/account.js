"use strict";

function accountFixture () {
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
      "tags": {
          "type": "array",
          "description": "A collection of tags",
          "items": {
            "$ref": "tag"
          },
          "minItems": 2,
          "uniqueItems": false
      }
    },
    required: ["id", "name", "tags"]
  };
}

function tagsFixture() {
  return  {
    type: "object",
    id: "tag",
    properties: {
      id: {
        type: "integer",
        minimum: 0,
        minimumExclusive: true
      },
      name: {
        type: "string",
        faker: "name.findName"
      }
    },
    required: ["id", "name"]
  };
}

module.exports = function () {
  var fixtures = new Map();
  fixtures.set("account", accountFixture());
  fixtures.set("tags", tagsFixture());
  return fixtures;
};