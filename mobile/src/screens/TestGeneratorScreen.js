import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../context/AuthContext';
import api, { classesAPI } from '../services/api';

const TestGeneratorScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('generate');
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [fetchingData, setFetchingData] = useState(true);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [numQuestions, setNumQuestions] = useState('10');
  const [difficulty, setDifficulty] = useState('medium');
  const [chapter, setChapter] = useState('');

  const [generatedTest, setGeneratedTest] = useState(null);
  const [viewingTest, setViewingTest] = useState(null);

  const difficultyLevels = ['easy', 'medium', 'hard'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchTests();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      setFetchingData(true);
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

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await api.get('/test/list');
      setTests(response.data?.tests || []);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTest = async () => {
    if (!selectedClass || !selectedSubject) {
      Alert.alert('Error', 'Please select a class and subject');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post('/test/generate', {
        class_standard: selectedClass,
        subject: selectedSubject,
        num_questions: parseInt(numQuestions) || 10,
        difficulty_level: difficulty,
        chapter: chapter || undefined,
        max_marks: (parseInt(numQuestions) || 10) * 5,
      });

      setGeneratedTest(response.data);
      setActiveTab('preview');
      Alert.alert('Success', `Test generated with ${response.data.total_questions || response.data.questions?.length || 0} questions!`);
    } catch (error) {
      console.log('Generate error:', error?.response?.data || error.message);
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to generate test. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const publishTest = async () => {
    if (!generatedTest) return;

    try {
      setPublishing(true);
      await api.post('/test/publish', {
        test_id: generatedTest.test_id,
      });
      Alert.alert('Success', 'Test published successfully!');
      setGeneratedTest(null);
      const testsRes = await api.get('/test/list');
      setTests(testsRes.data?.tests || []);
      setActiveTab('history');
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.detail || 'Failed to publish test');
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setGeneratedTest(null);
    setSelectedClass('');
    setSelectedSubject('');
    setNumQuestions('10');
    setDifficulty('medium');
    setChapter('');
    setActiveTab('generate');
  };

  const markdownStyles = {
    body: { color: '#e0e0e0', fontSize: 14, lineHeight: 22 },
    heading1: { color: '#00b894', fontSize: 18, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
    heading2: { color: '#00cec9', fontSize: 16, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
    paragraph: { color: '#e0e0e0', fontSize: 14, lineHeight: 22, marginBottom: 8 },
    strong: { color: '#fff', fontWeight: 'bold' },
    bullet_list_icon: { color: '#00b894', fontSize: 8, marginRight: 8 },
    code_inline: { backgroundColor: 'rgba(0, 184, 148, 0.2)', color: '#00cec9', paddingHorizontal: 4, borderRadius: 4 },
  };

  const TabButton = ({ title, tabKey, icon }) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabKey && styles.tabButtonActive]}
      onPress={() => setActiveTab(tabKey)}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabButtonText, activeTab === tabKey && styles.tabButtonTextActive]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  const QuestionCard = ({ question, index }) => (
    <View style={styles.questionCard}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionNumber}>Q{index + 1}</Text>
        <View style={styles.questionTags}>
          {question.difficulty_level && (
            <View style={[styles.tag, { backgroundColor: getDifficultyColor(question.difficulty_level) }]}>
              <Text style={styles.tagText}>{question.difficulty_level}</Text>
            </View>
          )}
          {question.marks && (
            <View style={[styles.tag, { backgroundColor: 'rgba(0, 184, 148, 0.3)' }]}>
              <Text style={styles.tagText}>{question.marks} marks</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.questionText}>{question.question_text}</Text>
      
      {question.options && question.options.length > 0 && (
        <View style={styles.optionsContainer}>
          {question.options.map((opt, idx) => (
            <View
              key={opt.id || idx}
              style={[
                styles.optionItem,
                opt.id === question.correct_answer && styles.correctOption
              ]}
            >
              <Text style={styles.optionId}>{opt.id || String.fromCharCode(65 + idx)}.</Text>
              <Text style={[
                styles.optionText,
                opt.id === question.correct_answer && styles.correctOptionText
              ]}>
                {opt.text}
              </Text>
              {opt.id === question.correct_answer && (
                <Text style={styles.correctBadge}>Correct</Text>
              )}
            </View>
          ))}
        </View>
      )}
      
      {question.question_type !== 'mcq' && question.correct_answer && (
        <View style={styles.answerBox}>
          <Text style={styles.answerLabel}>Answer:</Text>
          <Text style={styles.answerText}>{question.correct_answer}</Text>
        </View>
      )}
    </View>
  );

  const getDifficultyColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'easy': return 'rgba(0, 184, 148, 0.3)';
      case 'medium': return 'rgba(243, 156, 18, 0.3)';
      case 'hard': return 'rgba(231, 76, 60, 0.3)';
      default: return 'rgba(100, 100, 100, 0.3)';
    }
  };

  const TestCard = ({ test }) => (
    <TouchableOpacity 
      style={styles.testCard}
      onPress={() => setViewingTest(test)}
    >
      <View style={styles.testHeader}>
        <Text style={styles.testTitle} numberOfLines={1}>{test.title || 'Untitled Test'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: test.status === 'published' ? '#00b894' : '#f39c12' }]}>
          <Text style={styles.statusText}>{test.status || 'draft'}</Text>
        </View>
      </View>
      <View style={styles.testMeta}>
        <Text style={styles.testInfo}>Class: {test.class_standard || 'N/A'}</Text>
        <Text style={styles.testInfo}>Subject: {test.subject || 'N/A'}</Text>
      </View>
      <View style={styles.testFooter}>
        <Text style={styles.testQuestions}>{test.questions?.length || test.total_questions || 0} Questions</Text>
        {test.created_at && (
          <Text style={styles.testDate}>{new Date(test.created_at).toLocaleDateString()}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (fetchingData) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.gradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00b894" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  if (viewingTest) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setViewingTest(null)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{viewingTest.title || 'Test Details'}</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.testMetaCard}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Class:</Text>
              <Text style={styles.metaValue}>{viewingTest.class_standard}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Subject:</Text>
              <Text style={styles.metaValue}>{viewingTest.subject}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status:</Text>
              <Text style={[styles.metaValue, { color: viewingTest.status === 'published' ? '#00b894' : '#f39c12' }]}>
                {viewingTest.status?.toUpperCase()}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>
              Questions ({viewingTest.questions?.length || 0})
            </Text>
            {(viewingTest.questions || []).map((q, idx) => (
              <QuestionCard key={q.id || idx} question={q} index={idx} />
            ))}
            <View style={{ height: 40 }} />
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Test Generator</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabContainer}>
          <TabButton title="Generate" tabKey="generate" icon="📝" />
          <TabButton title="Preview" tabKey="preview" icon="👁️" />
          <TabButton title="History" tabKey="history" icon="📋" />
        </View>

        {activeTab === 'generate' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>📄</Text>
            </View>
            <Text style={styles.title}>Generate Test</Text>
            <Text style={styles.subtitle}>
              Create AI-powered tests with curriculum-aligned questions
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

              <Text style={styles.label}>Chapter (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Force and Motion"
                placeholderTextColor="#666"
                value={chapter}
                onChangeText={setChapter}
              />

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Questions</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="10"
                    placeholderTextColor="#666"
                    value={numQuestions}
                    onChangeText={setNumQuestions}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Difficulty</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={difficulty}
                      onValueChange={setDifficulty}
                      style={styles.pickerSmall}
                      dropdownIconColor="#fff"
                    >
                      {difficultyLevels.map((level) => (
                        <Picker.Item key={level} label={level.charAt(0).toUpperCase() + level.slice(1)} value={level} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateTest}
              disabled={generating}
            >
              <LinearGradient
                colors={generating ? ['#555', '#444'] : ['#00b894', '#00cec9']}
                style={styles.buttonGradient}
              >
                {generating ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.buttonText}> Generating...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Generate Test</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.footerText}>
              AI will create curriculum-aligned questions with answers
            </Text>
          </ScrollView>
        )}

        {activeTab === 'preview' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {generatedTest ? (
              <>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>{generatedTest.title || 'Generated Test'}</Text>
                  <Text style={styles.previewInfo}>
                    {generatedTest.total_questions || generatedTest.questions?.length || 0} Questions
                  </Text>
                </View>

                <View style={styles.testMetaCard}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Class:</Text>
                    <Text style={styles.metaValue}>{generatedTest.class_standard || selectedClass}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Subject:</Text>
                    <Text style={styles.metaValue}>{generatedTest.subject || selectedSubject}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Status:</Text>
                    <Text style={styles.metaValue}>{generatedTest.status || 'Draft'}</Text>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>Questions</Text>
                {(generatedTest.questions || []).map((q, idx) => (
                  <QuestionCard key={q.id || idx} question={q} index={idx} />
                ))}

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.publishButton]}
                    onPress={publishTest}
                    disabled={publishing}
                  >
                    <LinearGradient
                      colors={publishing ? ['#555', '#444'] : ['#00b894', '#00cec9']}
                      style={styles.buttonGradient}
                    >
                      {publishing ? (
                        <View style={styles.loadingRow}>
                          <ActivityIndicator color="#fff" size="small" />
                          <Text style={styles.buttonText}> Publishing...</Text>
                        </View>
                      ) : (
                        <Text style={styles.buttonText}>Publish Test</Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.regenerateButton]}
                    onPress={generateTest}
                    disabled={generating}
                  >
                    <View style={styles.outlineButtonInner}>
                      <Text style={styles.outlineButtonText}>Regenerate</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton]}
                    onPress={resetForm}
                  >
                    <View style={styles.outlineButtonInner}>
                      <Text style={styles.outlineButtonText}>New Test</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📄</Text>
                <Text style={styles.emptyText}>No test generated yet</Text>
                <Text style={styles.emptySubtext}>Go to Generate tab to create a test</Text>
              </View>
            )}
          </ScrollView>
        )}

        {activeTab === 'history' && (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00b894" />
              </View>
            ) : tests.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No tests created yet</Text>
                <Text style={styles.emptySubtext}>Generate your first test to see it here</Text>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Recent Tests ({tests.length})</Text>
                {tests.map((test, index) => (
                  <TestCard key={test.id || test._id || index} test={test} />
                ))}
              </>
            )}
          </ScrollView>
        )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backBtn: {
    padding: 8,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(0, 184, 148, 0.2)',
    borderColor: '#00b894',
  },
  tabIcon: {
    fontSize: 14,
  },
  tabButtonText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#00b894',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 184, 148, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
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
    borderColor: 'rgba(0, 184, 148, 0.3)',
  },
  picker: {
    color: '#fff',
    height: 50,
  },
  pickerSmall: {
    color: '#fff',
    height: 50,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 148, 0.3)',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
  previewHeader: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  previewInfo: {
    color: '#00b894',
    fontSize: 14,
  },
  testMetaCard: {
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 148, 0.3)',
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
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  questionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionNumber: {
    color: '#00b894',
    fontSize: 16,
    fontWeight: 'bold',
  },
  questionTags: {
    flexDirection: 'row',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  questionText: {
    color: '#e0e0e0',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  optionsContainer: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 10,
    borderRadius: 8,
  },
  correctOption: {
    backgroundColor: 'rgba(0, 184, 148, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 184, 148, 0.5)',
  },
  optionId: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    width: 20,
  },
  optionText: {
    color: '#ccc',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  correctOptionText: {
    color: '#fff',
  },
  correctBadge: {
    color: '#00b894',
    fontSize: 11,
    fontWeight: '600',
  },
  answerBox: {
    backgroundColor: 'rgba(0, 184, 148, 0.15)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  answerLabel: {
    color: '#00b894',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  answerText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
    marginTop: 20,
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  publishButton: {},
  regenerateButton: {},
  outlineButtonInner: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
  },
  outlineButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  testCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  testTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  testMeta: {
    marginBottom: 8,
  },
  testInfo: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginTop: 2,
  },
  testFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  testQuestions: {
    color: '#00b894',
    fontSize: 13,
    fontWeight: '500',
  },
  testDate: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default TestGeneratorScreen;
