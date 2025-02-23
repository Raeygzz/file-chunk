import React, { useState } from "react";
import { View, Text, Button, FlatList } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

interface ChunkMetadata {
  chunkIndex: number;
  startByte: number;
  endByte: number;
  chunkSize: number;
  retryCount: number;
}

interface FileMetadata {
  name: string;
  size: number;
  type: string | null;
  // mimeType: string | null;
  uri: string;
  totalChunks: number;
  chunkSize: number;
  chunks: ChunkMetadata[];
}

const CHUNK_SIZE = 1024 * 1024; // 1MB
const MAX_RETRIES = 3;
const PARALLEL_UPLOADS = 2; // Number of parallel uploads allowed

const FileUploaderGpt: React.FC = () => {
  const [fileInfo, setFileInfo] = useState<FileMetadata | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "audio/mpeg", // MP3
        "video/mp4", // MP4
        "application/pdf", // PDF
        "application/msword", // DOC
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
        "application/vnd.ms-excel", // XLS
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
        "image/*", // All images
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.length) return;
    const file = result.assets[0];

    const { uri, mimeType, name, size } = file;
    if (!size) {
      console.error("File size could not be determined.");
      return;
    }

    const totalChunks = Math.ceil(size / CHUNK_SIZE);
    const chunks: ChunkMetadata[] = Array.from(
      { length: totalChunks },
      (_, i) => ({
        chunkIndex: i,
        startByte: i * CHUNK_SIZE,
        endByte: Math.min((i + 1) * CHUNK_SIZE, size),
        chunkSize: Math.min(CHUNK_SIZE, size - i * CHUNK_SIZE),
        retryCount: 0,
      })
    );

    setFileInfo({
      name,
      size,
      type: file.mimeType || null,
      // mimeType,
      uri,
      totalChunks,
      chunkSize: CHUNK_SIZE,
      chunks,
    });
  };

  const uploadChunk = async (chunk: ChunkMetadata) => {
    try {
      const chunkData = await FileSystem.readAsStringAsync(fileInfo!.uri, {
        encoding: FileSystem.EncodingType.Base64,
        length: chunk.chunkSize,
        position: chunk.startByte,
      });

      console.log(
        `Uploading chunk ${chunk.chunkIndex + 1}/${fileInfo!.totalChunks}`
      );

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      return true;
    } catch (error) {
      console.error(`Error uploading chunk ${chunk.chunkIndex}:`, error);
      return false;
    }
  };

  const uploadChunks = async () => {
    if (!fileInfo) return;
    setUploading(true);

    let chunkQueue = [...fileInfo.chunks];

    const processNextChunk = async () => {
      if (chunkQueue.length === 0) return;

      const chunk = chunkQueue.shift()!;
      const success = await uploadChunk(chunk);

      if (!success && chunk.retryCount < MAX_RETRIES) {
        chunk.retryCount++;
        chunkQueue.push(chunk);
      }

      if (chunkQueue.length > 0) {
        await processNextChunk();
      }
    };

    // Start parallel uploads
    await Promise.all(
      Array.from({ length: PARALLEL_UPLOADS }, processNextChunk)
    );

    setUploading(false);
  };

  return (
    <View style={{ padding: 20 }}>
      <Button title="Select File" onPress={pickFile} />
      {fileInfo && (
        <View>
          <Text>Name: {fileInfo.name}</Text>
          <Text>Size: {fileInfo.size} bytes</Text>
          <Text>Type: {fileInfo.type}</Text>
          {/* <Text>MIME Type: {fileInfo.mimeType}</Text> */}
          <Text>Chunk Size: {fileInfo.chunkSize} bytes</Text>
          <Text>Total Chunks: {fileInfo.totalChunks}</Text>
          <Button
            title="Upload File"
            onPress={uploadChunks}
            disabled={uploading}
          />
        </View>
      )}
      {uploading && <Text>Uploading...</Text>}
      {fileInfo && (
        <FlatList
          data={fileInfo.chunks}
          keyExtractor={(item) => item.chunkIndex.toString()}
          renderItem={({ item }) => (
            <Text>
              Chunk {item.chunkIndex + 1}: {item.chunkSize} bytes (Retries:{" "}
              {item.retryCount})
            </Text>
          )}
        />
      )}
    </View>
  );
};

export { FileUploaderGpt };

