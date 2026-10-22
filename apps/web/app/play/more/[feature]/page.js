import Placeholder from "@/components/screens/Placeholder";
import { PLAY_MORE } from "@/lib/placeholders";

export const dynamicParams = false;
export const generateStaticParams = () => Object.keys(PLAY_MORE).map((feature) => ({ feature }));

export default async function MorePage({ params }) {
  const { feature } = await params;
  const p = PLAY_MORE[feature];
  return <Placeholder area="play" href={`/play/more/${feature}`} {...p} />;
}
