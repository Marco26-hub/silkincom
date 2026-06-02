import { createServiceClient } from '@/lib/supabase/server';
import { BlogManager, type AdminPost } from '@/components/admin/BlogManager';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Blog — Admin SILKinCOM', robots: { index: false } };

export default async function AdminBlogPage() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('blog_posts')
    .select(
      'id, title, slug, excerpt, content, featured_image_url, seo_title, seo_description, status, published_at, updated_at, title_i18n, content_i18n',
    )
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false });

  return <BlogManager initialPosts={(data ?? []) as AdminPost[]} />;
}
