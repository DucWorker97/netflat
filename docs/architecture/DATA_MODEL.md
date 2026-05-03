# Data Model Overview

Updated: 2026-03-14
Source: apps/api/prisma/schema.prisma

## 1. Main Enums

- UserRole: viewer, admin
- MovieStatus: draft, published
- EncodeStatus: pending, processing, ready, failed
- UploadFileType: video, thumbnail
- UploadStatus: uploading, uploaded, failed

## 2. Core Entities

- User
  - identity and auth profile
  - status fields: isActive, disabledAt, disabledReason

- RefreshToken
  - persisted refresh tokens for auth flow

- PasswordResetToken
  - reset password flow with expiry and used flag

- Movie
  - content metadata
  - publish state and encode state
  - playbackUrl and originalKey
  - TMDB-related fields (tmdbId, voteAverage, voteCount, popularity, originalLanguage)
  - actors as string array

- Genre and MovieGenre
  - many-to-many category mapping

- Actor
  - actor dictionary used by suggest endpoint and seeding

- Favorite
  - unique userId + movieId

- WatchHistory
  - unique userId + movieId
  - progressSeconds, durationSeconds, completed, lastWatchedAt

- Rating
  - unique userId + movieId
  - rating value and optional comment

- Upload
  - upload object tracking by movie and object key

## 3. Key Constraints And Indexes

- users.email is unique
- movies.tmdbId is unique when present
- favorites unique(userId, movieId)
- ratings unique(userId, movieId)
- watch_history unique(userId, movieId)
- movie listing index on movieStatus + encodeStatus

## 4. Practical Availability Rule In Services

Streaming is allowed only when:

- movieStatus == published
- encodeStatus == ready

Implemented in movies service getStreamUrl logic.
