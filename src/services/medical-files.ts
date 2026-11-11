import { Directory, File, Paths } from 'expo-file-system';

/** Only app-private temporary copies; never the photo library or picked original. */
export function clearMedicalTemporaryFiles() {
  const exportFile = new File(Paths.cache, 'dossier-sos-mali.json');
  if (exportFile.exists) exportFile.delete();
  // Both pickers are used exclusively for the local medical dossier. This
  // also cleans copies left by versions that did not remove their imports.
  for (const name of ['DocumentPicker', 'ImagePicker']) {
    const directory = new Directory(Paths.cache, name);
    if (directory.exists) directory.delete();
  }
}
