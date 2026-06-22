const { createHandler } = require('@app-core/server');
const retrievePublicCreatorCard = require('@app/services/creator-cards/retrieve-public');

module.exports = createHandler({
  path: '/creator-cards/:slug',
  method: 'get',
  middlewares: [],
  async handler(rc, helpers) {
    const creatorCard = await retrievePublicCreatorCard({
      slug: rc.params.slug,
      access_code: rc.query.access_code,
    });

    return {
      status: helpers.http_statuses.HTTP_200_OK,
      message: 'Creator Card Retrieved Successfully.',
      data: creatorCard,
    };
  },
});
