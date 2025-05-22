"use client";

import { useState, useEffect } from 'react';
import { toast } from "sonner"
import { Button } from './button';
import { Pencil, Trash2, Clock, Users, Plus, Check } from 'lucide-react';
import { Input } from './input';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogDescription 
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";
// Import the shadcn Calendar component
import { Calendar } from "@/components/ui/calendar";
import { 
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Updated types
interface User {
    id: string;
    name: string;
    email: string;
}

interface Participant {
    id: string;
    user_id?: string;
    email: string;
    is_confirmed: boolean;
    name?: string;
}

interface Appointment {
    id: string;
    title: string;
    description?: string;
    creator_id: string;
    creator_name?: string;
    appointment_date: string;
    appointment_time: string;
    duration: number;
    created_at: string;
    participants: Participant[];
}

interface BookingData {
    title: string;
    description: string;
    appointmentDate: string;
    appointmentTime: string;
    duration: number;
    participants: {email: string}[];
}

// ...existing code...

export default function Schedule() {
    // Get user session
    const { data: session } = useSession();
    const currentUserId = session?.user?.id as string;
    
    const [date, setDate] = useState<Date>(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // View filter state
    const [viewMode, setViewMode] = useState<'all' | 'created' | 'participating'>('all');
    
    // Booking form states
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedTime, setSelectedTime] = useState("09:00");
    const [appointmentTitle, setAppointmentTitle] = useState("");
    const [appointmentDescription, setAppointmentDescription] = useState("");
    const [duration, setDuration] = useState(30);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAppointmentId, setCurrentAppointmentId] = useState<string | null>(null);
    
    // Participants state
    const [participants, setParticipants] = useState<{email: string}[]>([{email: ''}]);
    const [availableUsers, setAvailableUsers] = useState<User[]>([]);
    
    // Delete dialog state
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
    
    // Load user list
    useEffect(() => {
        fetchUsers();
    }, []);
    
    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const users = await response.json();
                setAvailableUsers(users);
            }
        } catch (err) {
            console.error("Error loading users:", err);
        }
    };
    
    const handleDateChange = (newDate: Date | undefined) => {
        if (newDate) {
            setDate(newDate);
        }
    };
    
    // Filter appointments based on view mode
    useEffect(() => {
        if (viewMode === 'all') {
            setFilteredAppointments(appointments);
        } else if (viewMode === 'created') {
            setFilteredAppointments(
                appointments.filter(app => app.creator_id === currentUserId)
            );
        } else if (viewMode === 'participating') {
            setFilteredAppointments(
                appointments.filter(app => 
                    app.creator_id === currentUserId || 
                    app.participants.some(p => p.user_id === currentUserId || p.email === session?.user?.email)
                )
            );
        }
    }, [appointments, viewMode, currentUserId, session?.user?.email]);
    
    // Fetch existing appointments for the selected date
    useEffect(() => {
        async function fetchAppointments() {
            setLoading(true);
            setError(null);
            try {
                const formattedDate = date.toISOString().split('T')[0];
                const response = await fetch(`/api/appointments?date=${formattedDate}`);
                
                if (!response.ok) {
                    const errorData = await response.text();
                    throw new Error(`Error ${response.status}: ${errorData}`);
                }
                
                const data: Appointment[] = await response.json();
                setAppointments(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                console.error('Error retrieving appointments:', err);
            } finally {
                setLoading(false);
            }
        }
        
        fetchAppointments();
    }, [date]);
    
    // Add a participant
    const addParticipant = () => {
        setParticipants([...participants, { email: '' }]);
    };
    
    // Remove a participant
    const removeParticipant = (index: number) => {
        if (participants.length > 1) {
            const newParticipants = [...participants];
            newParticipants.splice(index, 1);
            setParticipants(newParticipants);
        }
    };
    
    // Change a participant's email
    const handleParticipantChange = (index: number, email: string) => {
        const newParticipants = [...participants];
        newParticipants[index] = { email };
        setParticipants(newParticipants);
    };
    
    // Open dialog to book a slot
    const openBookingDialog = () => {
        // Reset the form
        setAppointmentTitle("");
        setAppointmentDescription("");
        setSelectedTime("09:00");
        setDuration(30);
        setParticipants([{email: ''}]);
        setIsEditing(false);
        setCurrentAppointmentId(null);
        setIsDialogOpen(true);
    };
    
    // Open dialog to edit an appointment
    const openEditDialog = (appointment: Appointment) => {
        if (appointment.creator_id !== currentUserId) {
            toast("You can only modify appointments that you created");
            return;
        }
        
        setAppointmentTitle(appointment.title);
        setAppointmentDescription(appointment.description || "");
        setSelectedTime(appointment.appointment_time);
        setDuration(appointment.duration || 30);
        setParticipants(appointment.participants.map(p => ({ email: p.email })));
        setIsEditing(true);
        setCurrentAppointmentId(appointment.id);
        setIsDialogOpen(true);
    };
    
    // Open dialog to confirm appointment deletion
    const openDeleteDialog = (appointmentId: string, creatorId: string) => {
        if (creatorId !== currentUserId) {
            toast("You can only delete appointments that you created");
            return;
        }
        
        setAppointmentToDelete(appointmentId);
        setIsDeleteDialogOpen(true);
    };
    
    // Handle booking function
    const handleBooking = async () => {
        // Required fields validation
        if (!appointmentTitle.trim()) {
            toast("Title is required");
            return;
        }
        
        if (!selectedTime) {
            toast("Time is required");
            return;
        }
        
        // Date format validation
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            toast("The selected date is not valid");
            return;
        }
        
        // Filter empty participants and verify email validity
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validParticipants = participants
            .filter(p => p.email.trim() !== '')
            .map(p => ({ email: p.email.trim() }));
        
        // Verify that emails are valid
        const invalidEmail = validParticipants.find(p => !emailRegex.test(p.email));
        if (invalidEmail) {
            toast(`Email '${invalidEmail.email}' is not valid`);
            return;
        }
        
        setLoading(true);
        
        try {
            // Explicit data formatting to avoid problems
            const bookingData: BookingData = {
                title: appointmentTitle.trim(),
                description: appointmentDescription.trim(),
                appointmentDate: date.toISOString().split('T')[0], // Format YYYY-MM-DD
                appointmentTime: selectedTime,
                duration: Number(duration),
                participants: validParticipants
            };
            
            console.log("Data sent:", bookingData); // For debugging
            
            let response;
            
            if (isEditing && currentAppointmentId) {
                response = await fetch(`/api/appointments/${currentAppointmentId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData),
                });
            } else {
                response = await fetch('/api/appointments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData),
                });
            }
            
            // Get error message from server if available
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                
                // Check if error is about unregistered participants
                if (errorData.code === 'UNKNOWN_PARTICIPANTS') {
                    const unknownEmails = errorData.unknownParticipants || [];
                    throw new Error(
                        `The following participants are not registered: ${unknownEmails.join(', ')}`
                    );
                } else if (errorData.message && errorData.message.includes('participant')) {
                    // Fallback for other participant-related errors
                    throw new Error(errorData.message);
                } else {
                    throw new Error(
                        errorData.message || 
                        `Error during ${isEditing ? 'modification' : 'booking'}: ${response.status}`
                    );
                }
            }
            
            
            // Close dialog and reset form
            setIsDialogOpen(false);
            setAppointmentTitle("");
            setAppointmentDescription("");
            setSelectedTime("09:00");
            setDuration(30);
            setParticipants([{email: ''}]);
            setIsEditing(false);
            setCurrentAppointmentId(null);
            
            // Refresh appointment list
            const formattedDate = date.toISOString().split('T')[0];
            const updatedResponse = await fetch(`/api/appointments?date=${formattedDate}`);
            const updatedAppointments: Appointment[] = await updatedResponse.json();
            setAppointments(updatedAppointments);
            
            toast(`Appointment ${isEditing ? 'modified' : 'booked'} successfully!`);
        } catch (err) {
            toast(err instanceof Error ? err.message : `Error during ${isEditing ? 'modification' : 'booking'}`);
            console.error(`Error during ${isEditing ? 'modification' : 'booking'}:`, err);
        } finally {
            setLoading(false);
        }
    };
    
    // Delete an appointment
    const handleDeleteAppointment = async () => {
        if (!appointmentToDelete) return;
        
        setLoading(true);
        
        try {
            const response = await fetch(`/api/appointments/${appointmentToDelete}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error(`Error during deletion: ${response.status}`);
            }
            
            // Close confirmation dialog
            setIsDeleteDialogOpen(false);
            setAppointmentToDelete(null);
            
            // Refresh appointment list
            const formattedDate = date.toISOString().split('T')[0];
            const updatedResponse = await fetch(`/api/appointments?date=${formattedDate}`);
            const updatedAppointments: Appointment[] = await updatedResponse.json();
            setAppointments(updatedAppointments);
            
            toast('Appointment deleted successfully!');
        } catch (err) {
            toast(err instanceof Error ? err.message : 'Error during deletion');
            console.error('Error during deletion:', err);
        } finally {
            setLoading(false);
        }
    };
    
    // Generate time slots
    const generateTimeOptions = () => {
        const options = [];
        for (let hour = 9; hour <= 17; hour++) {
            for (let min = 0; min < 60; min += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
                options.push(timeString);
            }
        }
        return options;
    };
    
    // Generate duration options
    const generateDurationOptions = () => {
        const options = [15, 30, 45, 60, 90, 120]; // in minutes
        return options;
    };
    
    // Consistent date format to avoid hydration issues
    function formatConsistentDate(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    }
    
    // Format duration
    const formatDuration = (minutes: number) => {
        if (minutes < 60) {
            return `${minutes} min`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        if (remainingMinutes === 0) {
            return `${hours}h`;
        }
        return `${hours}h${remainingMinutes}`;
    };
    
    // Check if current user is the appointment creator
    const isCreator = (creatorId: string) => {
        return creatorId === currentUserId;
    };
    
 
    
    return (
        <div className="container mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Appointment Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Calendar (left column) */}
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Calendar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateChange}
                            className="rounded-md border"
                        />
                        
                        <div className="mt-4 text-center text-sm text-muted-foreground">
                            Selected date: <br />
                            <span className="font-medium">{formatConsistentDate(date)}</span>
                        </div>
                    </CardContent>
                </Card>
          
                
                {/* Appointment list (right column) */}
                <Card className="md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>
                            Appointments for {formatConsistentDate(date)}
                        </CardTitle>
                        <Button onClick={openBookingDialog}>
                            New Appointment
                        </Button>
                    </CardHeader>
                    
                    <CardContent>
                        {/* View filters */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            <Button 
                                variant={viewMode === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('all')}
                            >
                                All
                            </Button>
                            <Button 
                                variant={viewMode === 'created' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('created')}
                            >
                                My Appointments
                            </Button>
                            <Button 
                                variant={viewMode === 'participating' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setViewMode('participating')}
                            >
                                Where I Participate
                            </Button>
                        </div>
                        
                        {/* Loading states and appointment list */}
                        <div className="overflow-y-auto" style={{maxHeight: '500px'}}>
                            {loading && (
                                <p className="text-muted-foreground">Loading appointments...</p>
                            )}
                            
                            {error && (
                                <p className="text-destructive">{error}</p>
                            )}
                            
                            {!loading && filteredAppointments.length === 0 && (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground">No appointments for this date.</p>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={openBookingDialog}
                                        className="mt-4"
                                    >
                                        Create an appointment
                                    </Button>
                                </div>
                            )}
                            
                            <ul className="space-y-3">
                                {filteredAppointments.map(appointment => (
                                    <Card key={appointment.id} className="overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <div className="flex items-start justify-between">
                                                        <h4 className="font-bold">{appointment.title}</h4>
                                                        
                                                        <div className="flex space-x-1 ml-2">
                                                            {isCreator(appointment.creator_id) && (
                                                                <>
                                                                    <Button 
                                                                        onClick={() => openEditDialog(appointment)}
                                                                        size="icon"
                                                                        variant="ghost"
                                                                    >
                                                                        <Pencil size={16} />
                                                                        <span className="sr-only">Edit</span>
                                                                    </Button>
                                                                    <Button 
                                                                        onClick={() => openDeleteDialog(appointment.id, appointment.creator_id)}
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="text-destructive hover:text-destructive"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                        <span className="sr-only">Delete</span>
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    
                                                    {appointment.description && (
                                                        <p className="text-sm text-muted-foreground mt-1">{appointment.description}</p>
                                                    )}
                                                    
                                                    <div className="flex flex-wrap gap-4 mt-3">
                                                        <div className="flex items-center text-sm text-muted-foreground">
                                                            <Clock size={14} className="mr-1" />
                                                            <span>{appointment.appointment_time} ({formatDuration(appointment.duration || 30)})</span>
                                                        </div>
                                                        
                                                        <div className="flex items-center text-sm text-muted-foreground">
                                                            <Users size={14} className="mr-1" />
                                                            <span>Organizer: <span className="font-medium">{appointment.creator_name || 'User'}</span></span>
                                                        </div>
                                                    </div>
                                                    
                                                    {appointment.participants.length > 0 && (
                                                        <div className="mt-3">
                                                            <p className="text-xs font-medium text-muted-foreground mb-1">Participants:</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {appointment.participants.map((participant, index) => (
                                                                    <Badge 
                                                                        key={index} 
                                                                        variant={participant.is_confirmed ? "default" : "outline"}
                                                                        className="flex items-center gap-1"
                                                                    >
                                                                        {participant.email}
                                                                        {participant.is_confirmed && (
                                                                            <Check size={12} />
                                                                        )}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            {/* Booking dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "Edit Appointment" : "Create Appointment"}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                        <div className="grid w-full gap-2">
                            <label htmlFor="title" className="text-sm font-medium">
                                Title <span className="text-destructive">*</span>
                            </label>
                            <Input
                                id="title"
                                type="text"
                                value={appointmentTitle}
                                onChange={(e) => setAppointmentTitle(e.target.value)}
                                placeholder="Team meeting"
                                required
                            />
                        </div>
                        
                        <div className="grid w-full gap-2">
                            <label htmlFor="description" className="text-sm font-medium">
                                Description
                            </label>
                            <Textarea
                                id="description"
                                value={appointmentDescription}
                                onChange={(e) => setAppointmentDescription(e.target.value)}
                                placeholder="Appointment details..."
                                rows={3}
                            />
                        </div>
                        
                        <div className="grid w-full gap-2">
                            <label htmlFor="time" className="text-sm font-medium">
                                Time <span className="text-destructive">*</span>
                            </label>
                            <Select value={selectedTime} onValueChange={setSelectedTime}>
                                <SelectTrigger id="time">
                                    <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                                <SelectContent>
                                    {generateTimeOptions().map(time => (
                                        <SelectItem key={time} value={time}>
                                            {time}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="grid w-full gap-2">
                            <label htmlFor="duration" className="text-sm font-medium">
                                Duration <span className="text-destructive">*</span>
                            </label>
                            <Select 
                                value={duration.toString()} 
                                onValueChange={(value) => setDuration(parseInt(value))}
                            >
                                <SelectTrigger id="duration">
                                    <SelectValue placeholder="Select duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    {generateDurationOptions().map(minutes => (
                                        <SelectItem key={minutes} value={minutes.toString()}>
                                            {formatDuration(minutes)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="grid w-full gap-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium">
                                    Participants
                                </label>
                                <Button 
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addParticipant}
                                >
                                    <Plus size={16} />
                                </Button>
                            </div>
                            
                            {participants.map((participant, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <Input
                                        type="email"
                                        value={participant.email}
                                        onChange={(e) => handleParticipantChange(index, e.target.value)}
                                        placeholder="email@example.com"
                                        list="user-emails"
                                    />
                                    {participants.length > 1 && (
                                        <Button 
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={() => removeParticipant(index)}
                                        >
                                            &times;
                                        </Button>
                                    )}
                                </div>
                            ))}
                            
                            <datalist id="user-emails">
                                {availableUsers.map(user => (
                                    <option key={user.id} value={user.email} />
                                ))}
                            </datalist>
                            
                            <p className="text-xs text-muted-foreground">
                                Add participants if you want to share this appointment.
                            </p>
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                            Selected date: {formatConsistentDate(date)}
                        </div>
                    </div>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleBooking} disabled={loading}>
                            {loading ? 'Processing...' : isEditing ? 'Update' : 'Confirm'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {/* Delete dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this appointment?
                        </DialogDescription>
                    </DialogHeader>
                    
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={handleDeleteAppointment}
                            disabled={loading}
                        >
                            {loading ? 'Deleting...' : 'Delete'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}