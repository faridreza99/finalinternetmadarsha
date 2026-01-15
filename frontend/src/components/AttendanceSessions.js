import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Plus, Edit, Trash2, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Badge } from './ui/badge';

const AttendanceSessions = () => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        start_time: '',
        end_time: '',
        is_active: true
    });

    const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_BASE_URL}/attendance-sessions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSessions(response.data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
            toast.error('হাজিরা সেশন লোড করতে ব্যর্থ');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const resetForm = () => {
        setFormData({
            name: '',
            start_time: '',
            end_time: '',
            is_active: true
        });
    };

    const handleAddSession = () => {
        resetForm();
        setIsAddModalOpen(true);
    };

    const handleEditSession = (session) => {
        setEditingSession(session);
        setFormData({
            name: session.name,
            start_time: session.start_time,
            end_time: session.end_time,
            is_active: session.is_active
        });
        setIsEditModalOpen(true);
    };

    const handleSubmitAdd = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.start_time || !formData.end_time) {
            toast.error('অনুগ্রহ করে সব প্রয়োজনীয় ক্ষেত্র পূরণ করুন');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/attendance-sessions`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('সেশন সফলভাবে তৈরি করা হয়েছে');
            setIsAddModalOpen(false);
            fetchSessions();
        } catch (error) {
            console.error('Error creating session:', error);
            toast.error(error.response?.data?.detail || 'সেশন তৈরি করতে ব্যর্থ');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitEdit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.start_time || !formData.end_time) {
            toast.error('অনুগ্রহ করে সব প্রয়োজনীয় ক্ষেত্র পূরণ করুন');
            return;
        }

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/attendance-sessions/${editingSession.id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('সেশন সফলভাবে আপডেট করা হয়েছে');
            setIsEditModalOpen(false);
            setEditingSession(null);
            fetchSessions();
        } catch (error) {
            console.error('Error updating session:', error);
            toast.error(error.response?.data?.detail || 'সেশন আপডেট করতে ব্যর্থ');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSession = async (id) => {
        if (!window.confirm('আপনি কি নিশ্চিত যে আপনি এই সেশনটি মুছে ফেলতে চান?')) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/attendance-sessions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('সেশন সফলভাবে মুছে ফেলা হয়েছে');
            fetchSessions();
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error('সেশন মুছে ফেলতে ব্যর্থ');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const suffix = h >= 12 ? 'PM' : 'AM';
        const formattedHour = h % 12 || 12;
        return `${formattedHour}:${minutes} ${suffix}`;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>হাজিরা সেশন</CardTitle>
                        <CardDescription>দৈনিক হাজিরা সেশন এবং সময়সূচী কনফিগার করুন</CardDescription>
                    </div>
                    <Button onClick={handleAddSession} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" /> সেশন যোগ করুন
                    </Button>
                </CardHeader>
                <CardContent>
                    {loading && sessions.length === 0 ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>নাম</TableHead>
                                        <TableHead>সময় সীমা</TableHead>
                                        <TableHead>অবস্থা</TableHead>
                                        <TableHead className="text-right">কর্ম</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sessions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                কোন সেশন পাওয়া যায়নি। শুরু করতে একটি তৈরি করুন।
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        sessions.map((session) => (
                                            <TableRow key={session.id}>
                                                <TableCell className="font-medium">{session.name}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="h-4 w-4 text-gray-500" />
                                                        {formatTime(session.start_time)} - {formatTime(session.end_time)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {session.is_active ? (
                                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
                                                            <CheckCircle className="w-3 h-3 mr-1" /> সক্রিয়
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">
                                                            <XCircle className="w-3 h-3 mr-1" /> নিষ্ক্রিয়
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditSession(session)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDeleteSession(session.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Session Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>হাজিরা সেশন যোগ করুন</DialogTitle>
                        <DialogDescription>হাজিরা ট্র্যাকিংয়ের জন্য একটি নতুন সময় স্লট তৈরি করুন</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitAdd} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">সেশনের নাম</Label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="যেমন: সকালের সেশন"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="start_time">শুরুর সময়</Label>
                                <Input
                                    id="start_time"
                                    name="start_time"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end_time">শেষের সময়</Label>
                                <Input
                                    id="end_time"
                                    name="end_time"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                            />
                            <Label htmlFor="is_active">সক্রিয় অবস্থা</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>বাতিল</Button>
                            <Button type="submit">সেশন তৈরি করুন</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Session Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>হাজিরা সেশন সম্পাদনা করুন</DialogTitle>
                        <DialogDescription>সেশনের বিবরণ আপডেট করুন</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitEdit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">সেশনের নাম</Label>
                            <Input
                                id="edit-name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-start_time">শুরুর সময়</Label>
                                <Input
                                    id="edit-start_time"
                                    name="start_time"
                                    type="time"
                                    value={formData.start_time}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-end_time">শেষের সময়</Label>
                                <Input
                                    id="edit-end_time"
                                    name="end_time"
                                    type="time"
                                    value={formData.end_time}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-is_active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                            />
                            <Label htmlFor="edit-is_active">সক্রিয় অবস্থা</Label>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>বাতিল</Button>
                            <Button type="submit">সেশন আপডেট করুন</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AttendanceSessions;
