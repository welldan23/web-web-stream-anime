import { SITE_NAME, absolute, OG_IMAGE_PATH, safeJson, type PageMeta } from '../lib/site'
import { SITE_URL } from '../lib/siteUrl'

/**
 * Meta tag per halaman. React 19 otomatis mindahin <title>, <meta>, dan <link>
 * ke <head>, jadi komponen ini cukup dirender di halaman mana aja.
 */
export default function Seo(meta: PageMeta) {
  const url = `${SITE_URL}${meta.path}`
  const image = absolute(SITE_URL, meta.image ?? OG_IMAGE_PATH)

  return (
    <>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      {meta.noindex ? <meta name="robots" content="noindex, follow" /> : null}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="id_ID" />
      <meta property="og:type" content={meta.type ?? 'website'} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={image} />
      {meta.jsonLd?.map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson(data) }} />
      ))}
    </>
  )
}
