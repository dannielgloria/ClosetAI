# OpenAPI v1

The NestJS API exposes OpenAPI at:

```text
GET /api/docs
```

The API version prefix is:

```text
/api/v1
```

## Authentication

Bearer authentication is required for private wardrobe and outfit endpoints.

```text
Authorization: Bearer <access-token>
```

### Bootstrap Credentials

```text
POST /api/v1/auth/bootstrap-credentials
```

Private MVP bootstrap endpoint for attaching credentials to an existing user
created through the Household/User flow. This is not public registration. It
requires `x-setup-secret` and is disabled after the first credential exists.

Headers:

```text
x-setup-secret: <private setup secret>
```

Request:

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "password": "minimum-10-characters"
}
```

Responses:

```text
201 credentials created
400 invalid input
409 duplicate credentials or email conflict
403 missing or invalid setup secret, or bootstrap disabled
404 user not found
429 too many bootstrap attempts
```

### Provision Existing User Credentials

```text
POST /api/v1/household/users/{userId}/credentials
```

Requires Bearer auth. Provisions credentials for an existing user in the same
household as the authenticated user. This endpoint does not create users, does
not change existing credentials, and is not public registration.

Request:

```json
{
  "email": "second-user@example.com",
  "password": "minimum-10-characters"
}
```

Responses:

```text
201 credentials provisioned
400 invalid input
401 missing, invalid, expired, or revoked access token
403 target user belongs to a different household
404 target user not found
409 target user already has credentials or email is already used
```

### Login

```text
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password",
  "deviceName": "optional",
  "devicePlatform": "optional"
}
```

Responses:

```text
200 accessToken, refreshToken, user
401 invalid credentials
429 too many login attempts
```

### Refresh

```text
POST /api/v1/auth/refresh
```

Request:

```json
{
  "refreshToken": "sessionId.randomSecret"
}
```

Responses:

```text
200 new accessToken, new refreshToken, user
401 invalid, expired, revoked, or reused refresh token
429 too many refresh attempts
```

Successful refresh rotates the refresh token. Reusing an older refresh token
revokes the session.

### Logout

```text
POST /api/v1/auth/logout
```

Requires Bearer auth.

Responses:

```text
200 session revoked
401 missing, invalid, expired, or revoked access token
429 not applied
```

### Me

```text
GET /api/v1/auth/me
```

Requires Bearer auth.

Responses:

```text
200 authenticated user
401 missing, invalid, expired, or revoked access token
429 not applied
```

## Profile and Weather

### Configure My Weather Location

```text
PATCH /api/v1/me/location
```

Requires Bearer auth. Stores an approximate user-configured location used only
for weather enrichment. The API does not accept `userId`; the user is derived
from the access token.

Request:

```json
{
  "city": "Ciudad de Mexico",
  "latitude": 19.4326,
  "longitude": -99.1332,
  "timezone": "America/Mexico_City"
}
```

Responses:

```text
200 location updated
400 invalid location or unexpected fields
401 missing, invalid, expired, or revoked access token
```

### Current Weather

```text
GET /api/v1/weather/current
```

Requires Bearer auth. Returns normalized weather for the authenticated user's
configured approximate location. The API does not expose raw Open-Meteo
responses.

Response:

```json
{
  "temperature": 18,
  "apparentTemperature": 17,
  "minTemperature": 14,
  "maxTemperature": 22,
  "rainProbability": 45,
  "windSpeed": 12,
  "humidity": 68
}
```

Responses:

```text
200 normalized weather context
401 missing, invalid, expired, or revoked access token
404 user location is not configured
503 weather provider unavailable
```

## Context Interpretation

### Interpret Context

```text
POST /api/v1/context/interpret
```

Requires Bearer auth. Converts natural-language user plans into structured
activity context. The endpoint does not select garments, generate outfits,
persist context, or modify wardrobe state.

Request:

```json
{
  "text": "Hoy voy al gimnasio a las cinco y despues tengo una cena informal."
}
```

Response:

```json
{
  "activities": [
    {
      "type": "GYM",
      "time": "17:00"
    },
    {
      "type": "CASUAL_DINNER",
      "time": null
    }
  ]
}
```

Allowed activity types:

```text
HOME
HOME_OFFICE
OFFICE
GYM
RUNNING
CASUAL_OUTING
DINNER
CASUAL_DINNER
DATE
PARTY
FORMAL_EVENT
TRAVEL
WALK
```

Responses:

```text
200 structured interpreted context
400 invalid input
401 missing, invalid, expired, or revoked access token
503 AI provider unavailable or invalid provider output
```

## MVP Wardrobe Endpoints

Authenticated endpoints derive the user from the access token. Clients must not
send `userId` for normal wardrobe or outfit actions.

```text
POST /api/v1/households/{householdId}/users
POST /api/v1/garments
GET  /api/v1/garments
GET  /api/v1/garments/available
POST /api/v1/garment-images
POST /api/v1/garment-images/{imageId}/analyze
GET  /api/v1/garment-images/{imageId}
POST /api/v1/outfit-recommendations
POST /api/v1/outfits/{outfitId}/select
POST /api/v1/outfits/{outfitId}/confirm-usage
POST /api/v1/outfits/{outfitId}/feedback
```

### Create Garment

```text
POST /api/v1/garments
```

Requires Bearer auth. Creates a garment for the authenticated user. For assisted
registration, clients may pass an authenticated `imageId` that was previously
uploaded and analyzed. The backend creates the garment and links the image in a
single transaction.

Request:

```json
{
  "category": "TOP",
  "subcategory": "T_SHIRT",
  "primaryColor": "CREAM",
  "secondaryColors": ["BLACK"],
  "pattern": "SOLID",
  "fit": "REGULAR",
  "estimatedMaterial": "COTTON",
  "formality": 2,
  "status": "CLEAN_AVAILABLE",
  "name": "Cream tee",
  "imageId": "uuid"
}
```

Responses:

```text
201 garment created
400 invalid metadata
401 missing, invalid, expired, or revoked access token
403 image belongs to another user
404 user or image not found
```

### Upload Garment Image

```text
POST /api/v1/garment-images
```

Requires Bearer auth and `multipart/form-data`.

Form fields:

```text
image=<file>
```

Allowed MIME types:

```text
image/jpeg
image/png
image/webp
```

Maximum size is configured by `GARMENT_IMAGE_MAX_SIZE_MB`.

Response:

```json
{
  "id": "uuid",
  "status": "UPLOADED"
}
```

Responses:

```text
201 image uploaded
400 missing, empty, unsupported, or oversized image
401 missing, invalid, expired, or revoked access token
```

### Analyze Garment Image

```text
POST /api/v1/garment-images/{imageId}/analyze
```

Requires Bearer auth. Runs OpenAI Vision on an image owned by the authenticated
user and returns proposed metadata only. This endpoint does not create a
garment.

Response:

```json
{
  "category": "TOP",
  "subcategory": "T_SHIRT",
  "primaryColor": "CREAM",
  "secondaryColors": ["BLACK"],
  "pattern": "SOLID",
  "fit": "REGULAR",
  "estimatedMaterial": "COTTON",
  "formality": 2
}
```

Responses:

```text
200 proposed metadata
401 missing, invalid, expired, or revoked access token
403 image belongs to another user
404 image not found
503 AI provider unavailable or invalid provider output
```

### Fetch Garment Image

```text
GET /api/v1/garment-images/{imageId}
```

Requires Bearer auth. Returns private image bytes after ownership validation.
No physical object-storage path is exposed.

Responses:

```text
200 image bytes
401 missing, invalid, expired, or revoked access token
403 image belongs to another user
404 image not found
```

### Generate Outfit Recommendations

```text
POST /api/v1/outfit-recommendations
```

Requires Bearer auth. Generates up to three outfit recommendations from the
authenticated user's eligible garments. When structured context is supplied, the
backend filters candidates deterministically before asking the OpenAI outfit
stylist to rank/compose recommendations. OpenAI may only return garment IDs from
the candidate set. The backend validates IDs, ownership, availability,
duplicates, score range, and minimum category requirements before persistence.

If the AI stylist is unavailable or returns malformed output, the backend falls
back to the deterministic basic outfit engine when enough eligible garments
exist.

Request with context:

```json
{
  "context": {
    "activities": [
      {
        "type": "CASUAL_DINNER",
        "time": "20:00"
      }
    ]
  }
}
```

Request without context:

```json
{}
```

Response:

```json
{
  "strategy": "AI",
  "weatherStatus": "AVAILABLE",
  "weather": {
    "temperature": 18,
    "apparentTemperature": 17,
    "minTemperature": 14,
    "maxTemperature": 22,
    "rainProbability": 45,
    "windSpeed": 12,
    "humidity": 68
  },
  "recommendations": [
    {
      "id": "uuid",
      "userId": "uuid",
      "status": "PRESENTED",
      "items": [
        {
          "garmentId": "uuid",
          "position": 0
        }
      ],
      "explanation": "Suitable for a casual dinner.",
      "score": 91,
      "selectedAt": null,
      "wornAt": null,
      "createdAt": "2026-08-24T00:00:00.000Z",
      "updatedAt": "2026-08-24T00:00:00.000Z"
    }
  ]
}
```

Strategies:

```text
AI
DETERMINISTIC_FALLBACK
```

Weather status:

```text
AVAILABLE
UNAVAILABLE
NOT_CONFIGURED
```

Responses:

```text
201 recommendations persisted
400 invalid context, insufficient garments, or invalid AI recommendation
401 missing, invalid, expired, or revoked access token
```

### Submit Outfit Feedback

```text
POST /api/v1/outfits/{outfitId}/feedback
```

Requires Bearer auth. Records explicit feedback for an outfit as an independent
history event. Feedback does not select an outfit, mark it as worn, delete it,
or change the outfit state.

Request:

```json
{
  "decision": "REJECTED",
  "reason": "Too formal"
}
```

`decision` must be one of:

```text
ACCEPTED
REJECTED
```

`reason` is optional and may contain at most 500 characters.

Response:

```json
{
  "id": "uuid",
  "outfitId": "uuid",
  "decision": "REJECTED",
  "reason": "Too formal",
  "createdAt": "2026-08-24T00:00:00.000Z"
}
```

For MVP v1, feedback is append-only history: the same user may submit multiple
feedback events for the same outfit over time. No idempotency key is introduced
for this endpoint.

Responses:

```text
201 feedback persisted
400 invalid decision or reason
401 missing, invalid, expired, or revoked access token
403 outfit belongs to another user
404 outfit not found
```
