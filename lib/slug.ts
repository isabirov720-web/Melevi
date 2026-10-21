const MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  ү: "u", ө: "o", ң: "n", қ: "k", ғ: "g", ә: "a", і: "i", ұ: "u", һ: "h",
};

/** Readable URL slug from Russian or English text: "Платье Амира" → "plate-amira". */
export function slugify(input: string) {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => MAP[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
