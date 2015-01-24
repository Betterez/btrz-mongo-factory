"use strict";

function accountFixture () {
  return "";
}

module.exports = function () {
  var fixtures = new Map();
  fixtures.set("account", accountFixture());
  return fixtures;
};