import { Buffer } from "buffer";
import React, { useState } from "react";
import axios, { AxiosError } from "axios";
import * as FileSystem from "expo-file-system";
import { View, Button, Text, ActivityIndicator } from "react-native";

import { ImagePickerExample } from "./ImagePickerExample";

// Constants
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const MAX_RETRIES = 3; // Retry attempts per chunk
const API_BASE_URL = process.env.EXPO_PUBLIC_BASE_URL; // Replace with your API URL

console.log(" >>>>> CHUNK_SIZE: >>>>> ", CHUNK_SIZE);
console.log(" >>>>> MAX_RETRIES: >>>>> ", MAX_RETRIES);
console.log(" >>>>> API_BASE_URL: >>>>> ", API_BASE_URL);

interface FileChunkState {
  chunkCount: number | null;
  fileName: string | null;
  error: string | null;
  fileSize?: number;
}

// interface ChunkUploadResponse {
//   chunkId: string;
//   success: boolean;
//   uploadId?: string; // Unique ID for the entire file upload
// }

// interface FileUploadState {
//   uploading: boolean;
//   progress: number;
//   error: string | null;
// }

const FileUploader: React.FC = () => {
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [state, setState] = useState<FileChunkState>({
    chunkCount: null,
    fileName: null,
    error: null,
    fileSize: 0,
  });

  // Function to pick a file and calculate chunks
  const pickFileAndChunk = async () => {
    // For simplicity, assume a file URI is provided (e.g., from DocumentPicker)
    if (fileUri && fileUri !== "") {
      try {
        // Get file info
        const fileInfo = await FileSystem.getInfoAsync(fileUri);
        if (!fileInfo.exists || !fileInfo.size) {
          throw new Error("File not found or invalid");
        }

        const fileSize = fileInfo.size;
        const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
        const fileName = fileUri.split("/").pop() || "unknown_file";

        console.log("🚀 ~ pickFileAndChunk ~ fileInfo:", fileInfo);
        console.log("🚀 ~ pickFileAndChunk ~ fileSize:", fileSize);
        console.log("🚀 ~ pickFileAndChunk ~ fileName:", fileName);
        console.log("🚀 ~ pickFileAndChunk ~ totalChunks:", totalChunks);

        // Update state with chunk count and file name
        setState({
          chunkCount: totalChunks,
          fileName,
          fileSize: fileSize,
          error: null,
        });
      } catch (error) {
        console.log(" >>>>>>>>>> File uri not Found >>>>>>> ");
        const errorMessage =
          error instanceof Error ? error.message : "Failed to process file";
        setState({
          ...state,
          chunkCount: null,
          fileName: null,
          error: errorMessage,
        });
        console.error(errorMessage);
      }
    }
  };

  console.log("state =====> ", state);
  console.log("file-uri =====> ", fileUri);

  // Function to pick a file (e.g., using Expo DocumentPicker or ImagePicker)
  // const pickFile = async () => {
  //   // For simplicity, assume a file URI is provided (e.g., from DocumentPicker)
  //   if (fileUri && fileUri !== "") {
  //     await uploadFile(fileUri);
  //     return;
  //   }

  //   console.log(" >>>>>>>>>> File uri not Found >>>>>>> ");
  // };

  // Main function to handle file upload
  // const uploadFile = async (fileUri: string) => {
  //   try {
  //     setState({ ...state, uploading: true, progress: 0, error: null });

  //     // Get file info
  //     const fileInfo = await FileSystem.getInfoAsync(fileUri);

  //     if (!fileInfo.exists || !fileInfo.size) {
  //       throw new Error("File not found or invalid");
  //     }

  //     const fileSize = fileInfo.size;
  //     const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  //     const fileName = fileUri.split("/").pop() || "uploaded_file";

  //     // Initiate upload with backend to get an uploadId
  //     // const initResponse = await axios.post(`${API_BASE_URL}/upload/init`, {
  //     //   fileName,
  //     //   totalChunks,
  //     // });
  //     // const uploadId = initResponse.data.uploadId;

  //     // Track completed chunks to prevent loss
  //     const completedChunks: Set<number> = new Set();

  //     console.log("🚀 ~ uploadFile ~ completedChunks: >>>>> ", completedChunks);
  //     console.log("🚀 ~ uploadFile ~ fileInfo: >>>>>>>>>>>>>>>> ", fileInfo);
  //     console.log("🚀 ~ uploadFile ~ fileSize: >>>>>>>>>>>>>>>> ", fileSize);
  //     console.log("🚀 ~ uploadFile ~ totalChunks: >>>>>>>>>>>>> ", totalChunks);
  //     console.log("🚀 ~ uploadFile ~ fileName: >>>>>>>>>>>>>>>> ", fileName);

  //     // Function to upload a single chunk with retry logic
  //     const uploadChunk = async (
  //       chunk: ArrayBuffer,
  //       chunkIndex: number,
  //       retries: number = MAX_RETRIES
  //     ): Promise<void> => {
  //       if (completedChunks.has(chunkIndex)) return; // Skip if already uploaded

  //       try {
  //         const response = await axios.put<ChunkUploadResponse>(
  //           `${API_BASE_URL}/files/upload`,
  //           chunk,
  //           {
  //             headers: {
  //               "Content-Type": "application/octet-stream",
  //               // "X-Upload-Id": uploadId,
  //               "X-Chunk-Index": chunkIndex,
  //               "X-Total-Chunks": totalChunks,
  //             },
  //           }
  //         );

  //         console.log("🚀 ~ uploadFile ~ response: >>>>>>>> ", response);

  //         if (response?.data?.success) {
  //           completedChunks.add(chunkIndex);

  //           const progress = Math.round(
  //             (completedChunks.size / totalChunks) * 100
  //           );

  //           setState((prev) => ({ ...prev, progress }));
  //         } else {
  //           throw new Error("Chunk upload failed");
  //         }

  //         console.log("🚀 ~ 122 ~ completedChunks: >>>>>>>> ", completedChunks);
  //       } catch (error) {
  //         if (retries > 0) {
  //           console.warn(
  //             `Retrying chunk ${chunkIndex}, attempts left: >>>>>>>> ${retries}`
  //           );

  //           await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay before retry

  //           return uploadChunk(chunk, chunkIndex, retries - 1);
  //         } else {
  //           throw error; // No retries left, fail the upload
  //         }
  //       }
  //     };

  //     // Read and chunk the file
  //     const promises: Promise<void>[] = [];
  //     let position = 0;

  //     while (position < fileSize) {
  //       const chunkSize = Math.min(CHUNK_SIZE, fileSize - position);
  //       const chunkBase64 = await FileSystem.readAsStringAsync(fileUri, {
  //         encoding: FileSystem.EncodingType.Base64,
  //         position,
  //         length: chunkSize,
  //       });

  //       const chunkBuffer = Buffer.from(chunkBase64, "base64").buffer;
  //       const chunkIndex = Math.floor(position / CHUNK_SIZE);

  //       console.log("🚀 ~ uploadFile ~ chunkSize: >>>>>>>> ", chunkSize);
  //       console.log("🚀 ~ uploadFile ~ chunkIndex: >>>>>>>> ", chunkIndex);
  //       console.log("🚀 ~ uploadFile ~ chunkBase64: >>>>>>>>", chunkBase64);
  //       console.log("🚀 ~ uploadFile ~ chunkBuffer: >>>>>>>> ", chunkBuffer);

  //       // Add chunk upload to promises array for parallel execution
  //       promises.push(uploadChunk(chunkBuffer, chunkIndex));

  //       position += chunkSize;
  //     }

  //     console.log("🚀 ~ uploadFile ~ promises:", promises);

  //     // Upload all chunks in parallel
  //     await Promise.all(promises);

  //     // Complete the upload
  //     // await axios.post(`${API_BASE_URL}/files/upload`, { uploadId });
  //     // setState({ ...state, uploading: false, progress: 100, error: null });
  //     console.log("Upload completed successfully!");
  //   } catch (error) {
  //     const errorMessage =
  //       error instanceof AxiosError ? error.message : "Upload failed";

  //     setState({ ...state, uploading: false, error: errorMessage });
  //     console.error(errorMessage);
  //   }
  // };

  return (
    <View
      style={{
        flex: 1,
        borderWidth: 2,
        borderColor: "blue",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Button title="Pick File and Show Chunks" onPress={pickFileAndChunk} />
      {state.chunkCount !== null && state.fileName && (
        <>
          <Text>Number of Chunks: {state.chunkCount}</Text>
          <Text>File: {state.fileName}</Text>
          <Text>Chunk Size: {CHUNK_SIZE / (1024 * 1024)}</Text>
          <Text>File Size: {state.fileSize}</Text>
        </>
      )}

      {state.error && (
        <Text style={{ color: "red" }}>Error: {state.error}</Text>
      )}

      {/* <Button
        title="Pick and Upload File"
        onPress={pickFile}
        disabled={state.uploading}
      /> */}

      {/* {state.uploading && (
        <>
          <Text>Uploading: {state.progress}%</Text>
          <ActivityIndicator size="large" />
        </>
      )} */}

      {/* {state.error && (
        <Text style={{ color: "red" }}>Error: {state.error}</Text>
      )} */}

      <ImagePickerExample selectedImaeUri={(uri) => setFileUri(uri)} />
    </View>
  );
};

export { FileUploader };

