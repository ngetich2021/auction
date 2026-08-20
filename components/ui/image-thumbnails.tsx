// Detects fields like `images`/`image`/`avatar` holding one or more picture URLs so admin
// detail views can render actual thumbnails instead of a raw link/JSON string.
export function isImageField(key: string, value: unknown): value is string | string[] {
  const k = key.toLowerCase();
  if (!(k === "images" || k === "image" || k.endsWith("image") || k.endsWith("images"))) return false;
  if (typeof value === "string") return value.length > 0;
  if (Array.isArray(value)) return value.length > 0 && value.every((v) => typeof v === "string");
  return false;
}

export function ImageThumbnails({ value }: { value: string | string[] }) {
  const urls = Array.isArray(value) ? value : [value];
  return (
    <div className="flex flex-wrap justify-end gap-1.5 sm:justify-start">
      {urls.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element -- generic admin viewer, arbitrary hosts
        <img
          key={i}
          src={src}
          alt=""
          className="h-14 w-14 shrink-0 rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
        />
      ))}
    </div>
  );
}
