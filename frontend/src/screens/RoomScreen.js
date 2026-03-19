import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Clipboard, Alert } from 'react-native';
import { Users, Copy, PlusCircle } from 'lucide-react-native';
import { createRoom, joinRoom } from '../utils/api';

const RoomScreen = ({ navigation }) => {
  const [roomCode, setRoomCode] = useState('');
  const [myRoom, setMyRoom] = useState(null);

  const handleCreateRoom = async () => {
    try {
      const data = await createRoom();
      setMyRoom(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to create room');
    }
  };

  const handleJoinRoom = async () => {
    if (!roomCode) return;
    try {
      const res = await joinRoom(roomCode);
      Alert.alert('Success', 'Joined room!', [
        { text: 'OK', onPress: () => navigation.navigate('Home', { roomId: res.room_id }) }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Invalid room code');
    }
  };

  return (
    <View style={styles.container}>
      <Users color="#6366f1" size={64} style={{ marginBottom: 20 }} />
      <Text style={styles.title}>Collaborative Sharing</Text>
      
      {!myRoom ? (
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateRoom}>
          <PlusCircle color="#fff" size={24} />
          <Text style={styles.createBtnText}>Create New Room</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.roomInfo}>
          <Text style={styles.roomLabel}>Your Room Code:</Text>
          <View style={styles.codeRow}>
            <Text style={styles.codeText}>{myRoom.room_code}</Text>
            <TouchableOpacity onPress={() => Clipboard.setString(myRoom.room_code)}>
              <Copy color="#6366f1" size={20} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.joinContainer}>
        <Text style={styles.joinTitle}>Join a Room</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 6-digit code"
          value={roomCode}
          onChangeText={setRoomCode}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={[styles.joinBtn, !roomCode && styles.disabled]} onPress={handleJoinRoom} disabled={!roomCode}>
          <Text style={styles.joinBtnText}>Join Room</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b', marginBottom: 40 },
  createBtn: { flexDirection: 'row', backgroundColor: '#6366f1', padding: 16, borderRadius: 12, width: '100%', justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  roomInfo: { backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '100%', alignItems: 'center', elevation: 2 },
  roomLabel: { color: '#64748b', fontSize: 14, marginBottom: 10 },
  codeRow: { flexDirection: 'row', alignItems: 'center' },
  codeText: { fontSize: 32, fontWeight: 'bold', color: '#1e293b', marginRight: 15, letterSpacing: 2 },
  divider: { height: 1, backgroundColor: '#cbd5e1', width: '100%', marginVertical: 40 },
  joinContainer: { width: '100%' },
  joinTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  input: { backgroundColor: '#fff', borderHeight: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 16, fontSize: 18, color: '#1e293b', marginBottom: 20 },
  joinBtn: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, alignItems: 'center' },
  disabled: { opacity: 0.5 },
  joinBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default RoomScreen;
