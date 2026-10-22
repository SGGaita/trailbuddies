import Placeholder from "@/components/screens/Placeholder";
import { FAMILY } from "@/lib/placeholders";

export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(FAMILY).map((section) => ({ section }));

export default async function FamilySection({ params }) {
  const { section } = await params;
  return <Placeholder area="family" href={`/family/${section}`} {...FAMILY[section]} />;
}
