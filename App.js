import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Platform, StatusBar as RNStatusBar } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import CameraScreen from './components/CameraScreen';
import PreviewScreen from './components/PreviewScreen';
import ReviewScreen from './components/ReviewScreen';
import HistoryScreen from './components/HistoryScreen';
import ProfileScreen from './components/ProfileScreen';
import { analyzeImage, lookupProduct } from './services/mockApi';

export default function App() {
  const [currentTab, setCurrentTab] = useState('camera'); // 'camera', 'review', 'history'
  const [capturedImage, setCapturedImage] = useState(null); // Used if we want to preview, but for barcode we might skip preview 
  const [reviewData, setReviewData] = useState(null);
  const [history, setHistory] = useState([]);
  const [userPreferences, setUserPreferences] = useState({});
  const [notFoundAlert, setNotFoundAlert] = useState(null); // String (barcode) or null

  // Load History on Mount
  useEffect(() => {
    loadHistory();
    loadPreferences();
  }, []);

  const loadHistory = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('@scan_history');
      if (jsonValue != null) {
        setHistory(JSON.parse(jsonValue));
      }
    } catch (e) { console.error(e); }
  };

  const loadPreferences = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('@user_preferences');
      if (jsonValue != null) {
        setUserPreferences(JSON.parse(jsonValue));
      }
    } catch (e) { console.error(e); }
  };

  const savePreferences = async (newPrefs) => {
    try {
      setUserPreferences(newPrefs);
      await AsyncStorage.setItem('@user_preferences', JSON.stringify(newPrefs));
    } catch (e) { console.error(e); }
  };

  const saveHistoryItem = async (newItem) => {
    try {
      const updatedHistory = [newItem, ...history];
      setHistory(updatedHistory);
      await AsyncStorage.setItem('@scan_history', JSON.stringify(updatedHistory));
    } catch (e) { console.error(e); }
  };

  // --- Actions ---

  const handleScan = async ({ type, data }) => {
    // 1. Fetch Product Data based on Barcode
    // Pass userPreferences to lookup logic if needed, or just for the AI step later
    const productData = await lookupProduct(data, userPreferences); // Updated signature anticipating AI

    if (!productData) {
      alert(`Product not found (Barcode: ${data})`);
      return;
    }

    const fullRecord = {
      ...productData,
      uri: productData.imageUri, // Use the real or fallback image
      date: new Date().toISOString(),
      messages: []
    };

    setReviewData(fullRecord);
    saveHistoryItem(fullRecord);

    setCurrentTab('review');
  };

  const handleRetake = () => {
    setCapturedImage(null); // Not really used anymore but good cleanup
    setCurrentTab('camera');
  };

  const handleConfirm = async () => {
    // Legacy confirm (if we had a preview screen). 
    // For scanning, we go straight to review usually.
  };

  const handleHistorySelect = (item) => {
    setReviewData(item);
    setCurrentTab('review');
  };

  const handleReviewUpdate = (updatedItem) => {
    setReviewData(updatedItem);

    // Update in History State & Storage
    const updatedHistory = history.map(h =>
      (h.date === updatedItem.date) ? updatedItem : h
    );
    setHistory(updatedHistory);
    AsyncStorage.setItem('@scan_history', JSON.stringify(updatedHistory));
  };

  const handleDeleteHistory = async (itemsToDelete) => {
    const updatedHistory = history.filter(item => !itemsToDelete.includes(item.date));
    setHistory(updatedHistory);
    await AsyncStorage.setItem('@scan_history', JSON.stringify(updatedHistory));

    // If current review item is deleted, clear it?
    // Optional: check if reviewData.date is in itemsToDelete
  };

  // --- Rendering ---

  const renderContent = () => {
    if (currentTab === 'camera') {
      // Pass handleScan instead of onCapture
      return <CameraScreen onScan={handleScan} />;
    }

    if (currentTab === 'review') {
      return <ReviewScreen reviewData={reviewData} onUpdate={handleReviewUpdate} userPreferences={userPreferences} />;
    }

    if (currentTab === 'history') {
      return <HistoryScreen history={history} onSelect={handleHistorySelect} onDelete={handleDeleteHistory} />;
    }

    if (currentTab === 'profile') {
      return <ProfileScreen preferences={userPreferences} onUpdateKeywords={savePreferences} />;
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Main Content Area */}
      <View style={styles.content}>
        {renderContent()}
      </View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TabButton
          name="camera"
          icon="camera"
          active={currentTab === 'camera'}
          onPress={() => setCurrentTab('camera')}
        />
        <TabButton
          name="review"
          icon="search"
          active={currentTab === 'review'}
          onPress={() => setCurrentTab('review')}
        />
        <TabButton
          name="history"
          icon="time"
          active={currentTab === 'history'}
          onPress={() => setCurrentTab('history')}
        />
        <TabButton
          name="profile"
          icon="person"
          active={currentTab === 'profile'}
          onPress={() => setCurrentTab('profile')}
        />
      </View>

      {/* Custom Alert Modal */}
      {notFoundAlert && (
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Ionicons name="alert-circle-outline" size={50} color="#F44336" />
            <Text style={styles.alertTitle}>Product Not Found</Text>
            <Text style={styles.alertMessage}>Scanning Barcode: {notFoundAlert}</Text>
            <TouchableOpacity style={styles.alertButton} onPress={() => setNotFoundAlert(null)}>
              <Text style={styles.alertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const TabButton = ({ name, icon, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.tabButton}>
    <Ionicons
      name={active ? icon : icon + '-outline'}
      size={26}
      color={active ? '#2196F3' : '#666'}
    />
    <Text style={[styles.tabLabel, { color: active ? '#2196F3' : '#666' }]}>
      {name.charAt(0).toUpperCase() + name.slice(1)}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + 7 : 7,
    paddingBottom: 4,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111',
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 10,
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
  // Alert Styles
  alertOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  alertBox: {
    width: '80%',
    backgroundColor: '#222',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  alertTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  alertMessage: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  alertButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
