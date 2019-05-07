const get = require("lodash.get");
const assert = require("assert");

/**
 * Creates a single test fixture for the specified modelName, with the specified data.
 * @param modelName The name of the data model that has been previously registered with the fixturesFactory
 * @param refNames The names of other data models that are referenced (linked to) the modelName
 * @param fixturesFactory The class that knows how to persist fixture data
 * @param data The fixture data to persist
 * @returns {string} The id of the newly-created fixture
 */
function createFixture(modelName, refNames, SimpleDao) {
  return (fixturesFactory, data) => {
    if (data._id) {
      assert(get(data, "_id.constructor.name") === "ObjectID", "createFixture: _id must be an ObjectID");
    }
  
    const _id = data._id || SimpleDao.objectId();
    const fixtureData = Object.assign({}, data, { _id });
    const refs = refNames.map((name) => {
      return fixturesFactory.fixtures(name);
    });
  
    return fixturesFactory.createList(modelName, 1, [fixtureData], refs);
  }
}

exports.createFixture = createFixture;
