import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { Camera, CheckCircle } from 'lucide-react-native';
import { uploadPhoto } from '../utils/api';

const UploadScreen = ({ navigation }) => {
  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo' }, (response) => {
      if (response.assets && response.assets.length > 0) {
        setImage(response.assets[0]);
      }
    });
  };

  const handleUpload = async () => {
    if (!image) return;
    setUploading(true);
    const roomId = navigation.getState()?.routes.find(r => r.name === 'Home')?.params?.roomId;
    try {
      await uploadPhoto(image.uri, roomId);
      setSuccess(true);
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      Alert.alert('Upload Failed', 'There was an error processing your image.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload Photo</Text>
      
      <TouchableOpacity style={styles.picker} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.preview} />
        ) : (
          <View style={styles.placeholder}>
            <Camera color="#94a3b8" size={48} />
            <Text style={styles.placeholderText}>Select from Gallery</Text>
          </View>
        )}
      </TouchableOpacity>

      {image && !success && (
        <TouchableOpacity 
          style={styles.uploadBtn} 
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.uploadBtnText}>Process with AI</Text>
          )}
        </TouchableOpacity>
      )}

      {success && (
        <View style={styles.successContainer}>
          <CheckCircle color="#10b981" size={48} />
          <Text style={styles.successText}>Photo Tagged & Saved!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginVertical: 20, color: '#1e293b' },
  picker: { width: '100%', aspectRatio: 1, backgroundColor: '#fff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  placeholderText: { marginTop: 10, color: '#64748b', fontSize: 16 },
  uploadBtn: { backgroundColor: '#6366f1', width: '100%', padding: 16, borderRadius: 12, marginTop: 30, alignItems: 'center' },
  uploadBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  successContainer: { marginTop: 30, alignItems: 'center' },
  successText: { color: '#10b981', fontSize: 18, fontWeight: 'bold', marginTop: 10 }
});

export default UploadScreen;
