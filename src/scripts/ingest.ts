/**
 * Batch ingest script: place PDF files in scripts/documents/ and run:
 * npm run ingest
 */
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { connectDB } from '../config/db';
import { initCloudinary, cloudinary } from '../config/cloudinary';
import LegalDocument from '../models/LegalDocument';
import { extractTextFromBuffer, processAndIndexDocument } from '../services/document.service';

const DOCS_DIR = path.join(__dirname, 'documents');

const DOCUMENT_METADATA: Record<string, { category: string; source: string; description: string }> = {
  'constitution-1999.pdf': {
    category: 'Constitutional',
    source: 'Federal Republic of Nigeria',
    description: 'Constitution of the Federal Republic of Nigeria 1999 (as amended)',
  },
  'cama-2020.pdf': {
    category: 'Commercial',
    source: 'Federal Republic of Nigeria',
    description: 'Companies and Allied Matters Act 2020',
  },
  'land-use-act.pdf': {
    category: 'Land',
    source: 'Federal Republic of Nigeria',
    description: 'Land Use Act 1978',
  },
  'criminal-code.pdf': {
    category: 'Criminal',
    source: 'Federal Republic of Nigeria',
    description: 'Criminal Code Act',
  },
  'labour-act.pdf': {
    category: 'Labour',
    source: 'Federal Republic of Nigeria',
    description: 'Labour Act',
  },
  'evidence-act-2011.pdf': {
    category: 'Evidence',
    source: 'Federal Republic of Nigeria',
    description: 'Evidence Act 2011',
  },
};

async function ingest() {
  await connectDB();
  initCloudinary();

  if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    console.log(`Created ${DOCS_DIR} — place your PDF files there and re-run.`);
    process.exit(0);
  }

  const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith('.pdf'));
  if (files.length === 0) {
    console.log('No PDF files found in scripts/documents/');
    process.exit(0);
  }

  console.log(`Found ${files.length} PDF(s) to ingest`);

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    const meta = DOCUMENT_METADATA[file] || { category: 'Other', source: '', description: '' };
    const title = file.replace('.pdf', '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

    console.log(`\nProcessing: ${title}`);
    const buffer = fs.readFileSync(filePath);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'raw', folder: `legal-assistant/${meta.category.toLowerCase()}`, public_id: `ingest-${Date.now()}-${file}` },
        (error, result) => (error ? reject(error) : resolve(result))
      );
      stream.end(buffer);
    });

    const doc = await LegalDocument.create({
      title,
      ...meta,
      cloudinaryUrl: uploadResult.secure_url,
      cloudinaryPublicId: uploadResult.public_id,
      status: 'processing',
    });

    const text = await extractTextFromBuffer(buffer);
    const chunks = await processAndIndexDocument(doc._id.toString(), text);
    console.log(`  ✓ Indexed ${chunks} chunks`);
  }

  console.log('\nIngestion complete.');
  process.exit(0);
}

ingest().catch((err) => {
  console.error(err);
  process.exit(1);
});
