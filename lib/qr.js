import QRCode from "qrcode";

export async function generateQR(text) {
  try {
    const qr = await QRCode.toDataURL(text);
    return qr;
  } catch (err) {
    console.error(err);
    return null;
  }
}