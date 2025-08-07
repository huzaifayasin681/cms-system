import mongoose from 'mongoose';

// Helper functions to handle Mongoose type assertion issues
export const mongooseQuery = (queryFn: any) => queryFn as any;

export const handleError = (error: unknown): string => {
  return error instanceof Error ? error.message : 'Unknown error';
};

// Type assertion utilities for Mongoose operations
export const safeFind = (model: any, query: any, options?: any) => {
  return model.find(query, options) as any;
};

export const safeFindOne = (model: any, query: any, options?: any) => {
  return model.findOne(query, options) as any;
};

export const safeFindById = (model: any, id: any, projection?: any, options?: any) => {
  return model.findById(id, projection, options) as any;
};

export const safeFindByIdAndUpdate = (model: any, id: any, update: any, options?: any) => {
  return model.findByIdAndUpdate(id, update, options) as any;
};

export const safeFindByIdAndDelete = (model: any, id: any, options?: any) => {
  return model.findByIdAndDelete(id, options) as any;
};

// Cast ObjectId safely
export const castObjectId = (id: any): mongoose.Types.ObjectId => {
  return id as mongoose.Types.ObjectId;
};

// Cast document with methods safely
export const castDocument = (doc: any) => {
  return doc as any;
};