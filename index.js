// const gedetineerde = require('../model/Gedetineerde');

// let g = new Gedetineerde('1', "Klaas", "20-02-1980");
// console.log(g.naam)
// g.naam = "henk"
// console.log(g.naam)

const parser = require('mongodb-query-parser');
const chalk = require('chalk');
function limit(c) {
    return this.filter((x, i) => {
        if (i <= (c - 1)) { return true; }
    })
}
function skip(c) {
    return this.filter((x, i) => {
        if (i > (c - 1)) { return true; }
    });
}
Array.prototype.limit = limit;
Array.prototype.skip = skip;


const sdk = require('kinvey-flex-sdk');
let friendslist = [];

for (let i = 0; i < 2000; i++) {
    friendslist.push({ _id: i, name: 'Kris_' + i.toString(), age: i.toString() });
}

// kinvey flex init
// kinvey flex deploy
// kinvey flex status


// for FlexDataService implement:
// onInsert
// onUpdate
// onDeleteById
// onGetById
// onGetByQuery
// onGetCountByQuery

sdk.service((err, flex) => {
    const data = flex.data;
    const friends = data.serviceObject('friends');
    friends.onInsert(insert);
    friends.onUpdate(update);
    friends.onDeleteById(deleteById);
    friends.onGetById(getById);
    friends.onGetByQuery(getByQuery);
    friends.onGetCountByQuery(getCountByQuery);
    friends.onGetAll(getAll);
    friends.onGetCount(getCount);
});

function insert(context, complete, modules) {
    if (typeof (context.body._id == 'undefined')) {
        context.body['_id'] = friendslist[friendslist.length - 1]._id + 1;
    }
    friendslist.push(context.body);
    return complete().setBody(context.body).created().next();
}

function update(context, complete, modules) {
    for (let friend of friendslist) {
        if (friend._id === +context['entityId']) {
            friend.name = context.body['name'];
            friend.age = context.body['age'];
            return complete().setBody(friend).ok().next();
        }
    }
    return complete().notFound().done();
}

function deleteById(context, complete, modules) {
    for (let friend of friendslist) {
        if (friend._id === +context['entityId']) {
            const index = friendslist.indexOf(friend);
            if (index > -1) {
                friendslist.splice(index, 1);
            }
            return complete().setBody(friendslist).ok().next();
        }
    }
    return complete().notFound().done();
}

function getById(context, complete, modules) {
    for (let friend of friendslist) {
        if (friend._id === +context['entityId']) {
            return complete().setBody(friend).ok().next();
        }
    }
    return complete().notFound().done();
}

function getByQuery(context, complete, modules) {
    // query logic
    // query=<regex> -> javascript regex function
    // {"$and":[{"$and":[{"$and":[{},{"age":{"$regex":"^.*6.*"}}]}]}]} , {"$and":[{"$and":[{},{"name":{"$regex":"^.*jako.*"}}]}]}, 
    // queryObject.and.[0].and.[0].and.[1].age.$regex
    // look through all for regex matches
    // add those to an array and return them

    // gaat Ruben even opzoeken
    const testQuery = '{"$and":[{"$and":[{"name":{"$regex":"^.*jako.*"}}]}]}';
    console.log(parser)
    console.log(parser.validate(testQuery));

    var queryObject = parser.parseFilter(testQuery);
    console.log(queryObject);
    console.log(queryObject.$and[0].$and[0].name.$regex)


    var friendsToReturn = [];
    var urlParams = new URLSearchParams(context.query);
    if (urlParams.has('age')) {
        var queryAge = urlParams.get('age');
        for (let friend of friendslist) {
            if (friend.age.includes(queryAge)) {
                friendsToReturn.push(friend);
            }
        }
    }

    if (urlParams.has('name')) {
        var queryName = urlParams.get('name');
        for (let friend of friendslist) {
            if (friend.name.includes(queryName)) {
                friendsToReturn.push(friend);
            }
        }
    }

    if (urlParams.has('name') && urlParams.has('age')) {
        var queryName = urlParams.get('name');
        var queryAge = urlParams.get('age');
        for (let friend of friendsToReturn) {
            if (!(friend.name.includes(queryName)) || !(friend.age.includes(queryAge))) {
                const index = friendsToReturn.indexOf(friend);
                if (index > -1) {
                    friendsToReturn.splice(index, 1);
                }
            }
        }
    }

    if (urlParams.has('$regex')) {
        friendsToReturn = [];
    }

    if (urlParams.has('query')) {
        var queryRegexObject = urlParams.get('query');
        var regexObject = JSON.parse(queryRegexObject);
    }

    if (friendsToReturn.length == 0) {
        friendsToReturn = friendslist;
    }

    if (urlParams.has('limit')) {
        var queryLimit = urlParams.get('limit');
        let skip = 0;

        if (urlParams.has('skip')) {
            skip = urlParams.get('skip');
        }
        friendsToReturn = friendsToReturn.skip(skip).limit(queryLimit);
    }
    return complete().setBody(removeDuplicates(friendsToReturn)).ok().next();
}

function removeDuplicates(array) {
    return [...new Set(array)];
}
function getCountByQuery(context, complete, modules) {
    return complete().setBody(JSON.stringify({ "count": friendslist.length })).ok().next();  // er staat nergens dat het {"count": x} moet zijn bij dataservice tutorials... alleen op https://devcenter.kinvey.com/rest/guides/datastore
}

function getCount(context, complete, modules) {
    return complete().setBody(JSON.stringify({ "count": friendslist.length })).ok().next();
}

function getAll(context, complete, modules) {
    try {
        return complete().setBody(friendslist).ok().next();
    } catch {
        return complete().notFound("couldn't complete 'getAll' of FriendsFlexData").next();
    }
}