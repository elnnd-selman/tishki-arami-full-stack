import type { Request, Response } from 'express';
import { submitContactSchema, listContactSchema } from './contact.schema.js';
import * as svc from './contact.service.js';
import { ValidationError } from '../../lib/errors.js';

export async function submit(req: Request, res: Response) {
  const parsed = submitContactSchema.safeParse(req.body);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
  const submission = await svc.submitContact(parsed.data);
  res.status(201).json({ success: true, data: { id: submission.id } });
}

export async function list(req: Request, res: Response) {
  const parsed = listContactSchema.safeParse(req.query);
  if (!parsed.success) throw new ValidationError(parsed.error.errors[0].message);
  const result = await svc.listContacts(parsed.data);
  res.json({ success: true, ...result });
}

export async function read(req: Request, res: Response) {
  const { id } = req.params;
  const updated = await svc.markRead(id, true);
  res.json({ success: true, data: updated });
}

export async function unread(req: Request, res: Response) {
  const { id } = req.params;
  const updated = await svc.markRead(id, false);
  res.json({ success: true, data: updated });
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params;
  await svc.deleteContact(id);
  res.json({ success: true });
}
