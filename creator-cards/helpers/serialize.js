function serializeCreatorCard(record) {
  if (!record) return record;
  if (Array.isArray(record)) return record.map(serializeCreatorCard);

  const normalizedRecord = record.toObject ? record.toObject() : { ...record };
  const { _id, __v, ...serializedCard } = normalizedRecord;

  if (!_id) return serializedCard;

  return {
    ...serializedCard,
    id: _id,
  };
}

function mongooseCreatorCardTransform(_doc, ret) {
  return serializeCreatorCard(ret);
}

function serializeCreatorCardForPublicRetrieval(record) {
  const serializedCard = serializeCreatorCard(record);

  if (!serializedCard) return serializedCard;

  const { access_code: _accessCode, ...publicCard } = serializedCard;

  return publicCard;
}

function serializeCreatorCardForOwnerResponse(record) {
  const serializedCard = serializeCreatorCard(record);

  if (!serializedCard) return serializedCard;

  return {
    ...serializedCard,
    access_code: serializedCard.access_code || null,
  };
}

module.exports = {
  serializeCreatorCard,
  serializeCreatorCardForOwnerResponse,
  serializeCreatorCardForPublicRetrieval,
  mongooseCreatorCardTransform,
};
