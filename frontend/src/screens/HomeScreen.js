import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, Image, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Search, Upload, Users, Folder } from 'lucide-react-native';
import { searchPhotos } from '../utils/api';

const HomeScreen = ({ navigation }) => {
  const [photos, setPhotos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchPhotos = async (query = '') => {
    setLoading(true);
    try {
      const data = await searchPhotos(query);
      setPhotos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const renderPhoto = ({ item }) => (
    <TouchableOpacity style={styles.photoContainer} onPress={() => navigation.navigate('PhotoDetail', { photo: item })}>
      <Image source={{ uri: item.image }} style={styles.photo} />
      <View style={styles.tagBadge}>
        <Text style={styles.tagText}>{item.tags?.[0]?.tag_name || 'No Tag'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Smart Gallery</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Room')}>
          <Users color="#6366f1" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <Search color="#94a3b8" size={20} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by tag (e.g. dog, travel)"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => fetchPhotos(searchQuery)}
        />
      </View>

      <View style={styles.folderRow}>
        <TouchableOpacity style={styles.folder} onPress={() => fetchPhotos('pets')}>
          <Folder color="#f59e0b" size={24} />
          <Text style={styles.folderText}>Pets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.folder} onPress={() => fetchPhotos('travel')}>
          <Folder color="#3b82f6" size={24} />
          <Text style={styles.folderText}>Travel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.folder} onPress={() => fetchPhotos('receipt')}>
          <Folder color="#10b981" size={24} />
          <Text style={styles.folderText}>Receipts</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.media_id}
          renderItem={renderPhoto}
          numColumns={3}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No photos found.</Text>}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('Upload')}
      >
        <Upload color="#fff" size={28} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  searchBar: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', marginBottom: 20, elevation: 2 },
  searchInput: { flex: 1, marginLeft: 10, color: '#1e293b' },
  folderRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  folder: { alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 12, width: '30%', elevation: 1 },
  folderText: { marginTop: 4, fontWeight: '600', color: '#64748b' },
  list: { paddingBottom: 100 },
  photoContainer: { flex: 1/3, aspectRatio: 1, padding: 2 },
  photo: { width: '100%', height: '100%', borderRadius: 8 },
  tagBadge: { position: 'absolute', bottom: 6, left: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 4 },
  tagText: { color: '#fff', fontSize: 10 },
  fab: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#6366f1', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  empty: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});

export default HomeScreen;
