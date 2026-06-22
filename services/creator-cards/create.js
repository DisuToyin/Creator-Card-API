/* eslint-disable no-await-in-loop */
const crypto = require('crypto');
const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-card');
const {
  CREATOR_CARD_SLUG_PATTERN,
  CREATOR_CARD_ACCESS_CODE_PATTERN,
  CREATOR_CARD_CURRENCIES,
  CREATOR_CARD_STATUSES,
  CREATOR_CARD_ACCESS_TYPES,
} = require('../../creator-cards/helpers/constants');
const { serializeCreatorCardForOwnerResponse } = require('../../creator-cards/helpers/serialize');

const currencyValues = CREATOR_CARD_CURRENCIES.join('|');
const statusValues = CREATOR_CARD_STATUSES.join('|');
const accessTypeValues = CREATOR_CARD_ACCESS_TYPES.join('|');

const createCreatorCardSpec = `root {
  title string<trim|lengthBetween:3,100>
  description? string<trim|maxLength:500>
  slug? string<trim|lengthBetween:5,50>
  creator_reference string<trim|length:20>
  links[]? {
    title string<trim|lengthBetween:1,100>
    url string<trim|maxLength:200|startsWith:http>
  }
  service_rates? {
    currency string(${currencyValues})
    rates[] {
      name string<trim|lengthBetween:3,100>
      description string<trim|maxLength:250>
      amount number<min:1>
    }
  }
  status string(${statusValues})
  access_type? string(${accessTypeValues})
  access_code? string<trim|length:6>
}`;

const parsedCreateCreatorCardSpec = validator.parse(createCreatorCardSpec);

function validateInput(serviceData) {
  try {
    return validator.validate(serviceData, parsedCreateCreatorCardSpec);
  } catch (e) {
    if (serviceData.status && e.message.includes("status's value")) {
      throwAppError(`"${serviceData.status}" is not a valid status`, ERROR_CODE.VALIDATIONERR);
    }

    throwAppError(e.message, ERROR_CODE.VALIDATIONERR);
  }
}

function randomAlphanumeric(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);

  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

function createSlugFromTitle(title) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '');
}

function normalizeProvidedSlug(slug) {
  return slug.toLowerCase();
}

function truncateSlug(slug, maxLength) {
  return slug.slice(0, maxLength).replace(/[-_]+$/g, '');
}

async function slugExists(slug) {
  const existingCreatorCard = await CreatorCard.findOne({
    query: { slug, deleted: null },
  });

  return !!existingCreatorCard;
}

async function generateUniqueSlug(title) {
  const baseSlug = truncateSlug(createSlugFromTitle(title), 50);

  if (baseSlug.length >= 5 && !(await slugExists(baseSlug))) {
    return baseSlug;
  }

  let generatedSlug;

  do {
    const suffix = randomAlphanumeric(6);
    const prefix = truncateSlug(baseSlug || 'card', 43);

    generatedSlug = `${prefix}-${suffix}`;
  } while (await slugExists(generatedSlug));

  return generatedSlug;
}

function normalizeAccess(data) {
  const accessType = data.access_type || 'public';

  if (accessType === 'public' && data.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_PUBLIC_FORBIDDEN, 'AC05');
  }

  if (accessType === 'private' && !data.access_code) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_PRIVATE_REQUIRED, 'AC01');
  }

  if (data.access_code && !CREATOR_CARD_ACCESS_CODE_PATTERN.test(data.access_code)) {
    throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE_FORMAT, ERROR_CODE.VALIDATIONERR);
  }

  return accessType;
}

function validateServiceRates(data) {
  if (!data.service_rates) return;

  data.service_rates.rates.forEach((rate) => {
    if (!Number.isInteger(rate.amount)) {
      throwAppError(CreatorCardMessages.INVALID_SERVICE_RATE_AMOUNT, ERROR_CODE.VALIDATIONERR);
    }
  });
}

async function createCreatorCard(serviceData) {
  const data = validateInput(serviceData);
  const accessType = normalizeAccess(data);

  validateServiceRates(data);

  if (data.slug) {
    data.slug = normalizeProvidedSlug(data.slug);
  }

  if (data.slug && !CREATOR_CARD_SLUG_PATTERN.test(data.slug)) {
    throwAppError(CreatorCardMessages.INVALID_SLUG_FORMAT, ERROR_CODE.VALIDATIONERR);
  }

  if (data.slug && (await slugExists(data.slug))) {
    throwAppError(CreatorCardMessages.SLUG_ALREADY_TAKEN, 'SL02');
  }

  const slug = data.slug || (await generateUniqueSlug(data.title));

  try {
    const creatorCard = await CreatorCard.create({
      ...data,
      slug,
      access_type: accessType,
    });

    return serializeCreatorCardForOwnerResponse(creatorCard);
  } catch (e) {
    if (parseInt(e.code, 10) === 11000 || e.errorCode === ERROR_CODE.DUPLRCRD) {
      throwAppError(CreatorCardMessages.SLUG_ALREADY_TAKEN, 'SL02');
    }

    throw e;
  }
}

module.exports = createCreatorCard;
