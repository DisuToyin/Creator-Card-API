const { Schema } = require('mongoose');
const { ModelSchema, SchemaTypes, DatabaseModel } = require('@app-core/mongoose');
const {
  CREATOR_CARD_SLUG_PATTERN,
  CREATOR_CARD_ACCESS_CODE_PATTERN,
  CREATOR_CARD_URL_PATTERN,
  CREATOR_CARD_CURRENCIES,
  CREATOR_CARD_STATUSES,
  CREATOR_CARD_ACCESS_TYPES,
} = require('../creator-cards/helpers/constants');
const { mongooseCreatorCardTransform } = require('../creator-cards/helpers/serialize');

const modelName = 'creator_cards';

/**
 * @typedef {Object} CreatorCard
 * @property {String} _id
 * @property {String} title
 * @property {String} description
 * @property {String} slug
 * @property {String} creator_reference
 * @property {{title: String, url: String}[]} links
 * @property {{currency: String, rates: {name: String, description: String, amount: Number}[]}} service_rates
 * @property {'draft' | 'published'} status
 * @property {'public' | 'private'} access_type
 * @property {String} access_code
 * @property {Number} created
 * @property {Number} updated
 * @property {Number|null} deleted
 */

const linkSchema = new Schema(
  {
    title: {
      type: SchemaTypes.String,
      required: true,
      minlength: 1,
      maxlength: 100,
    },
    url: {
      type: SchemaTypes.String,
      required: true,
      maxlength: 200,
      match: CREATOR_CARD_URL_PATTERN,
    },
  },
  { _id: false }
);

const serviceRateSchema = new Schema(
  {
    name: {
      type: SchemaTypes.String,
      required: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: SchemaTypes.String,
      required: true,
      maxlength: 250,
    },
    amount: {
      type: SchemaTypes.Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
    },
  },
  { _id: false }
);

const serviceRatesSchema = new Schema(
  {
    currency: {
      type: SchemaTypes.String,
      required: true,
      enum: CREATOR_CARD_CURRENCIES,
    },
    rates: {
      type: [serviceRateSchema],
      required: true,
      validate: {
        validator(rates) {
          return Array.isArray(rates) && rates.length > 0;
        },
        message: 'service_rates.rates must be non-empty when service_rates is present',
      },
    },
  },
  { _id: false }
);

const schemaConfig = {
  _id: { type: SchemaTypes.ULID, required: true },
  title: {
    type: SchemaTypes.String,
    required: true,
    minlength: 3,
    maxlength: 100,
    trim: true,
  },
  description: {
    type: SchemaTypes.String,
    maxlength: 500,
    trim: true,
  },
  slug: {
    type: SchemaTypes.String,
    required: true,
    minlength: 5,
    maxlength: 50,
    match: CREATOR_CARD_SLUG_PATTERN,
    trim: true,
  },
  creator_reference: {
    type: SchemaTypes.String,
    required: true,
    minlength: 20,
    maxlength: 20,
    trim: true,
  },
  links: {
    type: [linkSchema],
    default: [],
  },
  service_rates: {
    type: serviceRatesSchema,
  },
  status: {
    type: SchemaTypes.String,
    required: true,
    enum: CREATOR_CARD_STATUSES,
    default: 'draft',
    index: true,
  },
  access_type: {
    type: SchemaTypes.String,
    required: true,
    enum: CREATOR_CARD_ACCESS_TYPES,
    default: 'public',
  },
  access_code: {
    type: SchemaTypes.String,
    required() {
      return this.access_type === 'private';
    },
    match: CREATOR_CARD_ACCESS_CODE_PATTERN,
  },
  created: { type: SchemaTypes.Number, required: true },
  updated: { type: SchemaTypes.Number, required: true },
  deleted: { type: SchemaTypes.Number, default: null },
};

const modelSchema = new ModelSchema(schemaConfig, {
  collection: modelName,
  toJSON: {
    transform: mongooseCreatorCardTransform,
  },
  toObject: {
    transform: mongooseCreatorCardTransform,
  },
});

modelSchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted: null },
  }
);

module.exports = DatabaseModel.model(modelName, modelSchema);
