import React, { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";

interface AudioMessagePlayerProps {
  audioFilename: string;
  messageType: string;
}

export const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({
  audioFilename,
  messageType,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Charger le son
  const loadSound = async () => {
    try {
      setIsLoading(true);
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: `http://192.168.1.7/server/uploads/${audioFilename}` },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );
      setSound(sound);
      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis);
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Erreur chargement audio:", error);
      setIsLoading(false);
    }
  };

  // Mettre à jour la position en temps réel
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  // Nettoyer
  useEffect(() => {
    loadSound();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handlePlayPause = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
      setIsPlaying(false);
    } else {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  // Convertir ms → mm:ss
  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Calculer largeur de la barre
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  if (messageType !== "audio") {
    return null;
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={handlePlayPause}
        disabled={isLoading}
        style={[
          styles.playButton,
          isPlaying && styles.playingButton,
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <MaterialIcons
            name={isPlaying ? "pause" : "play-arrow"}
            size={24}
            color="#007AFF"
          />
        )}
      </TouchableOpacity>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 8,
    marginVertical: 5,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  playingButton: {
    backgroundColor: "#D1EBFF",
  },
  progressContainer: {
    flex: 1,
    justifyContent: "center",
  },
  progressBar: {
    height: 4,
    backgroundColor: "#DDD",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: "#007AFF",
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: "#555",
  },
});
export default AudioMessagePlayer;