module.exports = function (session) {
    const Store = session.Store;
    const noop = (...args) => {};
    class CouchbaseStore extends Store {
        constructor(options = {}) {
            super(options);
            if (!options.cluster) {
                throw new Error(
                    "A cluster must be directly provided to the Couchbase Store"
                );
            }
            if (!options.bucket && !options.collection) {
                throw new Error(
                    "A bucket or collection must be directly provided to the Couchbase Store"
                );
            }

            this.prefix = options.prefix == null ? "session" : options.prefix;
            this.serializer = options.serializer;
            this.cluster = options.cluster;
            this.bucket = options.bucket ? options.bucket : null;
            this.collection = options.collection
                ? options.collection
                : this.bucket.defaultCollection();
            this.logger = options.logger || console;
            this.ttl = options.ttl || 86400; // One day in seconds.
            this.disableTTL = options.disableTTL || false;
            this.disableTouch = options.disableTouch || false;
        }

        get(sid, callback = noop) {
            this._getDocument(this.prefix, sid)
                .then((document) => {
                    if (this.serializer) {
                        try {
                            document = this.serializer.parse(document);
                        } catch (error) {
                            callback(error);
                        }
                    }
                    callback(null, document);
                })
                .catch((error) => {
                    callback(error);
                });
        }

        destroy(sid, callback = noop) {
            this._removeDocument(this.prefix, sid)
                .then(() => callback(null))
                .catch((error) => {
                    callback(error);
                });
        }

        set(sid, session, callback = noop) {
            let value = session;
            let ttl = 1;
            const options = {};
            if (!this.disableTTL) {
                ttl = this._getTTL(session);
                options.expiry = ttl;
            }
            session.KTAB = this.prefix;
            if (this.serializer) {
                value = this.serializer.stringify(session);
            }
            if (ttl > 0) {
                this._upsertDocument(this.prefix, sid, value, options)
                    .then(() => callback(null))
                    .catch((error) => {
                        callback(error);
                    });
            } else {
                this.destroy(sid, callback);
            }
        }

        touch(sid, session, callback) {
            if (this.disableTouch || this.disableTTL) return callback();
            const ttl = this._getTTL(session);
            this._updateExpiry(this.prefix, sid, ttl)
                .then(() => callback("OK"))
                .catch((error) => {
                    callback(null, "EXPIRED");
                });
        }

        all(callback) {
            throw new Error("Method Unimplemented");
        }

        clear(callback) {
            throw new Error("Method Unimplemented");
        }

        length(callback) {
            throw new Error("Method Unimplemented");
        }

        _getTTL(sess) {
            let ttl;
            if (sess && sess.cookie && sess.cookie.expires) {
                let ms = Number(new Date(sess.cookie.expires)) - Date.now();
                ttl = Math.ceil(ms / 1000);
            } else {
                ttl = this.ttl;
            }
            return ttl;
        }

        async _addDocument(type, id, document, options) {
            const key = this._getKey(type, id);
            try {
                const result = await this.collection.insert(
                    key,
                    document,
                    options
                );
                return result;
            } catch (error) {
                this._handleError(error);
            }
        }

        async _upsertDocument(type, id, document, options) {
            const key = this._getKey(type, id);
            try {
                const result = await this.collection.upsert(
                    key,
                    document,
                    options
                );
                return result;
            } catch (error) {
                this._handleError(error);
            }
        }

        async _removeDocument(type, id) {
            const key = this._getKey(type, id);
            try {
                const result = this.collection.remove(key);
                return result;
            } catch (error) {
                this._handleError(error);
            }
        }

        async _getDocument(type, id) {
            const key = this._getKey(type, id);
            try {
                const result = await this.collection.get(key);
                return result.content;
            } catch (error) {
                if (error.message === "document not found") {
                    return null;
                }
                this._handleError(error);
            }
        }

        async _updateExpiry(type, id, time) {
            const key = this._getKey(type, id);
            try {
                const result = await this.collection.touch(key, time);
            } catch (error) {
                this._handleError(error);
            }
        }

        _getKey(type, id) {
            return `${type}-${id}`;
        }

        _handleError(error) {
            this.logger.error(error.message);
            this.logger.debug(error);
            throw error;
        }
    }
    return CouchbaseStore;
};
