/**
 * Validates product and material data against the schemas and the Clawed Design rules.
 *
 *   npm run validate:products
 *       Validates the sample dataset in design-system/data, including the sample-data policy,
 *       referential integrity, completeness and room compatibility.
 *
 *   npx tsx scripts/validate-product-data.ts --products=path/to/products.json [--materials=path/to/materials.json]
 *       Validates a real catalogue. The sample-data policy is not applied.
 *
 * Exits with code 1 on any error. Unknown information is reported, never filled in.
 */
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import type { Material } from '../design-system/schemas/material';
import type { Product } from '../design-system/schemas/product';
import { clientSchema } from '../design-system/schemas/client';
import { projectSchema } from '../design-system/schemas/project';
import { roomSchema } from '../design-system/schemas/room';
import { formatPercent, humanize } from '../design-system/utils/formatting';
import { assessRoomProducts, checkProductCompleteness } from '../design-system/utils/productCompatibility';
import { summariseVerification } from '../design-system/utils/status';
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
} from '../design-system/utils/validation';
import { ROOT, Reporter } from './lib/reporter';

const DATA = 'design-system/data';

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function loadJson(path: string, report: Reporter): unknown {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8')) as unknown;
  } catch (error) {
    report.error(path, error instanceof Error ? error.message : 'Unreadable JSON');
    return undefined;
  }
}

function scanText(report: Reporter, label: string, input: unknown): void {
  const fields = collectTextFields(input, label);
  for (const finding of scanTextFields(fields, findImperialUnits)) {
    report.error(finding.path, `Non-metric measurement "${finding.match}" — use mm, m or m²`);
  }
  for (const finding of scanTextFields(fields, findConstructionReadyClaims)) {
    report.error(finding.path, `Construction-ready language "${finding.match}" in concept-stage data`);
  }
}

function summariseCompleteness(report: Reporter, products: readonly Product[]): void {
  console.log('\nProduct completeness');
  console.log('--------------------');
  for (const product of products) {
    const { missing, unconfirmed } = checkProductCompleteness(product);
    const state = missing.length === 0 && unconfirmed.length === 0 ? 'complete' : `${missing.length} missing, ${unconfirmed.length} unconfirmed`;
    console.log(`  ${product.id.padEnd(20)} ${state}`);
    if (missing.some((field) => field.certainty === 'not-recorded')) {
      report.error(
        `products ${product.id}`,
        `Applicable fields not recorded: ${missing.filter((f) => f.certainty === 'not-recorded').map((f) => f.label).join(', ')} — record them as unknown rather than omitting them`,
      );
    }
  }
}

function main(): number {
  const productsPath = argValue('products');
  const materialsPath = argValue('materials');
  const sampleMode = !productsPath && !materialsPath;
  const report = new Reporter(sampleMode ? 'Sample product data validation' : 'Product data validation');

  const productFile = productsPath ?? `${DATA}/sample-products.json`;
  const materialFile = materialsPath ?? (sampleMode ? `${DATA}/sample-materials.json` : undefined);

  const productResult = validateProductCatalogue(loadJson(productFile, report));
  report.add(productResult.issues, relative(ROOT, resolve(ROOT, productFile)));
  const products = productResult.data ?? [];
  if (productResult.ok) report.pass(`${products.length} products match the product schema`);

  let materials: Material[] = [];
  if (materialFile) {
    const materialResult = validateMaterialLibrary(loadJson(materialFile, report));
    report.add(materialResult.issues, relative(ROOT, resolve(ROOT, materialFile)));
    materials = materialResult.data ?? [];
    if (materialResult.ok) report.pass(`${materials.length} materials match the material schema`);
  }

  summariseCompleteness(report, products);
  const verification = summariseVerification([...products, ...materials]);
  console.log(
    `\nVerification: ${verification.verified} verified, ${verification.partiallyVerified} partial, ${verification.unverified} unverified, ${verification.sampleData} sample (${formatPercent(verification.percentVerified)} verified)`,
  );

  scanText(report, 'products', products);
  scanText(report, 'materials', materials);

  if (sampleMode) {
    const policy = checkSampleDataPolicy([...products, ...materials]);
    report.add(policy, 'sample data');
    if (!policy.some((issue) => issue.level === 'error')) {
      report.pass('Sample data is marked as sample, unverified and contains no confirmed product claims');
    }

    const client = validateWith(clientSchema, loadJson(`${DATA}/sample-client.json`, report), 'client');
    const project = validateWith(projectSchema, loadJson(`${DATA}/sample-project.json`, report), 'project');
    const room = validateWith(roomSchema, loadJson(`${DATA}/sample-bathroom.json`, report), 'room');
    for (const result of [client, project, room]) report.add(result.issues);

    if (client.data && project.data && room.data) {
      report.pass('Sample client, project and bathroom match their schemas');
      scanText(report, 'project', project.data);
      scanText(report, 'room', room.data);

      const integrity = checkReferentialIntegrity({
        client: client.data,
        project: project.data,
        rooms: [room.data],
        products,
        materials,
      });
      report.add(integrity);
      if (integrity.length === 0) report.pass('All cross-record references resolve');

      console.log(`\nCompatibility — ${room.data.name}`);
      console.log('-'.repeat(16 + room.data.name.length));
      for (const [id, result] of Object.entries(assessRoomProducts(room.data, products))) {
        console.log(`  ${id.padEnd(20)} ${humanize(result.outcome).padEnd(17)} (${humanize(result.certainty).toLowerCase()})`);
      }
    }
  }

  return report.finish();
}

process.exitCode = main();
