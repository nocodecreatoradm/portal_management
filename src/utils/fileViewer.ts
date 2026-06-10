/**
 * Utility to safely open files and images in a new browser tab.
 * Handles base64 data URLs (which modern browsers block for direct top-level navigation)
 * by converting them to Blob object URLs or fallback custom documents.
 */
export const openFileUrl = (url: string) => {
  if (!url) return;

  if (url.startsWith('data:')) {
    try {
      // Parse data URL to create a blob
      const arr = url.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : '';
      
      // Decode base64
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      
      // Open the blob URL in a new tab
      window.open(blobUrl, '_blank');
    } catch (e) {
      console.error('Error opening base64 URL via blob:', e);
      // Fallback: write to a new window if blob conversion fails
      const w = window.open();
      if (w) {
        w.document.write(`
          <html>
            <head>
              <title>Vista Previa de Archivo</title>
              <style>
                body {
                  margin: 0;
                  background-color: #0e1117;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  color: #fff;
                  font-family: system-ui, -apple-system, sans-serif;
                }
                img {
                  max-width: 100%;
                  max-height: 100vh;
                  object-fit: contain;
                  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
                }
                iframe {
                  width: 100%;
                  height: 100vh;
                  border: none;
                }
              </style>
            </head>
            <body>
              ${url.startsWith('data:image') 
                ? `<img src="${url}" alt="Vista previa" />` 
                : `<iframe src="${url}"></iframe>`}
            </body>
          </html>
        `);
        w.document.close();
      }
    }
  } else {
    // If it's a standard URL, open it directly in a new tab
    window.open(url, '_blank');
  }
};
