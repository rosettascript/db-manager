/**
 * File download utility
 * 
 * Helper functions for downloading files from the browser
 */

/**
 * Download a file with the given content
 * @param content - The file content (string)
 * @param filename - The filename to use for the download
 * @param mimeType - The MIME type of the file (default: 'text/plain')
 */
export function downloadFile(
  content: string,
  filename: string,
  mimeType: string = 'text/plain',
): void {
  // Create a blob with the content
  const blob = new Blob([content], { type: mimeType });
  
  // Create a temporary URL for the blob
  const url = URL.createObjectURL(blob);
  
  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Revoke the URL to free up memory
  URL.revokeObjectURL(url);
}

/**
 * Download SQL file
 */
export function downloadSQLFile(content: string, filename: string = 'schema-dump.sql'): void {
  downloadFile(content, filename, 'application/sql');
}

/**
 * Download text file
 */
export function downloadTextFile(content: string, filename: string = 'schema-dump.txt'): void {
  downloadFile(content, filename, 'text/plain');
}

