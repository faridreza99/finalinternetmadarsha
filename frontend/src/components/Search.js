import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search as SearchIcon, Users, UserCheck, BookOpen, GraduationCap, Calendar, FileText, ArrowLeft, Loader } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import i18n from '../i18n';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState({ students: [], staff: [], classes: [] });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const t = (key) => i18n.t(key);

  const performSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ students: [], staff: [], classes: [] });
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const q = searchQuery.toLowerCase();

      const [studentsRes, staffRes, classesRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/students`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/staff`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API_BASE_URL}/classes`, { headers }).catch(() => ({ data: [] }))
      ]);

      const students = (Array.isArray(studentsRes.data) ? studentsRes.data : studentsRes.data.students || [])
        .filter(s => 
          s.full_name?.toLowerCase().includes(q) ||
          s.student_id?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.phone?.includes(q)
        ).slice(0, 10);

      const staff = (Array.isArray(staffRes.data) ? staffRes.data : staffRes.data.staff || [])
        .filter(s => 
          s.full_name?.toLowerCase().includes(q) ||
          s.employee_id?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q) ||
          s.phone?.includes(q)
        ).slice(0, 10);

      const classes = (Array.isArray(classesRes.data) ? classesRes.data : classesRes.data.classes || [])
        .filter(c => 
          c.name?.toLowerCase().includes(q) ||
          c.section?.toLowerCase().includes(q)
        ).slice(0, 10);

      setResults({ students, staff, classes });
    } catch (error) {
      console.error('Search error:', error);
      setResults({ students: [], staff: [], classes: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
      performSearch(query);
    }
  };

  const totalResults = results.students.length + results.staff.length + results.classes.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {t('common.search') || 'Search'}
          </h1>
        </div>

        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Search students, staff, classes..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 text-base bg-white dark:bg-gray-800"
                autoFocus
              />
            </div>
            <Button type="submit" className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700">
              <SearchIcon className="h-5 w-5" />
            </Button>
          </div>
        </form>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        )}

        {!loading && hasSearched && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {totalResults} result{totalResults !== 1 ? 's' : ''} for "{searchParams.get('q')}"
            </p>

            {results.students.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  Students ({results.students.length})
                </h2>
                <div className="grid gap-3">
                  {results.students.map((student) => (
                    <Card key={student.id} className="hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-800" onClick={() => navigate(`/students/${student.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                              <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{student.full_name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {student.student_id} • {student.class_name || 'No class'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            Student
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {results.staff.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  <UserCheck className="h-5 w-5 text-emerald-600" />
                  Staff ({results.staff.length})
                </h2>
                <div className="grid gap-3">
                  {results.staff.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-800" onClick={() => navigate(`/staff/${member.id}`)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                              <UserCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{member.full_name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {member.employee_id} • {member.department || member.designation || 'Staff'}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            {member.role || 'Staff'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {results.classes.length > 0 && (
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  Classes ({results.classes.length})
                </h2>
                <div className="grid gap-3">
                  {results.classes.map((cls) => (
                    <Card key={cls.id} className="hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-800" onClick={() => navigate('/classes')}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{cls.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Section: {cls.section || 'N/A'} • {cls.student_count || 0} students
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            Class
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {totalResults === 0 && (
              <div className="text-center py-12">
                <SearchIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No results found for "{searchParams.get('q')}"</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        )}

        {!loading && !hasSearched && (
          <div className="text-center py-12">
            <SearchIcon className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Search for students, staff, or classes</p>
          </div>
        )}
      </div>
    </div>
  );
}
