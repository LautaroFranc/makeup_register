/**
 * Comprime una imagen usando Canvas API del browser.
 *
 * @param file         Archivo de imagen original
 * @param maxWidth     Ancho máximo en px (default 1200)
 * @param maxHeight    Alto máximo en px  (default 1200)
 * @param quality      Calidad JPEG 0-1   (default 0.82)
 * @returns            Nuevo File comprimido (mismo nombre, tipo image/jpeg)
 */
export async function compressImage(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calcular nuevas dimensiones manteniendo la proporción
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo crear el contexto canvas"));
        return;
      }

      // Fondo blanco para imágenes con transparencia (PNG → JPEG)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Error al convertir canvas a blob"));
            return;
          }
          // Mantener el nombre original pero forzar extensión .jpg
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const compressed = new File([blob], `${baseName}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Error al cargar la imagen"));
    };

    img.src = objectUrl;
  });
}

/**
 * Comprime un array de archivos en paralelo.
 */
export async function compressImages(
  files: File[],
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<File[]> {
  return Promise.all(
    files.map((f) => compressImage(f, maxWidth, maxHeight, quality))
  );
}
