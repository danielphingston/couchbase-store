import * as express from "express";
import * as session from "express-session";
import * as couchbase from "couchbase";

function CouchbaseStore(
    options: (options?: session.SessionOptions) => express.RequestHandler
): CouchbaseStore.CouchbaseStore;

namespace CouchbaseStore {
    type Client = Cluster;

    interface CouchbaseStore extends session.Store {
        /**
         *
         * Provide either bucket or collection object.
         * If a bucket is provided bucket.defaultCollection() is used as the collection
         * else the given bucket is used
         */
        new (options: CouchbaseStoreOptions): CouchbaseStore;
        client: Client;
    }
    interface CouchbaseStoreOptions {
        cluster: Cluster;
        bucket?: Bucket;
        collection?: Collection;
        prefix?: string;
        serializer?: Serializer | JSON;
        logger?: Logger;
        ttl?: number;
        disableTTL?: boolean;
        disableTouch?: boolean;
    }
    interface Serializer {
        stringify: Function;
        parse: Function;
    }
    interface Logger {
        info: Function;
        error: Function;
        debug: Function;
    }
}
export = CouchbaseStore;
