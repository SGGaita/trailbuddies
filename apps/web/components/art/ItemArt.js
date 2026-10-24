import { itemSvg } from "@/lib/itemArt";

/**
 * A colour or shape item drawn in code, sized like an emoji (1em) unless told otherwise.
 * @param {{ it: any, size?: string | number }} props
 */
export default function ItemArt({ it, size = "1em" }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "middle" }}
      dangerouslySetInnerHTML={{ __html: itemSvg(it) }}
    />
  );
}
