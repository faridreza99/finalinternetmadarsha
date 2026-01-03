import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
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
import { Plus, Heart, DollarSign, Filter } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || '/api';

const PURPOSES = [
  { value: 'zakat', label: 'Zakat', label_bn: 'যাকাত' },
  { value: 'sadaqah', label: 'Sadaqah', label_bn: 'সাদকাহ' },
  { value: 'nafol', label: 'Nafol', label_bn: 'নফল' },
  { value: 'donation', label: 'Donation', label_bn: 'দান' }
];

const DonationManagement = () => {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterPurpose, setFilterPurpose] = useState('');
  const [formData, setFormData] = useState({
    donor_name: '',
    donor_phone: '',
    donor_email: '',
    purpose: '',
    amount: '',
    currency: 'BDT',
    payment_method: '',
    transaction_id: '',
    notes: ''
  });

  const fetchDonations = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      let url = `${API}/donations`;
      if (filterPurpose) {
        url += `?purpose=${filterPurpose}`;
      }
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDonations(response.data.donations || []);
    } catch (error) {
      console.error('Failed to fetch donations:', error);
      toast.error('Failed to load donations');
    } finally {
      setLoading(false);
    }
  }, [filterPurpose]);

  useEffect(() => {
    fetchDonations();
  }, [fetchDonations]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount)
      };
      
      await axios.post(`${API}/donations`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Donation recorded successfully');
      
      setIsDialogOpen(false);
      resetForm();
      fetchDonations();
    } catch (error) {
      console.error('Failed to save donation:', error);
      toast.error(error.response?.data?.detail || 'Failed to save donation');
    }
  };

  const resetForm = () => {
    setFormData({
      donor_name: '',
      donor_phone: '',
      donor_email: '',
      purpose: '',
      amount: '',
      currency: 'BDT',
      payment_method: '',
      transaction_id: '',
      notes: ''
    });
  };

  const totalByPurpose = PURPOSES.map(p => ({
    ...p,
    total: donations.filter(d => d.purpose === p.value).reduce((sum, d) => sum + (d.amount || 0), 0)
  }));

  const totalDonations = donations.reduce((sum, d) => sum + (d.amount || 0), 0);

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
            Fund / Donation Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage donations and fund contributions
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Donation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record New Donation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="donor_name">Donor Name</Label>
                <Input
                  id="donor_name"
                  value={formData.donor_name}
                  onChange={(e) => setFormData({...formData, donor_name: e.target.value})}
                  placeholder="Enter donor name"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="donor_phone">Phone</Label>
                  <Input
                    id="donor_phone"
                    value={formData.donor_phone}
                    onChange={(e) => setFormData({...formData, donor_phone: e.target.value})}
                    placeholder="Phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="donor_email">Email</Label>
                  <Input
                    id="donor_email"
                    type="email"
                    value={formData.donor_email}
                    onChange={(e) => setFormData({...formData, donor_email: e.target.value})}
                    placeholder="Email address"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="purpose">Purpose</Label>
                <Select
                  value={formData.purpose}
                  onValueChange={(value) => setFormData({...formData, purpose: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select purpose" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label} ({p.label_bn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  placeholder="Enter amount"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({...formData, payment_method: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="bkash">bKash</SelectItem>
                    <SelectItem value="nagad">Nagad</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="transaction_id">Transaction ID</Label>
                <Input
                  id="transaction_id"
                  value={formData.transaction_id}
                  onChange={(e) => setFormData({...formData, transaction_id: e.target.value})}
                  placeholder="Transaction reference (optional)"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                  Record Donation
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-xl font-bold">{totalDonations.toLocaleString()} BDT</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {totalByPurpose.map((p) => (
          <Card key={p.value}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Heart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">{p.label}</p>
                  <p className="text-xl font-bold">{p.total.toLocaleString()} BDT</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center">
              <Heart className="w-5 h-5 mr-2" />
              Donations
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={filterPurpose} onValueChange={setFilterPurpose}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All purposes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All purposes</SelectItem>
                  {PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No donations found.
                  </TableCell>
                </TableRow>
              ) : (
                donations.map((donation) => (
                  <TableRow key={donation.id}>
                    <TableCell>
                      {donation.created_at ? new Date(donation.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell className="font-medium">{donation.donor_name}</TableCell>
                    <TableCell>{donation.donor_phone || '-'}</TableCell>
                    <TableCell>
                      <Badge>
                        {PURPOSES.find(p => p.value === donation.purpose)?.label || donation.purpose}
                      </Badge>
                    </TableCell>
                    <TableCell>{donation.amount?.toLocaleString()} {donation.currency}</TableCell>
                    <TableCell>{donation.payment_method || '-'}</TableCell>
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

export default DonationManagement;
