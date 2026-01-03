import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

const FeeTypeManagement = () => {
  const [feeTypes, setFeeTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    name_bn: '',
    amount: '',
    currency: 'BDT',
    description: '',
    is_active: true
  });

  const fetchFeeTypes = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/fee-types`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeTypes(response.data.fee_types || []);
    } catch (error) {
      console.error('Failed to fetch fee types:', error);
      toast.error('Failed to load fee types');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeTypes();
  }, [fetchFeeTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount)
      };
      
      if (editingFeeType) {
        await axios.put(`${API}/fee-types/${editingFeeType.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Fee type updated successfully');
      } else {
        await axios.post(`${API}/fee-types`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Fee type created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingFeeType(null);
      resetForm();
      fetchFeeTypes();
    } catch (error) {
      console.error('Failed to save fee type:', error);
      toast.error(error.response?.data?.detail || 'Failed to save fee type');
    }
  };

  const handleEdit = (feeType) => {
    setEditingFeeType(feeType);
    setFormData({
      name: feeType.name || '',
      name_bn: feeType.name_bn || '',
      amount: feeType.amount?.toString() || '',
      currency: feeType.currency || 'BDT',
      description: feeType.description || '',
      is_active: feeType.is_active !== false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (feeTypeId) => {
    if (!window.confirm('Are you sure you want to delete this fee type?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/fee-types/${feeTypeId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Fee type deleted successfully');
      fetchFeeTypes();
    } catch (error) {
      console.error('Failed to delete fee type:', error);
      toast.error('Failed to delete fee type');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_bn: '',
      amount: '',
      currency: 'BDT',
      description: '',
      is_active: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Fee Type Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage fee types and their amounts
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingFeeType(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Fee Type
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingFeeType ? 'Edit Fee Type' : 'Create New Fee Type'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name (English)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., General, Foreign, Zakat"
                  required
                />
              </div>

              <div>
                <Label htmlFor="name_bn">Name (Bengali)</Label>
                <Input
                  id="name_bn"
                  value={formData.name_bn}
                  onChange={(e) => setFormData({...formData, name_bn: e.target.value})}
                  placeholder="Bengali name (optional)"
                />
              </div>

              <div>
                <Label htmlFor="amount">Monthly Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="e.g., 720"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="is_active">Active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  {editingFeeType ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Fee Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Name (Bengali)</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No fee types found. Add your first fee type!
                  </TableCell>
                </TableRow>
              ) : (
                feeTypes.map((feeType) => (
                  <TableRow key={feeType.id}>
                    <TableCell className="font-medium">{feeType.name}</TableCell>
                    <TableCell>{feeType.name_bn || '-'}</TableCell>
                    <TableCell>{feeType.amount} {feeType.currency}</TableCell>
                    <TableCell>{feeType.description || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={feeType.is_active ? 'success' : 'destructive'}>
                        {feeType.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(feeType)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(feeType.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeTypeManagement;
