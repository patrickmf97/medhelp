# R2 media bucket

The editorial uploader writes directly to the private bucket configured by `R2_BUCKET_NAME`.
The application signs `PUT` requests for 15 minutes and restricts them to the validated
`Content-Type` and `Content-Length`. Attachment registration also requires the signed,
expiring receipt returned with that URL.

Configure the bucket CORS policy with the production and preview application origins:

```json
[
  {
    "AllowedOrigins": ["https://app.example.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Keep the bucket private. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` only in server-side deployment settings.
