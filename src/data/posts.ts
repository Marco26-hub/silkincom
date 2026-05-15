import postsJson from './blog.json';

export type Post = {
  slug: string;
  title: string;
  description: string;
  image: string;
  date: string;
  body: string;
};

export const POSTS: Post[] = postsJson as Post[];

export function getPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}
