import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

class AudioService {
  private recording: Audio.Recording | null = null;
  private isRecording = false;
  private isPrepared = false;

  // Préparer l'enregistrement (à appeler une seule fois)
  async prepareRecording(): Promise<boolean> {
    if (this.isPrepared) return true;

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) throw new Error("Permission micro refusée.");

      // Config audio mise à jour pour SDK 54+
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        // interruptionModeIOS et interruptionModeAndroid supprimés
      });

      this.isPrepared = true;
      return true;
    } catch (error) {
      console.error("❌ Erreur préparation enregistrement:", error);
      return false;
    }
  }

  // Commencer l'enregistrement
  async startRecording(): Promise<boolean> {
    if (this.isRecording) {
      console.warn("⚠️ Un enregistrement est déjà en cours");
      return false;
    }

    try {
      if (!this.isPrepared) {
        const prepared = await this.prepareRecording();
        if (!prepared) return false;
      }

      console.log("🎙️ Création nouvel enregistrement...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;
      console.log("✅ Enregistrement démarré");
      return true;
    } catch (error) {
      console.error("❌ Erreur démarrage enregistrement:", error);
      this.cleanup();
      return false;
    }
  }

  // Arrêter l'enregistrement et récupérer l'audio
  async stopRecording(): Promise<{ uri: string; base64: string; duration: number } | null> {
    if (!this.isRecording || !this.recording) return null;

    try {
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      if (!uri) throw new Error("URI non disponible");

      const status = await this.recording.getStatusAsync();
      const duration = status.durationMillis ?? 0;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = { uri, base64, duration };
      this.cleanup();
      return result;
    } catch (error) {
      console.error("❌ Erreur arrêt enregistrement:", error);
      this.cleanup();
      return null;
    }
  }

  async cancelRecording(): Promise<void> {
    if (this.isRecording && this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        console.log("🗑️ Enregistrement annulé");
      } catch (error) {
        console.error("❌ Erreur annulation enregistrement:", error);
      }
    }
    this.cleanup();
  }

  private cleanup(): void {
    this.recording = null;
    this.isRecording = false;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}

export const audioService = new AudioService();
