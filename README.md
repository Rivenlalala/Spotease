# Spotease

A Next.js application for bidirectional playlist synchronization between Spotify and NetEase Music.

## Directory Structure

```
Spotease/
├── .git/
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── public/
│   └── (static assets like images, icons)
│
└── src/
    ├── app/                      # Next.js App Router
    │   ├── layout.tsx           # Root layout
    │   ├── page.tsx             # Home page
    │   ├── globals.css          # Global styles
    │   │
    │   ├── api/                 # API routes
    │   │   ├── auth/           # Authentication endpoints
    │   │   ├── playlists/      # Playlist operations
    │   │   └── tracks/         # Track operations
    │   │
    │   └── dashboard/          # Dashboard page
    │       └── page.tsx
    │
    ├── components/              # React components
    │   ├── ui/                 # Reusable UI components
    │   └── features/           # Feature-specific components
    │
    ├── lib/                     # Utility libraries
    │   ├── db.ts              # Prisma client
    │   ├── spotify.ts         # Spotify API client
    │   └── netease.ts         # NetEase API client
    │
    └── types/                   # TypeScript types
        ├── spotify.ts
        ├── netease.ts
        └── playlist.ts
```
