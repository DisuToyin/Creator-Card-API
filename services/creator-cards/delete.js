const validator = require('@app-core/validator');
const { throwAppError, ERROR_CODE } = require('@app-core/errors');
const { CreatorCardMessages } = require('@app/messages');
const CreatorCard = require('@app/repository/creator-card');
const { serializeCreatorCardForOwnerResponse } = require('../../creator-cards/helpers/serialize');

const deleteCreatorCardSpec = `root {
  creator_reference string<trim|length:20>
}`;

const parsedDeleteCreatorCardSpec = validator.parse(deleteCreatorCardSpec);

function validateInput(serviceData) {
  try {
    return validator.validate(serviceData, parsedDeleteCreatorCardSpec);
  } catch (e) {
    throwAppError(e.message, ERROR_CODE.VALIDATIONERR);
  }
}

async function deleteCreatorCard(serviceData) {
  const { slug, ...requestData } = serviceData;
  const data = validateInput(requestData);
  const deleted = Date.now();

  const deletedCreatorCard = await CreatorCard.raw().findOneAndUpdate(
    {
      slug,
      creator_reference: data.creator_reference,
      deleted: null,
    },
    {
      deleted,
      updated: deleted,
    },
    {
      new: true,
      lean: true,
    }
  );

  if (!deletedCreatorCard) {
    throwAppError(CreatorCardMessages.CREATOR_CARD_NOT_FOUND, 'NF01');
  }

  return serializeCreatorCardForOwnerResponse(deletedCreatorCard);
}

module.exports = deleteCreatorCard;
