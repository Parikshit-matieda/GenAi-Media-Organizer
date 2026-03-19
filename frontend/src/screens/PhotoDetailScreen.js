import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, Tag, Calendar } from 'lucide-react-native';

const PhotoDetailScreen = ({ route, navigation }) => {
  const { photo } = route.params;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft color="#1e293b" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Photo Details</Text>
      </View>

      <Image source={{ uri: photo.image }} style={styles.image} resizeMode="contain" />

      <View style={styles.details}>
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Calendar color="#64748b" size={18} />
            <Text style={styles.label}>Uploaded On</Text>
          </View>
          <Text style={styles.value}>{new Date(photo.upload_time).toLocaleString()}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Tag color="#6366f1" size={18} />
            <Text style={styles.label}>AI Detected Tags</Text>
          </View>
          <View style={styles.tagContainer}>
            {photo.tags && photo.tags.length > 0 ? (
              photo.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag.tag_name}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noTags}>No tags detected</Text>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 40 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 20, color: '#1e293b' },
  image: { width: '100%', aspectRatio: 1, backgroundColor: '#f1f5f9' },
  details: { padding: 20 },
  section: { marginBottom: 25 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, color: '#64748b', fontWeight: '600', marginLeft: 8 },
  value: { fontSize: 16, color: '#1e293b', fontWeight: '500' },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  tag: { backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e0e7ff' },
  tagText: { color: '#6366f1', fontWeight: 'bold', fontSize: 14, textTransform: 'capitalize' },
  noTags: { color: '#94a3b8', fontStyle: 'italic' }
});

export default PhotoDetailScreen;
