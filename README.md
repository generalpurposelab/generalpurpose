# General Purpose

General Purpose is a design and technology studio site built with Next.js 16,
React 19, TypeScript, and MDX. The site is statically generated wherever
possible and keeps browser-side JavaScript limited to interactions that need it.

## Local development

Use Node.js 20.19+, 22.13+, or 24+ and npm 10. Avoid non-LTS odd-numbered
Node.js releases.

```bash
npm install
npm run dev
```

The local site is available at [http://localhost:3000](http://localhost:3000).

Before opening a pull request, run the complete production check:

```bash
npm run check
```

This verifies formatting, lint rules, TypeScript, and the production build.

## Project structure

- `app/` contains routes, metadata, the sitemap, and the robots policy.
- `components/` contains shared server and interactive client components.
- `content/projects.ts` is the typed project catalogue.
- `content/writing/` contains MDX articles.
- `lib/writing.ts` is the explicit article registry and content loader.
- `lib/site.ts` owns site-wide URLs and metadata constants.
- `public/` contains fonts, editorial images, identity assets, and the social
  sharing image.

Pages and content layouts are Server Components by default. The client boundary
is intentionally narrow: the homepage identity preview, article minimap, join
form, dot-grid interaction, and Canopy globe are the only interactive islands.
The globe renderer is loaded on demand and pauses when it is outside the
viewport.

## Adding a project

Add a complete entry to `content/projects.ts`. The project route, homepage
index, metadata, and sitemap are all derived from that catalogue. Keep slugs
unique, use ISO dates (`YYYY-MM-DD`), and give every article section a unique
`id`.

## Adding writing

1. Add the MDX file under `content/writing/`.
2. Export the required metadata fields: `slug`, `title`, `indexTitle`,
   `description`, `author`, `date`, `dateLabel`, `pattern`, and `challenge`.
3. Add a literal loader and source-file entry to the `writingPosts` registry in
   `lib/writing.ts`.

The explicit registry is deliberate: it keeps every MDX import visible to the
bundler, makes static route generation deterministic, and validates metadata and
section anchors during the build.

## Deployment

Set `SITE_URL` to the canonical HTTPS origin. Existing deployments may continue
to use `NEXT_PUBLIC_SITE_URL`; Vercel deployments can instead use the
automatically provided `VERCEL_PROJECT_PRODUCTION_URL`. The URL is used for
canonical metadata, Open Graph URLs, `robots.txt`, and `sitemap.xml`.

The repository uses npm as its package manager; `package-lock.json` is the
canonical dependency lockfile.

The `package.json` overrides keep Next.js's transitive PostCSS and Sharp
processors on patched releases. Recheck and remove those overrides once a
stable Next.js release raises its own dependency floors to the same versions.
