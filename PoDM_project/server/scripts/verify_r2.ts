
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TEST_FILE_NAME = 'verify_r2_test_standalone.txt';
const TEST_CONTENT = 'This is a test file to verify R2 signed URLs (standalone).';

// --- Recreate Client Logic Locally ---
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME_PRIVATE;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    console.error('❌ Missing R2 Environment Variables in .env');
    process.exit(1);
}

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

async function verifyR2() {
    console.log('--- Starting Standalone R2 Verification ---');
    console.log(`Target Bucket: ${bucketName}`);

    // 1. Upload Test File
    console.log(`\n1. Uploading test file "${TEST_FILE_NAME}"...`);
    try {
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: TEST_FILE_NAME,
            Body: Buffer.from(TEST_CONTENT),
            ContentType: 'text/plain',
        });
        await r2Client.send(command);
        console.log('✅ Upload successful.');
    } catch (error) {
        console.error('❌ Upload failed:', error);
        process.exit(1);
    }

    // 2. Generate Signed URL
    console.log(`\n2. Generating Signed URL...`);
    let signedUrl = '';
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: TEST_FILE_NAME,
        });
        signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 60 });
        console.log('✅ Signed URL generated.');
        console.log('URL:', signedUrl);
    } catch (error) {
        console.error('❌ Signing failed:', error);
        process.exit(1);
    }

    // 3. Test URL Access (Server-side fetch)
    console.log(`\n3. Testing access via fetch()...`);
    try {
        const response = await fetch(signedUrl);
        if (response.status === 200) {
            const text = await response.text();
            if (text === TEST_CONTENT) {
                console.log('✅ URL is valid and content matches.');
            } else {
                console.error('❌ URL accessible but content mismatch.');
                console.log('Received:', text);
            }
        } else {
            console.error(`❌ URL fetch failed with status: ${response.status} ${response.statusText}`);
            const body = await response.text();
            console.error('Response Body:', body);
        }
    } catch (err) {
        console.error('❌ Fetch threw an error:', err);
    }

    console.log('\n--- Verification Complete ---');
}

verifyR2();
