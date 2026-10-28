import { McpServer, type ToolAnnotations } from '@modelcontextprotocol/server';
import { z } from 'astro/zod';
import type { Localized } from '@/i18n/locales';
import {
  experienceView,
  postListView,
  postView,
  profileView,
  PROJECT_SLUGS,
  projectListView,
  projectView,
  skillsView,
  type McpPost,
} from './catalog';
import {
  experienceOutput,
  langInput,
  postListOutput,
  postOutput,
  profileOutput,
  projectListOutput,
  projectOutput,
  skillsOutput,
} from './schemas';

export const SERVER_INFO = { name: 'inomov-online', title: 'Farrukh Inomov', version: '1.0.0' };

const INSTRUCTIONS = [
  'The portfolio of Farrukh Inomov, a senior full-stack developer for C#/.NET, React and TypeScript in Saarbrücken, Germany.',
  'Start with get_profile; get_experience, get_skills and the project and blog tools add detail.',
  'Every tool answers in German or English (lang: "de" or "en") with links to the matching pages.',
].join(' ');

/** Every tool here only reads public Portfolio data. */
const READ_ONLY: ToolAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const lang = z.object({ lang: langInput });

/** A result as structured data, with the same JSON as text for clients that only read text. */
function json<T extends Record<string, unknown>>(value: T) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value) }],
    structuredContent: value,
  };
}

function notFound(what: string) {
  return { content: [{ type: 'text' as const, text: `${what} not found.` }], isError: true };
}

/**
 * Builds the Portfolio's MCP server. It runs once per request (see handler.ts), so it holds no
 * state; the Posts are passed in because they come from the content collection.
 */
export function createPortfolioServer(posts: Localized<readonly McpPost[]>): McpServer {
  const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS });
  const postSlugs = posts.en.map((post) => post.slug);

  server.registerTool(
    'get_profile',
    {
      title: 'Profile',
      description:
        'Who Farrukh Inomov is: headline, summary, location, contact email, languages, awards and links to the site, the CV (PDF), GitHub and LinkedIn.',
      inputSchema: lang,
      outputSchema: profileOutput,
      annotations: READ_ONLY,
    },
    async ({ lang }) => json(profileView(lang)),
  );

  server.registerTool(
    'get_experience',
    {
      title: 'Experience',
      description:
        'Work history and education, newest first, with role, period, summary, highlights and the technologies used.',
      inputSchema: lang.extend({
        kind: z
          .enum(['work', 'education'])
          .optional()
          .describe('Only work or only education; both when left out.'),
      }),
      outputSchema: experienceOutput,
      annotations: READ_ONLY,
    },
    async ({ lang, kind }) => json(experienceView(lang, kind)),
  );

  server.registerTool(
    'get_skills',
    {
      title: 'Skills',
      description:
        'Skills grouped by where they come from: professional work, own projects, and how Farrukh works.',
      inputSchema: lang,
      outputSchema: skillsOutput,
      annotations: READ_ONLY,
    },
    async ({ lang }) => json(skillsView(lang)),
  );

  server.registerTool(
    'list_projects',
    {
      title: 'Projects',
      description:
        'All projects with tagline, stack, year and links. Use get_project with a slug for the details.',
      inputSchema: lang,
      outputSchema: projectListOutput,
      annotations: READ_ONLY,
    },
    async ({ lang }) => json(projectListView(lang)),
  );

  server.registerTool(
    'get_project',
    {
      title: 'Project',
      description: 'One project with its description and what has been built so far.',
      inputSchema: lang.extend({ slug: z.enum(PROJECT_SLUGS).describe('Slug from list_projects') }),
      outputSchema: projectOutput,
      annotations: READ_ONLY,
    },
    async ({ lang, slug }) => {
      const project = projectView(slug, lang);
      return project ? json(project) : notFound(`Project "${slug}"`);
    },
  );

  server.registerTool(
    'list_posts',
    {
      title: 'Blog posts',
      description:
        'All blog posts, newest first, with title, description, date, tags and reading time.',
      inputSchema: lang,
      outputSchema: postListOutput,
      annotations: READ_ONLY,
    },
    async ({ lang }) => json(postListView(posts[lang], lang)),
  );

  server.registerTool(
    'get_post',
    {
      title: 'Blog post',
      description: 'One blog post with its full text as Markdown.',
      inputSchema: lang.extend({
        slug: (postSlugs.length > 0 ? z.enum(postSlugs) : z.string()).describe(
          'Slug from list_posts',
        ),
      }),
      outputSchema: postOutput,
      annotations: READ_ONLY,
    },
    async ({ lang, slug }) => {
      const post = postView(posts[lang], slug, lang);
      return post ? json(post) : notFound(`Post "${slug}"`);
    },
  );

  return server;
}
