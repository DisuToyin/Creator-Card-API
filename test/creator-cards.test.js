const assert = require('assert');

const CreatorCardRepository = require('@app/repository/creator-card');
const createCreatorCard = require('@app/services/creator-cards/create');
const retrievePublicCreatorCard = require('@app/services/creator-cards/retrieve-public');
const deleteCreatorCard = require('@app/services/creator-cards/delete');
const {
  serializeCreatorCardForOwnerResponse,
  serializeCreatorCardForPublicRetrieval,
} = require('../creator-cards/helpers/serialize');

const originalRepository = {
  create: CreatorCardRepository.create,
  findOne: CreatorCardRepository.findOne,
  raw: CreatorCardRepository.raw,
};

function restoreRepository() {
  CreatorCardRepository.create = originalRepository.create;
  CreatorCardRepository.findOne = originalRepository.findOne;
  CreatorCardRepository.raw = originalRepository.raw;
}

function assertAppError(error, code, message) {
  assert.strictEqual(error.isApplicationError, true);
  assert.strictEqual(error.errorCode, code);
  assert.strictEqual(error.message, message);
}

describe('creator cards', () => {
  afterEach(() => {
    restoreRepository();
  });

  describe('create', () => {
    it('normalizes provided slugs before checking uniqueness and saving', async () => {
      let uniquenessQuery;
      let createPayload;

      CreatorCardRepository.findOne = async (data) => {
        uniquenessQuery = data.query;
        return null;
      };

      CreatorCardRepository.create = async (data) => {
        createPayload = data;
        return {
          _id: '01JG8XYZA2B3C4D5E6F7G8H9J0',
          ...data,
          created: 1767052800000,
          updated: 1767052800000,
          deleted: null,
        };
      };

      const result = await createCreatorCard({
        title: 'George Cooks',
        slug: 'George-Cooks',
        creator_reference: 'crt_8f2k1m9x4p7w3q5z',
        status: 'published',
      });

      assert.deepStrictEqual(uniquenessQuery, { slug: 'george-cooks', deleted: null });
      assert.strictEqual(createPayload.slug, 'george-cooks');
      assert.strictEqual(result.slug, 'george-cooks');
      assert.strictEqual(result.id, '01JG8XYZA2B3C4D5E6F7G8H9J0');
      assert.strictEqual(result.access_code, null);
      assert.strictEqual(Object.hasOwn(result, '_id'), false);
    });

    it('returns SL02 when a provided slug is already taken by an active card', async () => {
      CreatorCardRepository.findOne = async () => ({ id: 'existing-card' });

      await assert.rejects(
        () =>
          createCreatorCard({
            title: 'George Cooks',
            slug: 'george-cooks',
            creator_reference: 'crt_8f2k1m9x4p7w3q5z',
            status: 'published',
          }),
        (error) => {
          assertAppError(error, 'SL02', 'Slug is already taken');
          return true;
        }
      );
    });

    it('returns AC01 when a private card omits access_code', async () => {
      await assert.rejects(
        () =>
          createCreatorCard({
            title: 'George Cooks',
            creator_reference: 'crt_8f2k1m9x4p7w3q5z',
            status: 'published',
            access_type: 'private',
          }),
        (error) => {
          assertAppError(
            error,
            'AC01',
            'access_code is required when access_type is private'
          );
          return true;
        }
      );
    });

    it('returns AC05 when a public card includes access_code', async () => {
      await assert.rejects(
        () =>
          createCreatorCard({
            title: 'George Cooks',
            creator_reference: 'crt_8f2k1m9x4p7w3q5z',
            status: 'published',
            access_type: 'public',
            access_code: 'A1B2C3',
          }),
        (error) => {
          assertAppError(error, 'AC05', 'access_code can only be set on private cards');
          return true;
        }
      );
    });

    it('returns a clear validation error for invalid status values', async () => {
      await assert.rejects(
        () =>
          createCreatorCard({
            title: 'George Cooks',
            creator_reference: 'crt_8f2k1m9x4p7w3q5z',
            status: 'archived',
          }),
        (error) => {
          assertAppError(error, 'VALIDATION_ERROR', '"archived" is not a valid status');
          return true;
        }
      );
    });
  });

  describe('public retrieval', () => {
    it('returns NF01 when no active card exists', async () => {
      CreatorCardRepository.findOne = async (data) => {
        assert.deepStrictEqual(data.query, { slug: 'george-cooks', deleted: null });
        return null;
      };

      await assert.rejects(
        () => retrievePublicCreatorCard({ slug: 'george-cooks' }),
        (error) => {
          assertAppError(error, 'NF01', 'Creator card not found');
          return true;
        }
      );
    });

    it('returns NF02 when the card exists but is draft', async () => {
      CreatorCardRepository.findOne = async () => ({
        id: '01JG8XYZA2B3C4D5E6F7G8H9J0',
        slug: 'george-cooks',
        status: 'draft',
        access_type: 'public',
      });

      await assert.rejects(
        () => retrievePublicCreatorCard({ slug: 'george-cooks' }),
        (error) => {
          assertAppError(error, 'NF02', 'card exists but is a draft');
          return true;
        }
      );
    });

    it('returns AC03 when a private card is retrieved without access_code', async () => {
      CreatorCardRepository.findOne = async () => ({
        id: '01JG8XYZA2B3C4D5E6F7G8H9J0',
        slug: 'george-cooks',
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      });

      await assert.rejects(
        () => retrievePublicCreatorCard({ slug: 'george-cooks' }),
        (error) => {
          assertAppError(error, 'AC03', 'This card is private. An access code is required');
          return true;
        }
      );
    });

    it('returns AC04 when a private card receives an invalid access_code', async () => {
      CreatorCardRepository.findOne = async () => ({
        id: '01JG8XYZA2B3C4D5E6F7G8H9J0',
        slug: 'george-cooks',
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      });

      await assert.rejects(
        () => retrievePublicCreatorCard({ slug: 'george-cooks', access_code: 'Z9Y8X7' }),
        (error) => {
          assertAppError(error, 'AC04', 'Invalid access code');
          return true;
        }
      );
    });

    it('omits access_code from successful retrieval responses', async () => {
      CreatorCardRepository.findOne = async () => ({
        id: '01JG8XYZA2B3C4D5E6F7G8H9J0',
        slug: 'george-cooks',
        status: 'published',
        access_type: 'private',
        access_code: 'A1B2C3',
      });

      const result = await retrievePublicCreatorCard({
        slug: 'george-cooks',
        access_code: 'A1B2C3',
      });

      assert.strictEqual(result.id, '01JG8XYZA2B3C4D5E6F7G8H9J0');
      assert.strictEqual(Object.hasOwn(result, 'access_code'), false);
      assert.strictEqual(Object.hasOwn(result, '_id'), false);
    });
  });

  describe('delete', () => {
    it('returns the soft-deleted card in owner response format', async () => {
      CreatorCardRepository.raw = () => ({
        findOneAndUpdate: async (query, updateValues, options) => {
          assert.deepStrictEqual(query, {
            slug: 'george-cooks',
            creator_reference: 'crt_8f2k1m9x4p7w3q5z',
            deleted: null,
          });
          assert.strictEqual(updateValues.deleted, updateValues.updated);
          assert.deepStrictEqual(options, { new: true, lean: true });

          return {
            _id: '01JG8XYZA2B3C4D5E6F7G8H9J0',
            title: 'George Cooks',
            slug: 'george-cooks',
            creator_reference: 'crt_8f2k1m9x4p7w3q5z',
            access_type: 'public',
            created: 1767052800000,
            updated: updateValues.updated,
            deleted: updateValues.deleted,
          };
        },
      });

      const result = await deleteCreatorCard({
        slug: 'george-cooks',
        creator_reference: 'crt_8f2k1m9x4p7w3q5z',
      });

      assert.strictEqual(result.id, '01JG8XYZA2B3C4D5E6F7G8H9J0');
      assert.strictEqual(result.access_code, null);
      assert.strictEqual(typeof result.deleted, 'number');
      assert.strictEqual(Object.hasOwn(result, '_id'), false);
    });
  });

  describe('serializers', () => {
    it('exposes id instead of _id', () => {
      const result = serializeCreatorCardForOwnerResponse({
        _id: '01JG8XYZA2B3C4D5E6F7G8H9J0',
        __v: 0,
        title: 'George Cooks',
      });

      assert.strictEqual(result.id, '01JG8XYZA2B3C4D5E6F7G8H9J0');
      assert.strictEqual(result.access_code, null);
      assert.strictEqual(Object.hasOwn(result, '_id'), false);
      assert.strictEqual(Object.hasOwn(result, '__v'), false);
    });

    it('omits access_code from public retrieval serialization', () => {
      const result = serializeCreatorCardForPublicRetrieval({
        _id: '01JG8XYZA2B3C4D5E6F7G8H9J0',
        access_code: 'A1B2C3',
      });

      assert.strictEqual(result.id, '01JG8XYZA2B3C4D5E6F7G8H9J0');
      assert.strictEqual(Object.hasOwn(result, 'access_code'), false);
    });
  });
});
