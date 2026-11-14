export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unable to read the selected file.'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error('Unable to read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function compressImageToDataUrl(file: File) {
  if (file.size >= MAX_UPLOAD_BYTES) {
    return Promise.reject(new Error('Choose a JPG or PNG file smaller than 2 MB.'));
  }

  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('Image compression is not supported in this browser.'));
        return;
      }

      let scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
      let quality = 0.82;
      let dataUrl = '';

      for (let attempt = 0; attempt < 12; attempt += 1) {
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', quality);

        const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
        const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
        const byteLength = Math.floor((base64.length * 3) / 4) - padding;
        if (byteLength < MAX_UPLOAD_BYTES) {
          resolve(dataUrl);
          return;
        }

        if (quality > 0.5) {
          quality -= 0.1;
        } else {
          scale *= 0.8;
        }
      }

      reject(new Error('The photo could not be compressed below 2 MB.'));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to decode the selected image.'));
    };
    image.src = objectUrl;
  });
}
