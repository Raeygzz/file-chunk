import { Buffer } from "buffer";
import axios, { AxiosError } from "axios";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
// import { v4 as uuidv4 } from 'uuid';
import { useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";

// const API_URL = "https://your-api-endpoint.com";
const CHUNK_SIZE = 1024 * 1024; // 1MB

// interface Chunk {
//   data: Blob;
//   index: number;
//   // uploadId: string;
//   totalChunks: number;
//   fileName: string;
// }

interface FileMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  chunkSize: number;
  totalChunks: number;
}

const getFileMetadata = async (
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<FileMetadata> => {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists || !fileInfo.size) throw new Error("File not found");

  const fileSize = fileInfo.size;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

  return {
    fileName,
    fileSize,
    fileType: mimeType,
    chunkSize: CHUNK_SIZE,
    totalChunks,
  };
};

export function FileAnalyzer() {
  const [fileInfo, setFileInfo] = useState<FileMetadata | null>(null);
  const [error, setError] = useState<string>("");

  const handleFileSelect = async () => {
    try {
      const document = await DocumentPicker.getDocumentAsync({
        type: ["*/*"],
      });

      console.log("🚀 ~ handleFileSelect ~ document:", document);

      if (document.assets && document.assets.length > 0) {
        const metadata = await getFileMetadata(
          document?.assets?.[0].uri,
          document?.assets?.[0].name,
          document?.assets?.[0].mimeType || "application/octet-stream"
        );
        setFileInfo(metadata);
        setError("");
      }
    } catch (err) {
      setError("Error processing file");
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Select File" onPress={handleFileSelect} />

      {error && <Text style={styles.error}>{error}</Text>}

      {fileInfo && (
        <View style={styles.metadataContainer}>
          <Text style={styles.title}>File Analysis Report</Text>
          <Text style={styles.metadata}>File Name: {fileInfo.fileName}</Text>
          <Text style={styles.metadata}>File Type: {fileInfo.fileType}</Text>
          <Text style={styles.metadata}>
            File Size: {(fileInfo.fileSize / 1024 / 1024).toFixed(2)} MB
          </Text>
          <Text style={styles.metadata}>
            Chunk Size: {(fileInfo.chunkSize / 1024).toFixed(2)} KB
          </Text>
          <Text style={styles.metadata}>
            Total Chunks: {fileInfo.totalChunks}
          </Text>

          <Text style={styles.sectionTitle}>Supported File Types:</Text>
          <Text style={styles.metadata}>
            • MP3, MP4, Documents (PDF, DOCX), Excel (XLSX), Images (JPEG, PNG)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  metadataContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 5,
    color: "#444",
  },
  metadata: {
    fontSize: 14,
    marginBottom: 8,
    color: "#666",
  },
  error: {
    color: "red",
    marginTop: 10,
  },
});

// const readChunk = async (
//   fileUri: string,
//   position: number,
//   length: number
// ): Promise<string> => {
//   return await FileSystem.readAsStringAsync(fileUri, {
//     encoding: FileSystem.EncodingType.Base64,
//     position,
//     length,
//   });
// };

// const createChunk = async (
//   fileUri: string,
//   fileName: string,
//   // uploadId: string,
//   chunkIndex: number,
//   totalChunks: number,
//   position: number,
//   chunkSize: number,
//   mimeType: string
// ): Promise<Chunk> => {
//   const base64Chunk = await readChunk(fileUri, position, chunkSize);
//   const uint8Array = Buffer.from(base64Chunk, "base64");
//   return {
//     data: new Blob([uint8Array], { type: mimeType }),
//     index: chunkIndex,
//     // uploadId,
//     totalChunks,
//     fileName,
//   };
// };

// const uploadChunk = async (chunk: Chunk, retries = 3): Promise<void> => {
//   try {
//     const formData = new FormData();
//     formData.append("file", chunk.data, chunk.fileName);
//     // formData.append("uploadId", chunk.uploadId);
//     formData.append("chunkIndex", chunk.index.toString());
//     formData.append("totalChunks", chunk.totalChunks.toString());
//     formData.append("fileName", chunk.fileName);

//     await axios.post(`${API_URL}/upload`, formData, {
//       headers: {
//         "Content-Type": "multipart/form-data",
//       },
//       timeout: 30000,
//     });
//   } catch (error) {
//     if (retries > 0) {
//       await uploadChunk(chunk, retries - 1);
//     } else {
//       throw new Error(
//         `Failed to upload chunk ${chunk.index}: ${
//           (error as AxiosError).message
//         }`
//       );
//     }
//   }
// };

// export const uploadFile = async (
//   fileUri: string,
//   mimeType: string,
//   fileName: string
// ): Promise<void> => {
//   const fileInfo = await FileSystem.getInfoAsync(fileUri);
//   if (!fileInfo.exists || !fileInfo.size) throw new Error("File not found");

//   const fileSize = fileInfo.size;
//   // const uploadId = uuidv4();
//   const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

//   // Create array of chunk indices
//   const chunkIndices = Array.from({ length: totalChunks }, (_, i) => i);

//   // Create and upload chunks in parallel
//   const uploadPromises = chunkIndices.map(async (chunkIndex) => {
//     const position = chunkIndex * CHUNK_SIZE;
//     const chunkSize = Math.min(CHUNK_SIZE, fileSize - position);

//     const chunk = await createChunk(
//       fileUri,
//       fileName,
//       // uploadId,
//       chunkIndex,
//       totalChunks,
//       position,
//       chunkSize,
//       mimeType
//     );

//     return uploadChunk(chunk);
//   });

//   // Wait for all chunks to complete with retries
//   const results = await Promise.allSettled(uploadPromises);

//   // Check for failed chunks
//   const failedChunks = results.filter((result) => result.status === "rejected");
//   if (failedChunks.length > 0) {
//     throw new Error(`${failedChunks.length} chunks failed to upload`);
//   }

//   // Finalize upload
//   await axios.post(`${API_URL}/merge`, {
//     // uploadId,
//     fileName,
//     totalChunks,
//     mimeType,
//   });
// };

// // Example usage with document picker
// export const handleFileUpload = async () => {
//   const document = await DocumentPicker.getDocumentAsync({
//     type: ["*/*"],
//   });

//   if (document.type === "success") {
//     try {
//       await uploadFile(
//         document.uri,
//         document.mimeType || "application/octet-stream",
//         document.name
//       );
//       console.log("File upload completed successfully");
//     } catch (error) {
//       console.error("Upload failed:", error);
//     }
//   }
// };

