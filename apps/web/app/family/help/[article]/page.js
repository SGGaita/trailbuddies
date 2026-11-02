import { HELP_ARTICLES } from "@trailbuddies/content";
import { HelpArticle } from "@/components/screens/HelpCentre";

export const dynamicParams = false;
export const generateStaticParams = () => HELP_ARTICLES.map((a) => ({ article: a.id }));

export default async function ArticlePage({ params }) {
  const { article } = await params;
  return <HelpArticle id={article} />;
}
