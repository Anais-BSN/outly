/**
 * Utilitaire de compression d'image côté client via Canvas
 * Réduit la résolution et compresse au format JPEG pour éviter l'erreur HTTP 413 (Payload Too Large).
 */
export async function compressImage(
  fileOrDataUrl: File | string,
  maxWidth: number = 1280,
  maxHeight: number = 1280,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      // Calcul des nouvelles dimensions proportionnelles
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Impossible d\'initialiser le contexte Canvas 2D'));
        return;
      }

      // Dessin avec lissage
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Conversion en base64 JPEG optimisé
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.onerror = (err) => {
      reject(new Error('Erreur lors du chargement de l\'image à compresser'));
    };

    if (typeof fileOrDataUrl === 'string') {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Erreur de lecture du fichier local'));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}
