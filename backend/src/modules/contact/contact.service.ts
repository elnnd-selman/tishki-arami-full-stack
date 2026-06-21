import { prisma } from '../../lib/prisma.js';
import { buildPageMeta, parsePagination } from '../../utils/pagination.js';
import { NotFoundError } from '../../lib/errors.js';
import type { SubmitContactBody } from './contact.schema.js';

export async function submitContact(body: SubmitContactBody) {
  const submission = await prisma.contactSubmission.create({
    data: {
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
    },
  });
  return submission;
}

export async function listContacts(query: { page?: unknown; pageSize?: unknown; isRead?: string }) {
  const { page, pageSize, skip, take } = parsePagination(query);
  const where = query.isRead !== undefined ? { isRead: query.isRead === 'true' } : {};
  const [total, items] = await Promise.all([
    prisma.contactSubmission.count({ where }),
    prisma.contactSubmission.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return { items, meta: buildPageMeta(page, pageSize, total) };
}

export async function markRead(id: string, isRead: boolean) {
  const existing = await prisma.contactSubmission.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Submission not found');
  return prisma.contactSubmission.update({ where: { id }, data: { isRead } });
}

export async function deleteContact(id: string) {
  const existing = await prisma.contactSubmission.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Submission not found');
  await prisma.contactSubmission.delete({ where: { id } });
}
