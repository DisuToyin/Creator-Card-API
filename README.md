# Creator Cards API

A Node.js/Express API for managing creator profile cards with shareable public links, private access codes, service rates, soft deletes, and MongoDB persistence.

## Setup

```bash
npm install
```

Create a `.env` file with:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/cards_api
```

Run the app:

```bash
node bootstrap.js
```

## Endpoints

```text
POST   /creator-cards
GET    /creator-cards/:slug
DELETE /creator-cards/:slug
```

No auth is required. The routes are mounted at the root of the base URL with no `/v1` prefix.

## Create Creator Card

```text
POST /creator-cards
```

Request:

```json
{
  "title": "George Cooks",
  "description": "George Cooks is a weekly cooking podcast by Chef George AmadiObi",
  "slug": "george-cooks",
  "creator_reference": "crt_8f2k1m9x4p7w3q5z",
  "links": [
    {
      "title": "YouTube Channel",
      "url": "https://youtube.com/@georgecooks"
    },
    {
      "title": "Instagram",
      "url": "https://instagram.com/georgecooks"
    }
  ],
  "service_rates": {
    "currency": "NGN",
    "rates": [
      {
        "name": "IG Story Post",
        "description": "One Instagram story mention",
        "amount": 5000000
      },
      {
        "name": "Recipe Feature",
        "description": "Featured recipe segment on the podcast",
        "amount": 15000000
      }
    ]
  },
  "status": "published",
  "access_type": "public"
}
```

Response:

```json
{
  "status": "success",
  "message": "Creator Card Created Successfully.",
  "data": {
    "id": "01JG8XYZA2B3C4D5E6F7G8H9J0",
    "title": "George Cooks",
    "description": "George Cooks is a weekly cooking podcast by Chef George AmadiObi",
    "slug": "george-cooks",
    "creator_reference": "crt_8f2k1m9x4p7w3q5z",
    "links": [
      {"title": "YouTube Channel", "url": "https://youtube.com/@georgecooks"},
      {"title": "Instagram", "url": "https://instagram.com/georgecooks"}
    ],
    "service_rates": {
      "currency": "NGN",
      "rates": [
        {"name": "IG Story Post", "description": "One Instagram story mention", "amount": 5000000},
        {"name": "Recipe Feature", "description": "Featured recipe segment on the podcast", "amount": 15000000}
      ]
    },
    "status": "published",
    "access_type": "public",
    "access_code": null,
    "created": 1767052800000,
    "updated": 1767052800000,
    "deleted": null
  }
}
```

If `slug` is omitted, the service generates one from the title. Client-provided slugs are trimmed by validation and normalized to lowercase before uniqueness checks and persistence.

## Retrieve Creator Card

```text
GET /creator-cards/george-cooks
```

Private cards require an access code:

```text
GET /creator-cards/george-cooks?access_code=A1B2C3
```

Request parameters:

```json
{
  "slug": "george-cooks",
  "access_code": "A1B2C3"
}
```

Response:

```json
{
  "status": "success",
  "message": "Creator Card Retrieved Successfully.",
  "data": {
    "id": "01JG8XYZA2B3C4D5E6F7G8H9J0",
    "title": "George Cooks",
    "description": "George Cooks is a weekly cooking podcast by Chef George AmadiObi",
    "slug": "george-cooks",
    "creator_reference": "crt_8f2k1m9x4p7w3q5z",
    "links": [
      {"title": "YouTube Channel", "url": "https://youtube.com/@georgecooks"}
    ],
    "service_rates": {
      "currency": "NGN",
      "rates": [
        {"name": "IG Story Post", "description": "One Instagram story mention", "amount": 5000000}
      ]
    },
    "status": "published",
    "access_type": "public",
    "created": 1767052800000,
    "updated": 1767052800000,
    "deleted": null
  }
}
```

Retrieval responses omit `access_code` entirely, even for private cards accessed with the correct code.

## Delete Creator Card

```text
DELETE /creator-cards/george-cooks
```

Request:

```json
{
  "slug": "george-cooks",
  "creator_reference": "crt_8f2k1m9x4p7w3q5z"
}
```

Delete is a soft delete. The card remains in MongoDB with a numeric `deleted` timestamp, and public retrieval returns `NF01` afterward.

If the slug exists but the supplied `creator_reference` does not match, the API still returns `NF01`. This avoids revealing whether a card exists to callers that do not know the creator reference.

Response:

```json
{
  "status": "success",
  "message": "Creator Card Deleted Successfully.",
  "data": {
    "id": "01JG8XYZA2B3C4D5E6F7G8H9J0",
    "title": "George Cooks",
    "description": "George Cooks is a weekly cooking podcast by Chef George AmadiObi",
    "slug": "george-cooks",
    "creator_reference": "crt_8f2k1m9x4p7w3q5z",
    "status": "published",
    "access_type": "public",
    "access_code": null,
    "created": 1767052800000,
    "updated": 1767139200000,
    "deleted": 1767139200000
  }
}
```

## Validation And Errors

Field-level validation uses the template VSL validator and returns HTTP 400.

Custom business-rule errors:

```text
SL02  400  Slug is already taken
AC01  400  access_code is required when access_type is private
AC05  400  access_code can only be set on private cards
NF01  404  Creator card not found
NF02  404  card exists but is a draft
AC03  403  This card is private. An access code is required
AC04  403  Invalid access code
```

Example error:

```json
{
  "status": "error",
  "message": "Slug is already taken",
  "code": "SL02"
}
```

## Implemented Additions

- Client-provided slugs are normalized to lowercase before uniqueness checks and persistence.
- Slug uniqueness checks only active cards, so soft-deleted cards do not block slug reuse.
- Duplicate-key races are caught and returned as `SL02`.
- Delete sets `deleted` and `updated` to the same timestamp.
- Focused Creator Card tests cover custom business errors, slug normalization, serialization, public retrieval access rules, and delete behavior.

## Tests

Run the focused Creator Cards tests:

```bash
npx mocha test/creator-cards.test.js --require dotenv/config
```
