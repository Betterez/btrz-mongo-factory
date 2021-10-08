describe("createFixture", () => {
  const expect= require("chai").expect;
  const {createFixture} = require("../createFixture");
  it("should throw if _id is not an ObjectId", () => {
    function sut() {
      createFixture()(null, {_id: "not an ObjectId"});
    }
    expect(sut).to.throw(Error);
    expect(sut).to.throw("createFixture: _id must be an ObjectID");
  });
});
