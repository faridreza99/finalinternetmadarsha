import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCurrency } from '../context/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { toast } from 'sonner';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { 
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Download,
  Plus,
  Search,
  Calendar,
  FileText
} from 'lucide-react';

const Accounts = () => {
  const { formatCurrency } = useCurrency();
  const [dashboardData, setDashboardData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [transactionForm, setTransactionForm] = useState({
    transaction_type: '',
    category: '',
    description: '',
    amount: '',
    payment_method: '',
    transaction_date: '',
    reference_no: '',
    remarks: ''
  });
  
  // Get API configuration
  const API = process.env.REACT_APP_API_URL || '/api';
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAccountsData();
  }, []);
  
  useEffect(() => {
    applyFilters();
  }, [searchTerm, typeFilter, categoryFilter, dateFilter, transactions]);

  const fetchAccountsData = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data and transactions
      const [dashboardResponse, transactionsResponse] = await Promise.all([
        axios.get(`${API}/accounts/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setDashboardData(dashboardResponse.data);
      setTransactions(transactionsResponse.data);
      setFilteredTransactions(transactionsResponse.data);
      
      console.log('📊 Dashboard data loaded:', dashboardResponse.data);
      console.log('💰 Transactions loaded:', transactionsResponse.data.length);
      
    } catch (error) {
      console.error('❌ Failed to fetch accounts data:', error);
      toast.error('Failed to load accounts data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddTransaction = async () => {
    try {
      if (!transactionForm.transaction_type || !transactionForm.category || 
          !transactionForm.description || !transactionForm.amount || 
          !transactionForm.payment_method) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      const response = await axios.post(`${API}/transactions`, {
        ...transactionForm,
        amount: parseFloat(transactionForm.amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Transaction added successfully!');
      setIsAddDialogOpen(false);
      resetTransactionForm();
      await fetchAccountsData(); // Refresh data
      
    } catch (error) {
      console.error('❌ Failed to add transaction:', error);
      toast.error('Failed to add transaction');
    }
  };
  
  const handleEditTransaction = async () => {
    try {
      if (!selectedTransaction) return;
      
      const response = await axios.put(`${API}/transactions/${selectedTransaction.id}`, {
        ...transactionForm,
        amount: parseFloat(transactionForm.amount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Transaction updated successfully!');
      setIsEditDialogOpen(false);
      resetTransactionForm();
      await fetchAccountsData(); // Refresh data
      
    } catch (error) {
      console.error('❌ Failed to update transaction:', error);
      toast.error('Failed to update transaction');
    }
  };
  
  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }
    
    try {
      await axios.delete(`${API}/transactions/${transactionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Transaction deleted successfully!');
      await fetchAccountsData(); // Refresh data
      
    } catch (error) {
      console.error('❌ Failed to delete transaction:', error);
      toast.error('Failed to delete transaction');
    }
  };
  
  const resetTransactionForm = () => {
    setTransactionForm({
      transaction_type: '',
      category: '',
      description: '',
      amount: '',
      payment_method: '',
      transaction_date: '',
      reference_no: '',
      remarks: ''
    });
  };
  
  const openEditDialog = (transaction) => {
    setSelectedTransaction(transaction);
    setTransactionForm({
      transaction_type: transaction.transaction_type,
      category: transaction.category,
      description: transaction.description,
      amount: transaction.amount.toString(),
      payment_method: transaction.payment_method,
      transaction_date: transaction.transaction_date ? transaction.transaction_date.split('T')[0] : '',
      reference_no: transaction.reference_no || '',
      remarks: transaction.remarks || ''
    });
    setIsEditDialogOpen(true);
  };
  
  const handleExport = async (format) => {
    try {
      const response = await axios.get(`${API}/accounts/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `accounts_report.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`${format.toUpperCase()} report downloaded successfully!`);
      
    } catch (error) {
      console.error(`❌ Failed to export ${format}:`, error);
      toast.error(`Failed to export ${format.toUpperCase()} report`);
    }
  };
  
  const applyFilters = () => {
    let filtered = transactions;
    
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (typeFilter && typeFilter !== 'all') {
      filtered = filtered.filter(t => t.transaction_type === typeFilter);
    }
    
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }
    
    if (dateFilter.from) {
      filtered = filtered.filter(t => new Date(t.transaction_date) >= new Date(dateFilter.from));
    }
    
    if (dateFilter.to) {
      filtered = filtered.filter(t => new Date(t.transaction_date) <= new Date(dateFilter.to));
    }
    
    setFilteredTransactions(filtered);
  };


  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Accounts</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Financial management and transaction tracking</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => setDateFilter({from: new Date().toISOString().split('T')[0], to: new Date().toISOString().split('T')[0]})}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Day
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => {
              const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
              const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
              setDateFilter({from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0]});
            }}
          >
            Month
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => {
              const firstDay = new Date(new Date().getFullYear(), 0, 1);
              const lastDay = new Date(new Date().getFullYear(), 11, 31);
              setDateFilter({from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0]});
            }}
          >
            Year
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => handleExport('excel')}
          >
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="flex-1 sm:flex-none"
            onClick={() => handleExport('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Transaction</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Type*</label>
                    <Select value={transactionForm.transaction_type} onValueChange={(value) => setTransactionForm(prev => ({...prev, transaction_type: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Income">Income</SelectItem>
                        <SelectItem value="Expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Category*</label>
                    <Select value={transactionForm.category} onValueChange={(value) => setTransactionForm(prev => ({...prev, category: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fees">Fees</SelectItem>
                        <SelectItem value="Salaries">Salaries</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Donations">Donations</SelectItem>
                        <SelectItem value="Equipment">Equipment</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Description*</label>
                  <Input 
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm(prev => ({...prev, description: e.target.value}))}
                    placeholder="Enter description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Amount*</label>
                    <Input 
                      type="number"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm(prev => ({...prev, amount: e.target.value}))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Payment Method*</label>
                    <Select value={transactionForm.payment_method} onValueChange={(value) => setTransactionForm(prev => ({...prev, payment_method: value}))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Transaction Date</label>
                  <Input 
                    type="date"
                    value={transactionForm.transaction_date}
                    onChange={(e) => setTransactionForm(prev => ({...prev, transaction_date: e.target.value}))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Reference No.</label>
                  <Input 
                    value={transactionForm.reference_no}
                    onChange={(e) => setTransactionForm(prev => ({...prev, reference_no: e.target.value}))}
                    placeholder="Optional reference number"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Remarks</label>
                  <Input 
                    value={transactionForm.remarks}
                    onChange={(e) => setTransactionForm(prev => ({...prev, remarks: e.target.value}))}
                    placeholder="Optional remarks"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleAddTransaction} className="bg-emerald-500 hover:bg-emerald-600">Add Transaction</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        <Card className="card-hover">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Opening Balance</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  {loading ? 'Loading...' : formatCurrency(dashboardData?.opening_balance || 0)}
                </p>
              </div>
              <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-hover">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Closing Balance</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                  {loading ? 'Loading...' : formatCurrency(dashboardData?.closing_balance || 0)}
                </p>
              </div>
              <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Income</p>
                <p className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">
                  {loading ? 'Loading...' : formatCurrency(dashboardData?.total_income || 0)}
                </p>
                <div className="flex items-center text-[10px] sm:text-xs text-emerald-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {loading ? '' : `${dashboardData?.transactions_count || 0} transactions`}
                </div>
              </div>
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between min-w-0">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Expenses</p>
                <p className="text-lg sm:text-2xl font-bold text-red-600 truncate">
                  {loading ? 'Loading...' : formatCurrency(dashboardData?.total_expenses || 0)}
                </p>
                <div className="flex items-center text-[10px] sm:text-xs text-red-500">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Cash: {loading ? '' : formatCurrency(dashboardData?.cash_balance || 0)}
                </div>
              </div>
              <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-10 text-sm sm:text-base"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
              <Input 
                type="date" 
                className="text-sm sm:text-base"
                placeholder="From Date" 
                value={dateFilter.from}
                onChange={(e) => setDateFilter(prev => ({...prev, from: e.target.value}))}
              />
              <Input 
                type="date" 
                className="text-sm sm:text-base"
                placeholder="To Date" 
                value={dateFilter.to}
                onChange={(e) => setDateFilter(prev => ({...prev, to: e.target.value}))}
              />
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="text-sm sm:text-base">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Income">Income</SelectItem>
                  <SelectItem value="Expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="text-sm sm:text-base">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Fees">Fees</SelectItem>
                  <SelectItem value="Salaries">Salaries</SelectItem>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Donations">Donations</SelectItem>
                  <SelectItem value="Equipment">Equipment</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-emerald-500" />
              <span>Transaction History</span>
            </div>
            <Badge variant="secondary">{filteredTransactions.length} transactions</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="rounded-md border min-w-[800px] sm:min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">Txn ID</TableHead>
                    <TableHead className="text-xs sm:text-sm">Date</TableHead>
                    <TableHead className="text-xs sm:text-sm">Description</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs sm:text-sm">Category</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs sm:text-sm">Type</TableHead>
                    <TableHead className="text-xs sm:text-sm">Amount</TableHead>
                    <TableHead className="hidden md:table-cell text-xs sm:text-sm">Payment Method</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500 text-sm">
                        Loading transactions...
                      </TableCell>
                    </TableRow>
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500 text-sm">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-medium text-xs sm:text-sm">{transaction.receipt_no || `TXN${transaction.id.slice(-6)}`}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-xs sm:text-sm max-w-[150px] truncate">{transaction.description}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="text-[10px] sm:text-xs">{transaction.category}</Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge 
                            variant={transaction.transaction_type === 'Income' ? 'default' : 'secondary'}
                            className={transaction.transaction_type === 'Income' ? 'bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs' : 'bg-red-100 text-red-800 text-[10px] sm:text-xs'}
                          >
                            {transaction.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`${transaction.transaction_type === 'Income' ? 'text-emerald-600' : 'text-red-600'} font-semibold text-xs sm:text-sm`}>
                          {transaction.transaction_type === 'Income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center">
                            {transaction.payment_method === 'Cash' ? 
                              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-green-500" /> :
                              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 text-blue-500" />
                            }
                            <span className="text-xs sm:text-sm">{transaction.payment_method}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 sm:gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-2"
                              onClick={() => openEditDialog(transaction)}
                            >
                              <span className="hidden sm:inline text-xs">Edit</span>
                              <Plus className="h-4 w-4 sm:hidden rotate-45" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              <span className="hidden sm:inline text-xs">Delete</span>
                              <X className="h-4 w-4 sm:hidden" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Summary Footer */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-center">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-gray-600 uppercase tracking-wider font-medium">Total Income</p>
                <p className="text-base sm:text-lg font-bold text-emerald-600 truncate">
                  +{loading ? '...' : formatCurrency(dashboardData?.total_income || 0)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-gray-600 uppercase tracking-wider font-medium">Total Expenses</p>
                <p className="text-base sm:text-lg font-bold text-red-600 truncate">
                  -{loading ? '...' : formatCurrency(dashboardData?.total_expenses || 0)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-gray-600 uppercase tracking-wider font-medium">Net Balance</p>
                <p className="text-base sm:text-lg font-bold text-blue-600 truncate">
                  {loading ? '...' : formatCurrency(dashboardData?.net_balance || 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit Transaction Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Type*</label>
                <Select value={transactionForm.transaction_type} onValueChange={(value) => setTransactionForm(prev => ({...prev, transaction_type: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Income">Income</SelectItem>
                    <SelectItem value="Expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Category*</label>
                <Select value={transactionForm.category} onValueChange={(value) => setTransactionForm(prev => ({...prev, category: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fees">Fees</SelectItem>
                    <SelectItem value="Salaries">Salaries</SelectItem>
                    <SelectItem value="Utilities">Utilities</SelectItem>
                    <SelectItem value="Donations">Donations</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Description*</label>
              <Input 
                value={transactionForm.description}
                onChange={(e) => setTransactionForm(prev => ({...prev, description: e.target.value}))}
                placeholder="Enter description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Amount*</label>
                <Input 
                  type="number"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm(prev => ({...prev, amount: e.target.value}))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Method*</label>
                <Select value={transactionForm.payment_method} onValueChange={(value) => setTransactionForm(prev => ({...prev, payment_method: value}))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Transaction Date</label>
              <Input 
                type="date"
                value={transactionForm.transaction_date}
                onChange={(e) => setTransactionForm(prev => ({...prev, transaction_date: e.target.value}))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reference No.</label>
              <Input 
                value={transactionForm.reference_no}
                onChange={(e) => setTransactionForm(prev => ({...prev, reference_no: e.target.value}))}
                placeholder="Optional reference number"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Remarks</label>
              <Input 
                value={transactionForm.remarks}
                onChange={(e) => setTransactionForm(prev => ({...prev, remarks: e.target.value}))}
                placeholder="Optional remarks"
              />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditTransaction} className="bg-blue-500 hover:bg-blue-600">Update Transaction</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Accounts;