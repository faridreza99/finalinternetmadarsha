import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import Markdown from 'react-native-markdown-display';
import { classesAPI, notesAPI } from '../services/api';

const NotesScreen = ({ navigation }) => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [notes, setNotes] = useState(null);

  useEffect(() => {
    fetchClassesAndSubjects();
  }, []);

  const fetchClassesAndSubjects = async () => {
    try {
      const [classesRes, subjectsRes] = await Promise.all([
        classesAPI.getClasses(),
        classesAPI.getSubjects(),
      ]);
      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
    } catch (error) {
      console.log('Error fetching data:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const generateNotes = async () => {
    if (!selectedClass || !selectedSubject) {
      Alert.alert('Error', 'Please select a class and subject');
      return;
    }

    setLoading(true);
    try {
      const response = await notesAPI.generateNotes({
        class_standard: selectedClass,
        subject: selectedSubject,
      });
      setNotes(response.data);
    } catch (error) {
      console.log('Notes error:', error?.response?.data || error.message);
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to generate notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetNotes = () => {
    setNotes(null);
  };

  const markdownStyles = {
    body: {
      color: '#e0e0e0',
      fontSize: 15,
      lineHeight: 24,
    },
    heading1: {
      color: '#6c5ce7',
      fontSize: 22,
      fontWeight: 'bold',
      marginTop: 16,
      marginBottom: 8,
    },
    heading2: {
      color: '#a29bfe',
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 14,
      marginBottom: 6,
    },
    heading3: {
      color: '#74b9ff',
      fontSize: 16,
      fontWeight: '600',
      marginTop: 12,
      marginBottom: 4,
    },
    paragraph: {
      color: '#e0e0e0',
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 10,
    },
    bullet_list: {
      marginLeft: 8,
    },
    ordered_list: {
      marginLeft: 8,
    },
    list_item: {
      color: '#e0e0e0',
      fontSize: 15,
      lineHeight: 24,
      marginBottom: 4,
    },
    bullet_list_icon: {
      color: '#6c5ce7',
      fontSize: 8,
      marginRight: 8,
    },
    code_inline: {
      backgroundColor: 'rgba(108, 92, 231, 0.2)',
      color: '#a29bfe',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: 'monospace',
    },
    fence: {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      color: '#74b9ff',
      padding: 12,
      borderRadius: 8,
      marginVertical: 10,
      fontFamily: 'monospace',
      fontSize: 13,
    },
    blockquote: {
      backgroundColor: 'rgba(108, 92, 231, 0.1)',
      borderLeftColor: '#6c5ce7',
      borderLeftWidth: 4,
      paddingLeft: 12,
      paddingVertical: 8,
      marginVertical: 10,
    },
    strong: {
      color: '#fff',
      fontWeight: 'bold',
    },
    em: {
      color: '#a29bfe',
      fontStyle: 'italic',
    },
    hr: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      height: 1,
      marginVertical: 16,
    },
  };

  if (fetchingData) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6c5ce7" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (notes) {
    const notesContent = notes.content || notes.notes || 'No content available';
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={resetNotes} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Study Notes</Text>
            <View style={styles.sourceTag}>
              <Text style={styles.sourceTagText}>
                {notes.source === 'cms' ? 'Library' : 'AI'}
              </Text>
            </View>
          </View>

          <View style={styles.metaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Class:</Text>
              <Text style={styles.metaValue}>{notes.class_standard || selectedClass}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Subject:</Text>
              <Text style={styles.metaValue}>{notes.subject || selectedSubject}</Text>
            </View>
            {notes.chapter && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Chapter:</Text>
                <Text style={styles.metaValue}>{notes.chapter}</Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.notesContent} showsVerticalScrollIndicator={true}>
            <View style={styles.notesCard}>
              <Markdown style={markdownStyles}>
                {notesContent}
              </Markdown>
            </View>
            <TouchableOpacity style={styles.newButton} onPress={resetNotes}>
              <LinearGradient
                colors={['#6c5ce7', '#a29bfe']}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Generate Another</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Notes Generator</Text>
        </View>
        <ScrollView style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📚</Text>
          </View>
          <Text style={styles.title}>Generate Study Notes</Text>
          <Text style={styles.subtitle}>
            Get comprehensive notes with examples, key concepts, and practice questions
          </Text>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Select Class *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedClass}
                onValueChange={setSelectedClass}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                <Picker.Item label="Choose a class..." value="" />
                {classes.map((cls) => (
                  <Picker.Item key={cls._id || cls.id} label={cls.name} value={cls.standard || cls.name} />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Select Subject *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedSubject}
                onValueChange={setSelectedSubject}
                style={styles.picker}
                dropdownIconColor="#fff"
              >
                <Picker.Item label="Choose a subject..." value="" />
                {subjects.map((sub) => (
                  <Picker.Item key={sub._id || sub.id} label={sub.subject_name || sub.name || 'Unknown'} value={sub.subject_name || sub.name} />
                ))}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={styles.generateButton}
            onPress={generateNotes}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#555', '#444'] : ['#6c5ce7', '#a29bfe']}
              style={styles.buttonGradient}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.buttonText}> Generating...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Generate Notes</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            Includes learning objectives, key concepts, examples, and practice questions
          </Text>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  sourceTag: {
    backgroundColor: 'rgba(108, 92, 231, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceTagText: {
    color: '#a29bfe',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(108, 92, 231, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  formContainer: {
    marginBottom: 24,
  },
  label: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 32,
  },
  metaCard: {
    backgroundColor: 'rgba(108, 92, 231, 0.15)',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(108, 92, 231, 0.3)',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  metaLabel: {
    color: '#888',
    fontSize: 13,
    width: 70,
  },
  metaValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  notesContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notesCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  newButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
  },
});

export default NotesScreen;
