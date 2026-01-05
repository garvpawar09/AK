import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DIETS = [
  { id: 'vegan', label: 'Vegan', icon: 'leaf' },
  { id: 'vegetarian', label: 'Vegetarian', icon: 'rose' },
  { id: 'keto', label: 'Keto', icon: 'nutrition' },
  { id: 'gluten_free', label: 'Gluten Free', icon: 'grain' }, // Custom icon mapping needed or generic
  { id: 'halal', label: 'Halal', icon: 'star' },
];

const ALLERGIES = [
  { id: 'peanuts', label: 'Peanuts' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'soy', label: 'Soy' },
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'eggs', label: 'Eggs' },
];

export default function ProfileScreen({ preferences, onUpdateKeywords }) {
  // We can manage local state or rely on props. 
  // For better immediate feedback, let's use local state and sync up.
  const [localPrefs, setLocalPrefs] = useState({
    diets: [],
    allergies: [],
    ...preferences
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(prev => ({ ...prev, ...preferences }));
    }
  }, [preferences]);

  const toggleSelection = (category, id) => {
    setLocalPrefs(prev => {
      const currentList = prev[category] || [];
      let newList;
      if (currentList.includes(id)) {
        newList = currentList.filter(item => item !== id);
      } else {
        newList = [...currentList, id];
      }
      
      const updated = { ...prev, [category]: newList };
      
      // Persist and notify parent
      onUpdateKeywords(updated);
      return updated;
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Preferences</Text>
      </View>

      <ScrollView style={styles.content}>
        
        {/* Diets Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
          <View style={styles.chipContainer}>
            {DIETS.map(diet => {
              const isActive = localPrefs.diets?.includes(diet.id);
              return (
                <TouchableOpacity 
                  key={diet.id} 
                  style={[styles.chip, isActive && styles.chipActive]}
                  onPress={() => toggleSelection('diets', diet.id)}
                >
                  <Ionicons name={diet.icon} size={16} color={isActive ? '#000' : '#888'} style={{marginRight: 6}} />
                  <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{diet.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Allergies Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          <View style={styles.listContainer}>
            {ALLERGIES.map(allergy => {
              const isActive = localPrefs.allergies?.includes(allergy.id);
              return (
                <TouchableOpacity 
                  key={allergy.id} 
                  style={styles.listItem}
                  onPress={() => toggleSelection('allergies', allergy.id)}
                >
                  <Text style={[styles.listText, isActive && styles.listTextActive]}>{allergy.label}</Text>
                  <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
                    {isActive && <Ionicons name="checkmark" size={14} color="#000" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.footerText}>
            These preferences will be sent to the AI to customize your food analysis results.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#111',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 255, 0, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#888',
    marginBottom: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipActive: {
    backgroundColor: '#90EE90', // Light green
    borderColor: '#90EE90',
  },
  chipText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#000',
  },
  listContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  listText: {
    color: '#ccc',
    fontSize: 16,
  },
  listTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#90EE90',
    borderColor: '#90EE90',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 40,
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    marginLeft: 10,
    flex: 1,
  },
});
