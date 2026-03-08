import React, { useState, useEffect } from 'react';
import { UploadCloud, FileType, CheckCircle, AlertTriangle, Users } from 'lucide-react';
import './AdminPanel.css';

/**
 * StudentManagement - Admin page for bulk batch uploading student records via CSV.
 */
const StudentManagement = () => {
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [students, setStudents] = useState([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            const response = await fetch('http://localhost:5000/api/admin/students', {
                credentials: 'omit'
            });
            if (response.ok) {
                const data = await response.json();
                setStudents(data.students);
            }
        } catch (err) {
            console.error("Failed to fetch students");
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleResetPassword = async (studentDbId, studentName) => {
        if (!window.confirm(`Are you sure you want to reset the password for ${studentName}?`)) return;

        try {
            const response = await fetch(`http://localhost:5000/api/admin/students/${studentDbId}/reset-password`, {
                method: 'POST',
                credentials: 'omit'
            });
            const data = await response.json();

            if (response.ok) {
                alert(`SUCCESS! Please give this NEW password to ${studentName}:\n\n${data.new_password}\n\nThey will be forced to change it on their next login.`);
            } else {
                alert(`Error: ${data.error || data.message}`);
            }
        } catch (err) {
            alert("Network error while resetting password.");
        }
    };

    const downloadCredentials = () => {
        if (!uploadResult?.details?.credentials) return;

        const creds = uploadResult.details.credentials;
        if (creds.length === 0) {
            alert("No credentials generated in this batch.");
            return;
        }

        let csvContent = "Name,Email,Generated_Password\n";
        creds.forEach(c => {
            csvContent += `"${c.name}","${c.email}","${c.password}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edupredict_generated_credentials_${new Date().getTime()}.csv`;
        a.click();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && droppedFile.type === 'text/csv') {
            setFile(droppedFile);
            setUploadResult(null);
        } else {
            alert("Please upload a valid CSV file.");
        }
    };

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setUploadResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setUploadResult(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('http://localhost:5000/api/admin/students/batch-upload', {
                method: 'POST',
                // Assuming admin check requires credentials/session cookie
                credentials: 'omit', // If using JWT, add headers instead
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                setUploadResult({
                    success: true,
                    message: data.message,
                    details: data.results
                });
                setFile(null); // Clear selected file after success
                fetchStudents(); // Refresh the list Below
            } else {
                setUploadResult({
                    success: false,
                    message: data.message || "Upload failed."
                });
            }
        } catch (err) {
            setUploadResult({
                success: false,
                message: "A network error occurred during upload."
            });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="dash-container minimal">
            <div className="section-header">
                <div>
                    <h3>Student Management & Cohort Enrollment</h3>
                    <p>Bulk upload student records into the system.</p>
                </div>
            </div>

            <div className="split-layout">
                {/* Upload Section */}
                <div className="dashboard-panel">
                    <h2><UploadCloud size={20} /> Bulk CSV Import</h2>
                    <p style={{ color: 'var(--c-text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        Upload a CSV file to enroll a new cohort of students. Existing Student IDs will be safely skipped.
                        <strong> New accounts will be given unique, auto-generated passwords.</strong>
                    </p>

                    <div
                        className={`csv-dropzone ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('csv-upload').click()}
                    >
                        <input
                            type="file"
                            id="csv-upload"
                            accept=".csv"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />

                        {file ? (
                            <div className="file-preview">
                                <FileType size={48} color="var(--c-primary)" />
                                <h4>{file.name}</h4>
                                <p>{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                        ) : (
                            <div className="dropzone-prompt">
                                <UploadCloud size={48} opacity={0.5} />
                                <h4>Click or drag & drop CSV here</h4>
                                <p>Strictly .csv files matching the template structure</p>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                            className="btn-primary"
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            style={{ flex: 1, padding: '0.75rem' }}
                        >
                            {uploading ? 'Processing Batch...' : 'Begin Import'}
                        </button>
                        {file && (
                            <button
                                className="btn-secondary-action"
                                onClick={() => setFile(null)}
                                disabled={uploading}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {uploadResult && (
                        <div className={`upload-status-alert ${uploadResult.success ? 'success' : 'error'}`}>
                            <div className="status-header">
                                {uploadResult.success ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                                <strong>{uploadResult.message}</strong>
                            </div>

                            {uploadResult.details && (
                                <div className="status-details">
                                    <div className="stat-pill success">
                                        <span className="label">Successfully Inserted</span>
                                        <span className="value">{uploadResult.details.inserted}</span>
                                    </div>
                                    <div className="stat-pill warning">
                                        <span className="label">Duplicates Skipped</span>
                                        <span className="value">{uploadResult.details.skipped}</span>
                                    </div>

                                    {uploadResult.details.errors && uploadResult.details.errors.length > 0 && (
                                        <div className="error-log">
                                            <strong>Errors encountered:</strong>
                                            <ul>
                                                {uploadResult.details.errors.map((err, i) => <li key={i}>{err}</li>)}
                                            </ul>
                                        </div>
                                    )}
                                    {uploadResult.details.credentials && uploadResult.details.credentials.length > 0 && (
                                        <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '1rem' }}>
                                            <p style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                                <strong>{uploadResult.details.credentials.length} unique passwords generated.</strong>
                                            </p>
                                            <button className="btn-primary" onClick={downloadCredentials}>
                                                Download Passwords CSV
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Instructions Section */}
                <div className="dashboard-panel" style={{ background: 'var(--c-bg-tertiary)' }}>
                    <h2><FileType size={20} /> CSV Formatting Guide</h2>
                    <p style={{ color: 'var(--c-text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                        To ensure successful bulk import, your CSV must contain the following headers exactly as written below.
                    </p>

                    <ul className="format-list">
                        <li><code>student_id</code> <span className="req">(Required) Unique college ID e.g., MCA24001</span></li>
                        <li><code>name</code> <span className="req">(Required) Full Name</span></li>
                        <li><code>email</code> <span className="req">(Required) Student login email</span></li>
                        <li><code>department</code> <span className="req">(Required) e.g., MCA, BTech CSE</span></li>
                        <li><code>semester</code> <span className="req">(Required) e.g., 4</span></li>
                        <li><code>attendance_percentage</code> <span className="opt">(Optional) 0-100</span></li>
                        <li><code>internal_marks</code> <span className="opt">(Optional) out of 50</span></li>
                        <li><code>assignment_score</code> <span className="opt">(Optional) out of 25</span></li>
                        <li><code>sgpa</code> <span className="opt">(Optional) Previous SGPA 0-10</span></li>
                        <li><code>backlogs</code> <span className="opt">(Optional) Integer count</span></li>
                        <li><code>class_id</code> <span className="opt">(Optional) DB ID of assigned class group</span></li>
                    </ul>

                    <div className="template-download">
                        <p>Need a starting point?</p>
                        <button className="btn-secondary-action" onClick={() => {
                            const headers = "student_id,name,email,department,semester,attendance_percentage,internal_marks,assignment_score,sgpa,backlogs,class_id\nMCA99001,John Doe,john@example.com,MCA,1,85,40,20,7.5,0,1";
                            const blob = new Blob([headers], { type: 'text/csv' });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'edupredict_student_template.csv';
                            a.click();
                        }}>
                            Download Template CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Students List Section */}
            <div className="dashboard-panel" style={{ marginTop: '2rem' }}>
                <h2><Users size={20} /> Provisioned Students Directory</h2>
                <div style={{ overflowX: 'auto', marginTop: '1.5rem' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Student ID</th>
                                <th>Name</th>
                                <th>Email (Login)</th>
                                <th>Department</th>
                                <th>Sem</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingStudents ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading students...</td></tr>
                            ) : students.length === 0 ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No students enrolled yet.</td></tr>
                            ) : (
                                students.map((stu) => (
                                    <tr key={stu.db_id}>
                                        <td><strong>{stu.student_id}</strong></td>
                                        <td>{stu.name}</td>
                                        <td>{stu.email}</td>
                                        <td>{stu.department}</td>
                                        <td>{stu.semester}</td>
                                        <td>
                                            <button
                                                className="btn-secondary-action"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                                onClick={() => handleResetPassword(stu.db_id, stu.name)}
                                            >
                                                Reset Password
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default StudentManagement;
