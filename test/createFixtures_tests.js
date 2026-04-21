const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const {createFixture} = require("../createFixture");

describe("createFixture", () => {
  it("should throw if _id is not an ObjectId", () => {
    function sut() {
      createFixture()(null, {_id: "not an ObjectId"});
    }
    assert.throws(sut, Error);
    assert.throws(sut, /createFixture: _id must be an ObjectID/);
  });
});
