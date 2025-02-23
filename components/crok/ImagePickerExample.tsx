import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Button, Image, View, StyleSheet } from "react-native";

interface ImagePickerExampleProps {
  selectedImaeUri?: (val: string) => void;
}

function ImagePickerExample({ selectedImaeUri }: ImagePickerExampleProps) {
  const [image, setImage] = useState<string | null>(null);

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsEditing: false,
      // aspect: [4, 3],
      allowsMultipleSelection: false,
      base64: true,
      quality: 0.8,
    });

    console.log("ImagePickerExample - result >>>>> ", result);

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      selectedImaeUri?.(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <Button title="Pick an image from camera roll" onPress={pickImage} />
      {image && <Image source={{ uri: image }} style={styles.image} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // flex: 1,
    // alignItems: "center",
    // justifyContent: "center",
  },
  image: {
    width: 200,
    height: 200,
  },
});

export { ImagePickerExample };

