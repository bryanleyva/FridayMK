import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const privateKey = process.env.GOOGLE_PRIVATE_KEY
    ?.replace(/\\n/g, '\n')
    .replace(/"/g, '');

const auth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: SCOPES,
});

const drive = google.drive({ version: 'v3', auth });

export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        const file = formData.get('file') as File;
        const username = formData.get('username') as string;

        if (!file || !username) {
            return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
        }

        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID no configurado');
        }

        // Convertir archivo
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        // Subir a Drive
        const response = await drive.files.create({
            requestBody: {
                name: `${username}_profile.jpg`,
                parents: [folderId],
            },
            media: {
                mimeType: file.type,
                body: stream,
            },
            fields: 'id, webViewLink',
        });

        const fileId = response.data.id;
        if (!fileId) throw new Error('Upload fallido');

        // Hacer público
        await drive.permissions.create({
            fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        const url = `https://drive.google.com/uc?id=${fileId}`;

        return NextResponse.json({ url });

    } catch (error: any) {
        console.error('UPLOAD ERROR:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}