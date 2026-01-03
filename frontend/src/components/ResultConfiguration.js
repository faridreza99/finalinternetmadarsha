import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from './ui/dialog';
import {
  Settings,
  GraduationCap,
  Award,
  FileText,
  Plus,
  Trash2,
  Edit,
  Save,
  Check,
  Star
} from 'lucide-react';
import { toast } from 'sonner';

const ResultConfiguration = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('grading');
  const [loading, setLoading] = useState(true);
  
  const [gradingSchemes, setGradingSchemes] = useState([]);
  const [promotionRules, setPromotionRules] = useState({
    min_overall_percentage: 33,
    min_subjects_to_pass: 0,
    mandatory_subjects: [],
    grace_marks_allowed: true,
    max_grace_marks: 5,
    allow_compartment: true,
    max_compartment_subjects: 2
  });
  const [resultCardSettings, setResultCardSettings] = useState({
    school_header: '',
    result_title: 'Progress Report',
    show_rank: true,
    show_percentage: true,
    show_gpa: true,
    show_grade: true,
    show_remarks: true,
    remarks_pass: 'Promoted to next class',
    remarks_fail: 'Not promoted',
    remarks_compartment: 'Promoted with compartment',
    principal_signature_label: 'Principal',
    class_teacher_signature_label: 'Class Teacher',
    parent_signature_label: 'Parent/Guardian'
  });
  
  const [isSchemeDialogOpen, setIsSchemeDialogOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState(null);
  const [schemeForm, setSchemeForm] = useState({
    name: '',
    description: '',
    is_default: false,
    grade_bands: [
      { grade: 'A+', min_percentage: 90, max_percentage: 100, gpa: 10.0, remarks: 'Excellent' },
      { grade: 'A', min_percentage: 80, max_percentage: 89.99, gpa: 9.0, remarks: 'Very Good' },
      { grade: 'B+', min_percentage: 70, max_percentage: 79.99, gpa: 8.0, remarks: 'Good' },
      { grade: 'B', min_percentage: 60, max_percentage: 69.99, gpa: 7.0, remarks: 'Above Average' },
      { grade: 'C+', min_percentage: 50, max_percentage: 59.99, gpa: 6.0, remarks: 'Average' },
      { grade: 'C', min_percentage: 40, max_percentage: 49.99, gpa: 5.0, remarks: 'Below Average' },
      { grade: 'D', min_percentage: 33, max_percentage: 39.99, gpa: 4.0, remarks: 'Pass' },
      { grade: 'F', min_percentage: 0, max_percentage: 32.99, gpa: 0.0, remarks: 'Fail' }
    ]
  });

  const canEdit = user?.role && ['super_admin', 'admin', 'principal'].includes(user.role);

  const fetchGradingSchemes = useCallback(async () => {
    try {
      const response = await axios.get('/api/result-config/grading-schemes');
      setGradingSchemes(response.data);
    } catch (error) {
      console.error('Error fetching grading schemes:', error);
    }
  }, []);

  const fetchPromotionRules = useCallback(async () => {
    try {
      const response = await axios.get('/api/result-config/promotion-rules');
      setPromotionRules(response.data);
    } catch (error) {
      console.error('Error fetching promotion rules:', error);
    }
  }, []);

  const fetchResultCardSettings = useCallback(async () => {
    try {
      const response = await axios.get('/api/result-config/result-card-settings');
      setResultCardSettings(response.data);
    } catch (error) {
      console.error('Error fetching result card settings:', error);
    }
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchGradingSchemes(),
        fetchPromotionRules(),
        fetchResultCardSettings()
      ]);
      setLoading(false);
    };
    fetchAll();
  }, [fetchGradingSchemes, fetchPromotionRules, fetchResultCardSettings]);

  const handleSaveScheme = async () => {
    try {
      if (editingScheme) {
        await axios.put(`/api/result-config/grading-schemes/${editingScheme.id}`, schemeForm);
        toast.success('Grading scheme updated successfully');
      } else {
        await axios.post('/api/result-config/grading-schemes', schemeForm);
        toast.success('Grading scheme created successfully');
      }
      setIsSchemeDialogOpen(false);
      setEditingScheme(null);
      resetSchemeForm();
      fetchGradingSchemes();
    } catch (error) {
      toast.error('Failed to save grading scheme');
    }
  };

  const handleDeleteScheme = async (schemeId) => {
    if (!window.confirm('Are you sure you want to delete this grading scheme?')) return;
    try {
      await axios.delete(`/api/result-config/grading-schemes/${schemeId}`);
      toast.success('Grading scheme deleted successfully');
      fetchGradingSchemes();
    } catch (error) {
      toast.error('Failed to delete grading scheme');
    }
  };

  const handleEditScheme = (scheme) => {
    setEditingScheme(scheme);
    setSchemeForm({
      name: scheme.name,
      description: scheme.description || '',
      is_default: scheme.is_default || false,
      grade_bands: scheme.grade_bands || []
    });
    setIsSchemeDialogOpen(true);
  };

  const resetSchemeForm = () => {
    setSchemeForm({
      name: '',
      description: '',
      is_default: false,
      grade_bands: [
        { grade: 'A+', min_percentage: 90, max_percentage: 100, gpa: 10.0, remarks: 'Excellent' },
        { grade: 'A', min_percentage: 80, max_percentage: 89.99, gpa: 9.0, remarks: 'Very Good' },
        { grade: 'B+', min_percentage: 70, max_percentage: 79.99, gpa: 8.0, remarks: 'Good' },
        { grade: 'B', min_percentage: 60, max_percentage: 69.99, gpa: 7.0, remarks: 'Above Average' },
        { grade: 'C+', min_percentage: 50, max_percentage: 59.99, gpa: 6.0, remarks: 'Average' },
        { grade: 'C', min_percentage: 40, max_percentage: 49.99, gpa: 5.0, remarks: 'Below Average' },
        { grade: 'D', min_percentage: 33, max_percentage: 39.99, gpa: 4.0, remarks: 'Pass' },
        { grade: 'F', min_percentage: 0, max_percentage: 32.99, gpa: 0.0, remarks: 'Fail' }
      ]
    });
  };

  const addGradeBand = () => {
    setSchemeForm(prev => ({
      ...prev,
      grade_bands: [...prev.grade_bands, { grade: '', min_percentage: 0, max_percentage: 0, gpa: 0, remarks: '' }]
    }));
  };

  const removeGradeBand = (index) => {
    setSchemeForm(prev => ({
      ...prev,
      grade_bands: prev.grade_bands.filter((_, i) => i !== index)
    }));
  };

  const updateGradeBand = (index, field, value) => {
    setSchemeForm(prev => ({
      ...prev,
      grade_bands: prev.grade_bands.map((band, i) => 
        i === index ? { ...band, [field]: value } : band
      )
    }));
  };

  const handleSavePromotionRules = async () => {
    try {
      await axios.post('/api/result-config/promotion-rules', promotionRules);
      toast.success('Promotion rules saved successfully');
    } catch (error) {
      toast.error('Failed to save promotion rules');
    }
  };

  const handleSaveResultCardSettings = async () => {
    try {
      await axios.post('/api/result-config/result-card-settings', resultCardSettings);
      toast.success('Result card settings saved successfully');
    } catch (error) {
      toast.error('Failed to save result card settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!canEdit) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            You don't have permission to configure result settings.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Result Configuration
          </h1>
          <p className="text-gray-600 mt-1">Configure grading schemes, promotion rules, and result card settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="grading" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Grading System</span>
            <span className="sm:hidden">Grading</span>
          </TabsTrigger>
          <TabsTrigger value="promotion" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Promotion Rules</span>
            <span className="sm:hidden">Promotion</span>
          </TabsTrigger>
          <TabsTrigger value="resultcard" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Result Card</span>
            <span className="sm:hidden">Card</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grading" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Grading Schemes</CardTitle>
              <Dialog open={isSchemeDialogOpen} onOpenChange={(open) => {
                setIsSchemeDialogOpen(open);
                if (!open) {
                  setEditingScheme(null);
                  resetSchemeForm();
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Scheme
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingScheme ? 'Edit' : 'Create'} Grading Scheme</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Scheme Name</Label>
                        <Input
                          value={schemeForm.name}
                          onChange={(e) => setSchemeForm({...schemeForm, name: e.target.value})}
                          placeholder="e.g., CBSE Grading"
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input
                          value={schemeForm.description}
                          onChange={(e) => setSchemeForm({...schemeForm, description: e.target.value})}
                          placeholder="Optional description"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schemeForm.is_default}
                        onCheckedChange={(checked) => setSchemeForm({...schemeForm, is_default: checked})}
                      />
                      <Label>Set as default grading scheme</Label>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label>Grade Bands</Label>
                        <Button size="sm" variant="outline" onClick={addGradeBand}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Band
                        </Button>
                      </div>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 px-1">
                          <span>Grade</span>
                          <span>Min %</span>
                          <span>Max %</span>
                          <span>GPA</span>
                          <span>Remarks</span>
                          <span></span>
                        </div>
                        {schemeForm.grade_bands.map((band, index) => (
                          <div key={index} className="grid grid-cols-6 gap-2 items-center">
                            <Input
                              value={band.grade}
                              onChange={(e) => updateGradeBand(index, 'grade', e.target.value)}
                              placeholder="A+"
                              className="h-8"
                            />
                            <Input
                              type="number"
                              value={band.min_percentage}
                              onChange={(e) => updateGradeBand(index, 'min_percentage', parseFloat(e.target.value))}
                              className="h-8"
                            />
                            <Input
                              type="number"
                              value={band.max_percentage}
                              onChange={(e) => updateGradeBand(index, 'max_percentage', parseFloat(e.target.value))}
                              className="h-8"
                            />
                            <Input
                              type="number"
                              step="0.1"
                              value={band.gpa}
                              onChange={(e) => updateGradeBand(index, 'gpa', parseFloat(e.target.value))}
                              className="h-8"
                            />
                            <Input
                              value={band.remarks}
                              onChange={(e) => updateGradeBand(index, 'remarks', e.target.value)}
                              placeholder="Excellent"
                              className="h-8"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeGradeBand(index)}
                              className="h-8 text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsSchemeDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveScheme} className="bg-emerald-600 hover:bg-emerald-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save Scheme
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {gradingSchemes.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No grading schemes configured yet.</p>
                  <p className="text-sm">Click "Add Scheme" to create your first grading scheme.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gradingSchemes.map(scheme => (
                    <div key={scheme.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{scheme.name}</h3>
                          {scheme.is_default && (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditScheme(scheme)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteScheme(scheme.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {scheme.description && (
                        <p className="text-sm text-gray-500 mb-3">{scheme.description}</p>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2 font-medium">Grade</th>
                              <th className="text-left py-2 px-2 font-medium">Min %</th>
                              <th className="text-left py-2 px-2 font-medium">Max %</th>
                              <th className="text-left py-2 px-2 font-medium">GPA</th>
                              <th className="text-left py-2 px-2 font-medium">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scheme.grade_bands?.map((band, idx) => (
                              <tr key={idx} className="border-b last:border-0">
                                <td className="py-2 px-2 font-medium">{band.grade}</td>
                                <td className="py-2 px-2">{band.min_percentage}%</td>
                                <td className="py-2 px-2">{band.max_percentage}%</td>
                                <td className="py-2 px-2">{band.gpa}</td>
                                <td className="py-2 px-2 text-gray-500">{band.remarks}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promotion" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Promotion Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Minimum Overall Percentage to Pass</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="number"
                      value={promotionRules.min_overall_percentage}
                      onChange={(e) => setPromotionRules({...promotionRules, min_overall_percentage: parseFloat(e.target.value)})}
                      className="w-24"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>

                <div>
                  <Label>Minimum Subjects Required to Pass</Label>
                  <div className="mt-1">
                    <Input
                      type="number"
                      value={promotionRules.min_subjects_to_pass}
                      onChange={(e) => setPromotionRules({...promotionRules, min_subjects_to_pass: parseInt(e.target.value)})}
                      className="w-24"
                    />
                    <p className="text-xs text-gray-500 mt-1">0 = All subjects must pass</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Grace Marks Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={promotionRules.grace_marks_allowed}
                      onCheckedChange={(checked) => setPromotionRules({...promotionRules, grace_marks_allowed: checked})}
                    />
                    <Label>Allow grace marks</Label>
                  </div>

                  {promotionRules.grace_marks_allowed && (
                    <div>
                      <Label>Maximum Grace Marks per Subject</Label>
                      <Input
                        type="number"
                        value={promotionRules.max_grace_marks}
                        onChange={(e) => setPromotionRules({...promotionRules, max_grace_marks: parseFloat(e.target.value)})}
                        className="w-24 mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Compartment Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={promotionRules.allow_compartment}
                      onCheckedChange={(checked) => setPromotionRules({...promotionRules, allow_compartment: checked})}
                    />
                    <Label>Allow compartment (supplementary exam)</Label>
                  </div>

                  {promotionRules.allow_compartment && (
                    <div>
                      <Label>Maximum Subjects Allowed for Compartment</Label>
                      <Input
                        type="number"
                        value={promotionRules.max_compartment_subjects}
                        onChange={(e) => setPromotionRules({...promotionRules, max_compartment_subjects: parseInt(e.target.value)})}
                        className="w-24 mt-1"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <Button onClick={handleSavePromotionRules} className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="h-4 w-4 mr-2" />
                  Save Promotion Rules
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resultcard" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Result Card Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>School Header Text</Label>
                  <Input
                    value={resultCardSettings.school_header}
                    onChange={(e) => setResultCardSettings({...resultCardSettings, school_header: e.target.value})}
                    placeholder="e.g., ABC Public School, City Name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Result Card Title</Label>
                  <Input
                    value={resultCardSettings.result_title}
                    onChange={(e) => setResultCardSettings({...resultCardSettings, result_title: e.target.value})}
                    placeholder="e.g., Progress Report"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Display Options</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={resultCardSettings.show_rank}
                      onCheckedChange={(checked) => setResultCardSettings({...resultCardSettings, show_rank: checked})}
                    />
                    <Label>Show Rank</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={resultCardSettings.show_percentage}
                      onCheckedChange={(checked) => setResultCardSettings({...resultCardSettings, show_percentage: checked})}
                    />
                    <Label>Show %</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={resultCardSettings.show_gpa}
                      onCheckedChange={(checked) => setResultCardSettings({...resultCardSettings, show_gpa: checked})}
                    />
                    <Label>Show GPA</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={resultCardSettings.show_grade}
                      onCheckedChange={(checked) => setResultCardSettings({...resultCardSettings, show_grade: checked})}
                    />
                    <Label>Show Grade</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={resultCardSettings.show_remarks}
                      onCheckedChange={(checked) => setResultCardSettings({...resultCardSettings, show_remarks: checked})}
                    />
                    <Label>Show Remarks</Label>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Remarks Templates</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Pass Remarks</Label>
                    <Input
                      value={resultCardSettings.remarks_pass}
                      onChange={(e) => setResultCardSettings({...resultCardSettings, remarks_pass: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Fail Remarks</Label>
                    <Input
                      value={resultCardSettings.remarks_fail}
                      onChange={(e) => setResultCardSettings({...resultCardSettings, remarks_fail: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Compartment Remarks</Label>
                    <Input
                      value={resultCardSettings.remarks_compartment}
                      onChange={(e) => setResultCardSettings({...resultCardSettings, remarks_compartment: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Signature Labels</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Principal Signature</Label>
                    <Input
                      value={resultCardSettings.principal_signature_label}
                      onChange={(e) => setResultCardSettings({...resultCardSettings, principal_signature_label: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Class Teacher Signature</Label>
                    <Input
                      value={resultCardSettings.class_teacher_signature_label}
                      onChange={(e) => setResultCardSettings({...resultCardSettings, class_teacher_signature_label: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Parent Signature</Label>
                    <Input
                      value={resultCardSettings.parent_signature_label}
                      onChange={(e) => setResultCardSettings({...resultCardSettings, parent_signature_label: e.target.value})}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <Button onClick={handleSaveResultCardSettings} className="bg-emerald-600 hover:bg-emerald-700">
                  <Save className="h-4 w-4 mr-2" />
                  Save Result Card Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ResultConfiguration;
