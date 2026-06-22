const repositoryFactory = require('@app-core/repository-factory');
const { serializeCreatorCard } = require('../../creator-cards/helpers/serialize');

const repository = repositoryFactory('CreatorCard');

module.exports = {
  ...repository,
  async create(data, options) {
    return serializeCreatorCard(await repository.create(data, options));
  },
  async createMany(data) {
    const result = await repository.createMany(data);

    if (result?.createdRecords) {
      return {
        ...result,
        createdRecords: serializeCreatorCard(result.createdRecords),
      };
    }

    return serializeCreatorCard(result);
  },
  async findOne(data) {
    return serializeCreatorCard(await repository.findOne(data));
  },
  async findMany(data) {
    return serializeCreatorCard(await repository.findMany(data));
  },
};
