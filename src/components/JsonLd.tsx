/** Structured data as a script tag.
 *
 * The JSON is serialised here rather than interpolated into JSX text so that a "<"
 * inside a product description cannot close the script element early. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
