/** Renders a schema.org object as an inline `<script type="application/ld+json">`. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON.stringify output, not user HTML
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
