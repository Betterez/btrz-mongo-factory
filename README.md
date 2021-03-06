# btrz-mongo-factory

Factory to create data in mongodb from a json-schema with the ability to override values.

## Runtimes supported

io.js >= 1.0.3
node v0.11.x with the --harmony flag

## Usage

Add the module to your `package.json` directly or just run

    npm install btrz-mongo-factory --save


You need to create fixture files. Each file can contain more than one fixture.Fixtures define an object using Json-Schema.

We took a dependency on `json-schema-faker` to auto-generate objects based on those schemas and save to the db.
Given you have a fixture named "user", you can create and save a an object with the user schema into a MongoDb collection by the name of `user` with one call.

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
    let factory = new MongoFactory(options);
    factory.create("user");

#### .create()

You can create a single user with random values calling the create method with the fixture name.

    factory.create("user");

You can override one or more values for the object given an options literal with the desired values to the create method of the factory.

    factory.create("user", {name: "John Smith"});

The user will be create with the name: John Smith.

If your schema have `$ref` you can pass that as the third parameter. (Leave the second parameter empty if you don't want to override anything);

    // addressSchema is another schema
    factory.create("user", {}, addressSchema);

You can create multiple users at once using the createList methods.

    factory.createList("user", 3);

This will create 3 records in mongo for the `user` collection. They will all be different.

Of course, you can override values on those objects. Notice that the override will be applied to all the records.

Ex: We want to make sure all user(s) are "active".

    factory.createList("user", 4, {status: "active"});

This will create 4 users and they all will be active.

You can clean up the db calling the `clearAll` method.

This method will remove all objects created by the instance.

    factory.clearAll();


### Fixtures and schemas
