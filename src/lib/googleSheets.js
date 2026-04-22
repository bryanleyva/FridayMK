import { google } from "googleapis";

export async function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const client = await auth.getClient();

  const sheets = google.sheets({ version: "v4", auth: client });

  return sheets;
}
export async function readSheet() {
  const sheets = await getSheets();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Hoja1!A1:C10",
  });

  return response.data.values;
}

export async function writeSheet(data) {
  const sheets = await getSheets();

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: "Hoja1!A:C",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [data],
    },
  });
}