import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Save, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
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

const FeeHeadManagement = () => {
    const [feeHeads, setFeeHeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHead, setEditingHead] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        name_bn: '',
    });

    const API = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

    const fetchFeeHeads = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API}/fee-heads`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFeeHeads(response.data);
        } catch (error) {
            console.error("Error fetching fee heads:", error);
            toast.error("Failed to load fee fee types");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeeHeads();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            name_bn: '',
        });
        setEditingHead(null);
    };

    const handleOpenModal = (head = null) => {
        if (head) {
            setEditingHead(head);
            setFormData({
                name: head.name,
                name_bn: head.name_bn || '',
            });
        } else {
            resetForm();
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            if (editingHead) {
                await axios.put(`${API}/fee-heads/${editingHead.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Fee type updated successfully");
            } else {
                await axios.post(`${API}/fee-heads`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success("Fee type created successfully");
            }
            setIsModalOpen(false);
            fetchFeeHeads();
            resetForm();
        } catch (error) {
            console.error("Error saving fee head:", error);
            toast.error("Failed to save fee type");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this fee type?")) return;
        const token = localStorage.getItem('token');
        try {
            await axios.delete(`${API}/fee-heads/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success("Fee type deleted");
            fetchFeeHeads();
        } catch (error) {
            console.error("Error deleting fee head:", error);
            toast.error("Failed to delete fee type");
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;

    return (
        <Card className="w-full mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>ফি ধরন ব্যবস্থাপনা (Fee Type Management)</CardTitle>
                    <CardDescription>নতুন ফি ধরন তৈরি করুন (যেমন: লাইব্রেরি ফি, স্পোর্টস ফি)</CardDescription>
                </div>
                <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    নতুন ফি ধরন
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>নাম (English)</TableHead>
                            <TableHead>নাম (বাংলা)</TableHead>
                            <TableHead className="text-right">অ্যাকশন</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {feeHeads.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                                    কোন ফি ধরন নেই। 'নতুন ফি ধরন' বাটনে ক্লিক করুন।
                                </TableCell>
                            </TableRow>
                        ) : (
                            feeHeads.map((head) => (
                                <TableRow key={head.id}>
                                    <TableCell className="font-medium">{head.name}</TableCell>
                                    <TableCell>{head.name_bn || '-'}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleOpenModal(head)}>
                                            <Edit className="h-4 w-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(head.id)}>
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
                            <DialogTitle>{editingHead ? 'ফি ধরন আপডেট' : 'নতুন ফি ধরন যোগ করুন'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label>নাম (English)</Label>
                                <Input
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    placeholder="e.g. Library Fee, Sports Fee"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>নাম (বাংলা)</Label>
                                <Input
                                    name="name_bn"
                                    value={formData.name_bn}
                                    onChange={handleInputChange}
                                    placeholder="উদাহরণ: লাইব্রেরি ফি"
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

export default FeeHeadManagement;
