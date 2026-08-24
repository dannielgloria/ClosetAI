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
created through the Household/User flow. This is not public registration.

Request:

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "password": "minimum-8-characters"
}
```

Responses:

```text
201 credentials created
400 invalid input or duplicate credentials
404 user not found
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
401 invalid email or password
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
```

## MVP Wardrobe Endpoints

Authenticated endpoints derive the user from the access token. Clients must not
send `userId` for normal wardrobe or outfit actions.

```text
POST /api/v1/garments
GET  /api/v1/garments
GET  /api/v1/garments/available
POST /api/v1/outfit-recommendations
POST /api/v1/outfits/{outfitId}/select
POST /api/v1/outfits/{outfitId}/confirm-usage
```
