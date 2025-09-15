import React, { useState, useRef, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  PanResponder,
  Animated,
} from "react-native";
import { MaterialIcons, Ionicons } from "@expo/vector-icons";
import { audioService } from "../../services/audio";

interface VoiceMessageButtonProps {
  onRecordingComplete: (audioData: { base64: string; duration: number; uri: string }) => void;
  onRecordingError?: (error: string) => void;
}

export const VoiceMessageButton: React.FC<VoiceMessageButtonProps> = ({
  onRecordingComplete,
  onRecordingError,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showCancel, setShowCancel] = useState(false);

  const recordingTimerRef = useRef<number | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;

  useEffect(() => {
    audioService.prepareRecording();

    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current as number);
      if (isRecording) audioService.cancelRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      const started = await audioService.startRecording();
      if (!started) throw new Error("Impossible de démarrer l’enregistrement");

      setIsRecording(true);
      setRecordingTime(0);
      setShowCancel(false);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000) as unknown as number;
    } catch (error: any) {
      console.error("Erreur démarrage:", error);
      onRecordingError?.(error.message || "Erreur démarrage enregistrement");
    }
  };

  const stopRecording = async (send: boolean = true) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current as number);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);

    if (send) {
      try {
        const audioData = await audioService.stopRecording();
        if (audioData) {
          onRecordingComplete(audioData);
        }
      } catch (error: any) {
        console.error("Erreur stop:", error);
        onRecordingError?.(error.message || "Erreur arrêt enregistrement");
      }
    } else {
      await audioService.cancelRecording();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: 0 });
        setShowCancel(gesture.dx < -80); // seuil de glissement
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -80) {
          stopRecording(false); // Annuler
        } else {
          stopRecording(true); // Envoyer
        }
        pan.setValue({ x: 0, y: 0 });
        setShowCancel(false);
      },
    })
  ).current;

  if (isRecording) {
    return (
      <View style={styles.recordingContainer}>
        <Animated.View
          style={[styles.recordingContent, { transform: [{ translateX: pan.x }] }]}
          {...panResponder.panHandlers}
        >
          <Ionicons name="mic" size={28} color={showCancel ? "#999" : "#FF3B30"} />
          <View style={styles.recordingInfo}>
            <Text style={styles.recordingTime}>{formatTime(recordingTime)}</Text>
            <View style={styles.recordingVisualizer}>
              {[1, 2, 3, 4].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.visualizerBar,
                    {
                      height: 10 + Math.random() * 20,
                      backgroundColor: showCancel ? "#999" : "#FF3B30",
                    },
                  ]}
                />
              ))}
            </View>
          </View>
          <Ionicons
            name="close-circle"
            size={28}
            color={showCancel ? "#FF3B30" : "#999"}
          />
        </Animated.View>
        {showCancel && <Text style={styles.cancelText}>Relâchez pour annuler</Text>}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPressIn={startRecording}
      onPressOut={() => stopRecording(true)}
      style={styles.button}
    >
      <MaterialIcons name="mic" size={24} color="#007AFF" />
      <Text style={styles.buttonText}>Maintenez pour enregistrer</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#F0F0F0",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#007AFF",
    marginVertical: 10,
  },
  buttonText: {
    marginLeft: 10,
    color: "#007AFF",
    fontWeight: "500",
  },
  recordingContainer: {
    alignItems: "center",
    marginVertical: 10,
  },
  recordingContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#FFECEC",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  recordingInfo: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 15,
  },
  recordingTime: {
    color: "#FF3B30",
    fontWeight: "600",
    fontSize: 16,
    marginBottom: 5,
  },
  recordingVisualizer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 30,
  },
  visualizerBar: {
    width: 3,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  cancelText: {
    marginTop: 8,
    color: "#FF3B30",
    fontWeight: "500",
  },
});
export default VoiceMessageButton;