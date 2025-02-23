import { Text, View } from "react-native";

import {
  FileAnalyzer,
  FileChunker,
  FileUploader,
  FileUploaderGpt,
} from "@/components";

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Grok */}
      <FileUploader />

      {/* deepSeek */}
      {/* <FileAnalyzer /> */}

      {/* claude */}
      {/* <FileChunker /> */}

      {/* ChatGPT */}
      {/* <FileUploaderGpt /> */}
    </View>
  );
}

