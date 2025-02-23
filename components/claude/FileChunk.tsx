import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import * as FileSystem from "expo-file-system";
import * as MediaLibrary from "expo-media-library";
import mime from "mime";

interface ChunkConfig {
  chunkSize: number;
  maxParallelUploads: number;
  maxRetries: number;
}

interface FileInfo {
  uri: string;
  name: string;
  size: number;
  type: string;
  mimeType: string;
  totalChunks: number;
}

// Define a type for the file processing result
type FileProcessingResult = FileInfo | undefined;

const DEFAULT_CONFIG: ChunkConfig = {
  chunkSize: 1024 * 1024 * 5, // 5MB chunks
  maxParallelUploads: 3,
  maxRetries: 3,
};

const FileChunker: React.FC = () => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [status, setStatus] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        setStatus("Media library permission denied");
      }
    })();
  }, []);

  const SUPPORTED_TYPES = {
    audio: ["audio/mpeg", "audio/mp3"],
    video: ["video/mp4"],
    document: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    spreadsheet: [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    image: ["image/jpeg", "image/png", "image/gif"],
  };

  const getFileInfo = async (
    fileUri: string
  ): Promise<FileProcessingResult> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });

      if (!fileInfo.exists) {
        console.warn(`File does not exist at ${fileUri}`);
        return undefined;
      }

      const fileSize = fileInfo.size ?? 0;
      if (fileSize === 0) {
        console.warn(`File at ${fileUri} has zero or undefined size`);
        return undefined;
      }

      const fileName = fileUri.split("/").pop() || "unknown";
      const fileType = fileName.split(".").pop()?.toLowerCase() || "";
      const mimeType = mime.getType(fileName) || "application/octet-stream";

      const totalChunks = Math.max(
        1,
        Math.ceil(fileSize / DEFAULT_CONFIG.chunkSize)
      );

      return {
        uri: fileUri,
        name: fileName,
        size: fileSize,
        type: fileType,
        mimeType: mimeType,
        totalChunks: totalChunks,
      };
    } catch (error) {
      console.error(`Error getting file info for ${fileUri}:`, error);
      return undefined;
    }
  };

  const createChunks = async (fileInfo: FileInfo): Promise<Uint8Array[]> => {
    try {
      if (fileInfo.size === 0) {
        throw new Error("Cannot create chunks for file with zero size");
      }

      const fileData = await FileSystem.readAsStringAsync(fileInfo.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const buffer = Buffer.from(fileData, "base64");
      const chunks: Uint8Array[] = [];

      for (let i = 0; i < buffer.length; i += DEFAULT_CONFIG.chunkSize) {
        chunks.push(buffer.slice(i, i + DEFAULT_CONFIG.chunkSize));
      }

      return chunks;
    } catch (error) {
      console.error(`Error creating chunks for ${fileInfo.name}:`, error);
      throw error;
    }
  };

  const uploadChunk = async (
    chunk: Uint8Array,
    index: number,
    fileInfo: FileInfo,
    retryCount = 0
  ): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append("chunk", chunk as any);
      formData.append("chunkIndex", String(index));
      formData.append("totalChunks", String(fileInfo.totalChunks));
      formData.append("fileName", fileInfo.name);

      // Simulated upload delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return true;
    } catch (error) {
      if (retryCount < DEFAULT_CONFIG.maxRetries) {
        console.log(`Retrying chunk ${index} (Attempt ${retryCount + 1})`);
        return uploadChunk(chunk, index, fileInfo, retryCount + 1);
      }
      throw error;
    }
  };

  const uploadFile = async (fileInfo: FileInfo): Promise<void> => {
    try {
      setStatus(`Processing ${fileInfo.name}...`);

      if (fileInfo.size === 0) {
        throw new Error("Cannot upload file with zero size");
      }

      const chunks = await createChunks(fileInfo);

      for (
        let i = 0;
        i < chunks.length;
        i += DEFAULT_CONFIG.maxParallelUploads
      ) {
        const chunkPromises = chunks
          .slice(i, i + DEFAULT_CONFIG.maxParallelUploads)
          .map((chunk, index) => uploadChunk(chunk, i + index, fileInfo));

        await Promise.all(chunkPromises);
      }

      setStatus(`Successfully processed ${fileInfo.name}`);
    } catch (error) {
      setStatus(`Error processing ${fileInfo.name}: ${error}`);
    }
  };

  const processFiles = async (): Promise<void> => {
    try {
      setIsProcessing(true);
      setStatus("Starting file processing...");

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: ["audio", "video", "photo"],
      });

      // Get file info for each asset and filter out undefined results
      const fileInfoPromises = media.assets.map((asset) =>
        getFileInfo(asset.uri)
      );
      const fileInfoResults = await Promise.all(fileInfoPromises);
      const validFileInfos = fileInfoResults.filter(
        (info): info is FileInfo => info !== undefined
      );

      if (validFileInfos.length === 0) {
        setStatus("No valid files found to process");
        return;
      }

      setFiles(validFileInfos);

      // Process only valid files
      for (const fileInfo of validFileInfos) {
        await uploadFile(fileInfo);
      }

      setStatus("All files processed successfully");
    } catch (error) {
      setStatus(`Error: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>File Chunking System</Text>

      <Text style={styles.config}>
        Configuration:{"\n"}
        Chunk Size: {DEFAULT_CONFIG.chunkSize / (1024 * 1024)}MB{"\n"}
        Max Parallel Uploads: {DEFAULT_CONFIG.maxParallelUploads}
        {"\n"}
        Max Retries: {DEFAULT_CONFIG.maxRetries}
      </Text>

      <Button
        title={isProcessing ? "Processing..." : "Start Processing Files"}
        onPress={processFiles}
        disabled={isProcessing}
      />

      {files.map((file, index) => (
        <View key={index} style={styles.fileInfo}>
          <Text>File Name: {file.name}</Text>
          <Text>Size: {formatFileSize(file.size)}</Text>
          <Text>Type: {file.type}</Text>
          <Text>MIME Type: {file.mimeType}</Text>
          <Text>Total Chunks: {file.totalChunks}</Text>
        </View>
      ))}

      <Text style={styles.status}>{status}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  config: {
    marginBottom: 20,
  },
  fileInfo: {
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  status: {
    marginTop: 20,
    fontStyle: "italic",
  },
});

export { FileChunker };

