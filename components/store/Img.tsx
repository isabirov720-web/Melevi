import Image, { type ImageProps } from "next/image";

/** next/image with lazy loading; SVG placeholders are served as-is. */
export function Img(props: ImageProps & { src: string }) {
  const svg = props.src.endsWith(".svg");
  return <Image {...props} unoptimized={svg || props.unoptimized} />;
}
