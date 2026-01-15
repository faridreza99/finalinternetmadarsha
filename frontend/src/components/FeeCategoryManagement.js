import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "./ui/dialog";
import { Label } from "./ui/label";

const FeeCategoryManagement = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        name_bn: '',
        amount: '',
        description: ''
    });

    const fetchCategories = async () => {
        try {
            const response = await axios.get('http://localhost:8000/api/student-fee-categories');
            setCategories(response.data);
        } catch (error) {
            console.error("Error fetching categories:", error);
            toast.error("Failed to load fee categories");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            name_bn: '',
            amount: '',
            description: ''
        });
        setEditingCategory(null);
    };

    const handleOpenModal = (category = null) => {
        if (category) {
            setEditingCategory(category);
            setFormData({
                name: category.name,
                name_bn: category.name_bn || '',
                amount: category.amount,
                description: category.description || ''
            });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingCategory) {
                await axios.put(`http://localhost:8000/api/student-fee-categories/${editingCategory.id}`, {
                    ...formData,
                    amount: parseFloat(formData.amount)
                });
                toast.success("Category updated successfully");
            } else {
                await axios.post('http://localhost:8000/api/student-fee-categories', {
                    ...formData,
                    amount: parseFloat(formData.amount)
                });
                toast.success("Category created successfully");
            }
            setIsModalOpen(false);
            fetchCategories();
            resetForm();
        } catch (error) {
            console.error("Error saving category:", error);
            toast.error("Failed to save category");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this category?")) return;
        try {
            await axios.delete(`http://localhost:8000/api/student-fee-categories/${id}`);
            toast.success("Category deleted");
            fetchCategories();
        } catch (error) {
            console.error("Error deleting category:", error);
            toast.error("Failed to delete category");
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>মাসিক ফি ক্যাটাগরি (Fee Categories)</CardTitle>
                <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    নতুন ক্যাটাগরি
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>নাম (English)</TableHead>
                            <TableHead>নাম (বাংলা)</TableHead>
                            <TableHead>পরিমাণ (টাকা)</TableHead>
                            <TableHead>বিবরণ</TableHead>
                            <TableHead className="text-right">অ্যাকশন</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    কোন ক্যাটাগরি নেই। 'নতুন ক্যাটাগরি' বাটনে ক্লিক করুন।
                                </TableCell>
                            </TableRow>
                        ) : (
                            categories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">{category.name}</TableCell>
                                    <TableCell>{category.name_bn || '-'}</TableCell>
                                    <TableCell className="font-bold text-green-600">৳{category.amount}</TableCell>
                                    <TableCell>{category.description || '-'}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(category)}>
                                            <Edit className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(category.id)}>
                                            <Trash2 className="h-4 w-4 text-red-600" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingCategory ? 'ক্যাটাগরি এবং ফি আপডেট' : 'নতুন ফি ক্যাটাগরি যোগ করুন'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>নাম (English)</Label>
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. General, Nofol Sadakah"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>নাম (বাংলা)</Label>
                                <Input
                                    name="name_bn"
                                    value={formData.name_bn}
                                    onChange={handleInputChange}
                                    placeholder="উদাহরণ: সাধারণ, নফল সদকা"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>পরিমাণ (টাকা)</Label>
                                <Input
                                    name="amount"
                                    type="number"
                                    value={formData.amount}
                                    onChange={handleInputChange}
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>বিবরণ (ঐচ্ছিক)</Label>
                                <Input
                                    name="description"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    placeholder="সংক্ষিপ্ত বিবরণ..."
                                />
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>বাতিল</Button>
                                <Button type="submit" className="bg-green-600 hover:bg-green-700">সেভ করুন</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
    );
};

export default FeeCategoryManagement;
