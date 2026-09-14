/** Renders a schema.org object as an inline `<script type="application/ld+json">`.
 *
 * Some of what lands here isn't static copy — speaker names/bios and sponsor
 * text flow in from Sessionize sync and the admin panel. Escaping `<`, `>`
 * and `&` keeps a value like `</script><script>...</script>` from closing
 * the tag early; U+2028/U+2029 get the same treatment since they're valid in
 * JSON but illegal unescaped inside a JS string. All four are still valid
 * JSON afterwards (`\uXXXX` is just how JSON spells any character).
 */
export function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
