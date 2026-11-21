import { JobPostingFormConfig } from '../types/hr';

/**
 * Converts a job position title into a clean URL-safe slug.
 */
export function toJobSlug(title: string, fallbackId?: string): string {
  const slug = (title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return slug || fallbackId || 'puesto';
}

/**
 * Returns the SPA public path for the jobs landing or a specific job posting.
 */
export function getJobPublicPath(posting?: Pick<JobPostingFormConfig, 'id' | 'positionTitle'> | null): string {
  if (!posting) return '/trabaja';
  return `/trabaja/${toJobSlug(posting.positionTitle, posting.id)}`;
}

/**
 * Returns the full shareable URL for the jobs landing or a specific job posting.
 */
export function getJobPublicUrl(posting?: Pick<JobPostingFormConfig, 'id' | 'positionTitle'> | null): string {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://gastroerp.com';
  return `${origin}${getJobPublicPath(posting)}`;
}

/**
 * Finds an active (or any) job posting matching a route slug or id.
 */
export function findJobPostingBySlugOrId(
  postings: JobPostingFormConfig[],
  slugOrId: string
): JobPostingFormConfig | undefined {
  const normalized = decodeURIComponent(slugOrId || '').trim().toLowerCase();
  if (!normalized) return undefined;
  return postings.find(
    p =>
      p.id.toLowerCase() === normalized ||
      toJobSlug(p.positionTitle, p.id) === normalized
  );
}
