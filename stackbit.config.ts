import { SanityContentSource } from '@stackbit/cms-sanity';
import path from 'path';

import { defineStackbitConfig } from '@stackbit/types';

console.log("🧪 Stackbit Sanity Config ENV:", {
    projectId: process.env.SANITY_PROJECT_ID,
    token: process.env.SANITY_ACCESS_TOKEN,
    dataset: process.env.SANITY_DATASET,
    studioUrl: process.env.SANITY_STUDIO_URL
});

export default defineStackbitConfig({
    "stackbitVersion": "~0.6.0",
    "nodeVersion": "18",
    "ssgName": "astro",
    "contentSources": [
        SanityContentSource({
            projectId: process.env.SANITY_PROJECT_ID || '',
            token: process.env.SANITY_ACCESS_TOKEN || '',
            dataset: process.env.SANITY_DATASET || 'production',
            rootPath: __dirname,
            studioUrl: process.env.SANITY_STUDIO_URL || ''
        }),
    ],
    "postInstallCommand": "npm i --no-save @stackbit/types @stackbit/cms-sanity"
})