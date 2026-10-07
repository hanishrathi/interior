import { z } from 'zod';
import { clientSchema } from '../schemas/client';
import type { Material } from '../schemas/material';
import type { Product } from '../schemas/product';
import { projectSchema } from '../schemas/project';
import { roomSchema } from '../schemas/room';
import { auditDesign, type DesignAuditReport } from './designQualityAudit';
import { assessRoomProducts, type CompatibilityReport } from './productCompatibility';
import {
  checkReferentialIntegrity,
  checkSampleDataPolicy,
  collectTextFields,
  findConstructionReadyClaims,
  findImperialUnits,
  scanTextFields,
  validateMaterialLibrary,
  validateProductCatalogue,
  validateWith,
  type ValidationIssue,
} from './validation';

/** A project's records as read from disk — unparsed, so every schema problem is reported. */
export interface ProjectFiles {
  project: unknown;
  client?: unknown;
  /** One room record or an array of them. */
  rooms?: unknown;
  products?: unknown;
  materials?: unknown;
}

export interface ProjectReview {
  /** Schema, integrity, sample-data, unit and language problems. Any error means the records are not usable as-is. */
  issues: ValidationIssue[];
  /** Compatibility of each room's products, keyed by room id. Present only when the records parse. */
  compatibility: Record<string, Record<string, CompatibilityReport>>;
  /** Design audit. Present only when the records parse. */
  audit?: DesignAuditReport;
}

const roomsSchema = z.array(roomSchema);

/**
 * Reviews a real project end to end: validates every record, checks cross-references, applies the
 * sample-data policy to any sample records, scans all prose (client included) for imperial units and
 * construction-ready language, assesses product compatibility per room and runs the design audit.
 * Unknown information is reported, never filled in.
 */
export function reviewProject(files: ProjectFiles, asOf: string): ProjectReview {
  const issues: ValidationIssue[] = [];

  const project = validateWith(projectSchema, files.project, 'project');
  const client = files.client === undefined ? undefined : validateWith(clientSchema, files.client, 'client');
  const rawRooms = files.rooms === undefined ? [] : Array.isArray(files.rooms) ? files.rooms : [files.rooms];
  const rooms = validateWith(roomsSchema, rawRooms, 'rooms');
  const products = validateProductCatalogue(files.products ?? []);
  const materials = validateMaterialLibrary(files.materials ?? []);
  for (const result of [project, client, rooms, products, materials]) if (result) issues.push(...result.issues);

  const parsed = {
    project: project.data,
    client: client?.data,
    rooms: rooms.data ?? [],
    products: products.data ?? [],
    materials: materials.data ?? [],
  };

  const items: (Product | Material)[] = [...parsed.products, ...parsed.materials];
  issues.push(...checkSampleDataPolicy(items.filter((item) => item.source.isSample), undefined, 'sample records'));

  const text = [
    ...collectTextFields(parsed.project ?? {}, 'project'),
    ...collectTextFields(parsed.client ?? {}, 'client'),
    ...parsed.rooms.flatMap((room, i) => collectTextFields(room, `rooms[${i}]`)),
    ...parsed.products.flatMap((product, i) => collectTextFields(product, `products[${i}]`)),
    ...parsed.materials.flatMap((material, i) => collectTextFields(material, `materials[${i}]`)),
  ];
  for (const finding of scanTextFields(text, findImperialUnits)) {
    issues.push({ level: 'error', path: finding.path, message: `Non-metric measurement "${finding.match}" — use mm, m or m².` });
  }
  // The audit scans project, room and item text for construction language with the phase in mind;
  // the client record is outside it, and nothing a client record says is construction information.
  for (const finding of scanTextFields(collectTextFields(parsed.client ?? {}, 'client'), findConstructionReadyClaims)) {
    issues.push({ level: 'error', path: finding.path, message: `Construction-ready language "${finding.match}".` });
  }

  const review: ProjectReview = { issues, compatibility: {} };
  const schemaOk = !issues.some((issue) => issue.level === 'error') && parsed.project !== undefined && (!client || client.ok);
  if (!schemaOk || !parsed.project) return review;

  const records = {
    project: parsed.project,
    client: parsed.client,
    rooms: parsed.rooms,
    products: parsed.products,
    materials: parsed.materials,
  };
  issues.push(...checkReferentialIntegrity(records));
  for (const room of records.rooms) review.compatibility[room.id] = assessRoomProducts(room, records.products);
  review.audit = auditDesign({ ...records, asOf });
  return review;
}
