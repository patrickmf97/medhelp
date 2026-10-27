# R2 media bucket

The editorial uploader writes directly to the private bucket configured by `R2_BUCKET_NAME`.
The application signs `PUT` requests for 15 minutes and restricts them to the validated
`Content-Type` and `Content-Length`. Attachment registration also requires the signed,
expiring receipt returned with that URL.

## Signed downloads (ebook library)

`apps/web/lib/storage/signed-files.ts` signs short-lived `GET` requests (5 minutes by
default) so private ebook files can be downloaded directly from R2 without a public bucket
or a proxy through the application server. `apps/web/lib/content/ebook-catalog.ts`'s
`requestEbookDownload` is the only caller: it first looks up the ebook row through the
normal publishable-key client, so the same RLS policy that governs the public catalog also
governs who can obtain a signed URL — a visitor who cannot see a premium row never reaches
the signing step. `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` and
`R2_BUCKET_NAME` must all be set server-side for downloads to work; without them the action
fails closed with "Armazenamento de mídia não configurado." instead of serving a broken or
unsigned link.

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
