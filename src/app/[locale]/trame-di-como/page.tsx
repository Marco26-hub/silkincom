import { getLocale } from 'next-intl/server';
import { getPosts } from '@/data/posts';
import TrameContent from './TrameContent';

// ISR: the journal reads the CMS; refresh at most every 2 min so published
// edits surface without a manual cache bust.
export const revalidate = 120;

// Server wrapper: fetches the localized posts from the CMS (blog_posts, with
// blog.json fallback) and hands them to the client presentational component
// that carries the framer-motion editorial layout.
export default async function TramePage() {
  const locale = await getLocale();
  const posts = await getPosts(locale);
  return <TrameContent posts={posts} />;
}
