export const SUPPORTED_EXTENSIONS = new Set([
  '.mp3', '.m4a', '.wav', '.flac', '.mp4',
  '.mov', '.mkv', '.webm', '.aac', '.ogg', '.opus',
])

export const SUPPORTED_FILE_FILTER = {
  name: 'Audio & Video Files',
  extensions: [...SUPPORTED_EXTENSIONS].map((ext) => ext.slice(1)),
}
