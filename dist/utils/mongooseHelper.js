"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.castDocument = exports.castObjectId = exports.safeFindByIdAndDelete = exports.safeFindByIdAndUpdate = exports.safeFindById = exports.safeFindOne = exports.safeFind = exports.handleError = exports.mongooseQuery = void 0;
const mongooseQuery = (queryFn) => queryFn;
exports.mongooseQuery = mongooseQuery;
const handleError = (error) => {
    return error instanceof Error ? error.message : 'Unknown error';
};
exports.handleError = handleError;
const safeFind = (model, query, options) => {
    return model.find(query, options);
};
exports.safeFind = safeFind;
const safeFindOne = (model, query, options) => {
    return model.findOne(query, options);
};
exports.safeFindOne = safeFindOne;
const safeFindById = (model, id, projection, options) => {
    return model.findById(id, projection, options);
};
exports.safeFindById = safeFindById;
const safeFindByIdAndUpdate = (model, id, update, options) => {
    return model.findByIdAndUpdate(id, update, options);
};
exports.safeFindByIdAndUpdate = safeFindByIdAndUpdate;
const safeFindByIdAndDelete = (model, id, options) => {
    return model.findByIdAndDelete(id, options);
};
exports.safeFindByIdAndDelete = safeFindByIdAndDelete;
const castObjectId = (id) => {
    return id;
};
exports.castObjectId = castObjectId;
const castDocument = (doc) => {
    return doc;
};
exports.castDocument = castDocument;
