const { throwAppError } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-card');
const { serializeCreatorCardForPublicRetrieval } = require('../../creator-cards/helpers/serialize');

async function retrievePublicCreatorCard(serviceData) {
  const { slug, access_code: accessCode } = serviceData;

  const creatorCard = await CreatorCard.findOne({
    query: { slug, deleted: null },
  });

  if (!creatorCard) {
    throwAppError(CreatorCardMessages.CREATOR_CARD_NOT_FOUND, 'NF01');
  }

  if (creatorCard.status === 'draft') {
    throwAppError(CreatorCardMessages.CREATOR_CARD_IS_DRAFT, 'NF02');
  }

  if (creatorCard.access_type === 'private' && !accessCode) {
    throwAppError(CreatorCardMessages.ACCESS_CODE_REQUIRED, 'AC03');
  }

  if (creatorCard.access_type === 'private' && creatorCard.access_code !== accessCode) {
    throwAppError(CreatorCardMessages.INVALID_ACCESS_CODE, 'AC04');
  }

  return serializeCreatorCardForPublicRetrieval(creatorCard);
}

module.exports = retrievePublicCreatorCard;
