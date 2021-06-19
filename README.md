# couchbase-store

A Couchbase store for express session

## How to use

```javascript
const express = require("express");
const session = require("express-session");
const CouchbaseStore = require("couchbase-store")(session);

const store = new CouchbaseStore({
    prefix: "session",
    ttl: 86400, //in seconds
    cluster: cluster, // couchbase cluster object
    // (provide bucket or collection)
    collection: collection, //collection object
    bucket: bucket, //will get the default collection in this bucket
});

const app = express();

app.use(
    session({
        cookie: {
            maxAge: 86400000,
            secure: false,
            httpOnly: true,
            sameSite: "lax",
        },
        store: store,
        resave: true,
        secret: process.env.SECRET_KEY,
        name: "sessionId",
        saveUninitialized: true,
    })
);

app.use("/", (req, res, next) => {
    res.send("hello");
});

app.listen(3000, () => {
    console.log("server listening on port 3000");
});
```
