import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export interface PickedImage {
  uri: string;
  base64: string;
}

function toResult(res: ImagePicker.ImagePickerResult): PickedImage | null {
  const asset = res.canceled ? undefined : res.assets[0];
  if (!asset?.base64) return null;
  return { uri: asset.uri, base64: asset.base64 };
}

async function fromLibrary(): Promise<PickedImage | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.6,
    base64: true,
  });
  return toResult(res);
}

async function fromCamera(): Promise<PickedImage | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Izin kamera ditolak', 'Aktifkan izin kamera di Pengaturan.');
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.6,
    base64: true,
  });
  return toResult(res);
}

/** Prompt for a source, then return the picked image (base64) or null. */
export function pickProofImage(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    Alert.alert('Bukti transfer', 'Ambil dari mana?', [
      {
        text: 'Kamera',
        onPress: () => {
          void fromCamera().then(resolve);
        },
      },
      {
        text: 'Galeri',
        onPress: () => {
          void fromLibrary().then(resolve);
        },
      },
      { text: 'Batal', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
