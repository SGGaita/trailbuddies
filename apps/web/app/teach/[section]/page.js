import Placeholder from "@/components/screens/Placeholder";
import { TEACH } from "@/lib/placeholders";

export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(TEACH).map((section) => ({ section }));

export default async function TeachSection({ params }) {
  const { section } = await params;
  return <Placeholder area="teach" href={`/teach/${section}`} {...TEACH[section]} />;
}
