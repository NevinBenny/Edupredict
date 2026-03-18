import { useState, useEffect } from 'react'
import { getFacultySubjects } from '../../services/api'
import { BookOpen, Calendar, MapPin, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const MyCourses = () => {
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const fetchCourses = async () => {
        try {
            setLoading(true)
            const data = await getFacultySubjects()
            setCourses(data.subjects || [])
        } catch (err) {
            console.error('Failed to fetch courses:', err)
            toast.error('Failed to load assigned courses')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCourses()
    }, [])

    const filteredCourses = courses.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loader"></div>
                <p>Loading your curriculum...</p>
            </div>
        )
    }

    return (
        <div className="my-courses-page">
            <header className="page-header-inline">
                <div>
                    <h2>My Assigned Courses</h2>
                    <p className="subtitle">Manage and view details for the subjects you are teaching this semester.</p>
                </div>

                <div className="search-box-container">
                    <div className="search-box">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Find a course..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {filteredCourses.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <BookOpen size={48} />
                    </div>
                    <h3>No subjects found</h3>
                    <p>You haven''t been assigned to any courses yet, or they don''t match your search.</p>
                </div>
            ) : (
                <div className="courses-grid">
                    {filteredCourses.map((course) => (
                        <div key={course.id} className="course-card">
                            <div className="course-badge">{course.department}</div>
                            <div className="course-main">
                                <span className="course-code">{course.code}</span>
                                <h3 className="course-name">{course.name}</h3>
                            </div>

                            <div className="course-info-row">
                                <div className="info-item">
                                    <Calendar size={14} />
                                    <span>Semester {course.semester}</span>
                                </div>
                                <div className="info-item">
                                    <MapPin size={14} />
                                    <span>Engineering Block</span>
                                </div>
                            </div>

                            <div className="course-footer">
                                <button className="view-detail-btn" onClick={() => toast.info('Syllabus details coming soon!')}>
                                    View Syllabus
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .my-courses-page {
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                .page-header-inline {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2.5rem;
                    gap: 2rem;
                }

                .page-header-inline h2 {
                    font-size: 2rem;
                    font-weight: 800;
                    color: var(--c-text-primary);
                    margin-bottom: 0.5rem;
                    letter-spacing: -0.5px;
                }

                .subtitle {
                    color: var(--c-text-tertiary);
                    font-size: 0.95rem;
                }

                .search-box-container {
                    flex: 0 0 350px;
                }

                .courses-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 1.5rem;
                }

                .course-card {
                    background: var(--c-surface);
                    border: 1px solid var(--c-border-subtle);
                    border-radius: 20px;
                    padding: 1.5rem;
                    position: relative;
                    transition: all 0.3s ease;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
                }

                .course-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 24px rgba(0,0,0,0.08);
                    border-color: var(--c-accent-primary);
                }

                .course-badge {
                    position: absolute;
                    top: 1.5rem;
                    right: 1.5rem;
                    background: rgba(25, 106, 229, 0.08);
                    color: var(--c-accent-primary);
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                .course-main {
                    margin-bottom: 1.5rem;
                    margin-top: 0.5rem;
                }

                .course-code {
                    display: block;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--c-accent-primary);
                    margin-bottom: 0.25rem;
                }

                .course-name {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--c-text-primary);
                    line-height: 1.3;
                }

                .course-info-row {
                    display: flex;
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                    padding-top: 1.5rem;
                    border-top: 1px dashed var(--c-border-subtle);
                }

                .info-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: var(--c-text-secondary);
                    font-size: 0.85rem;
                    font-weight: 500;
                }

                .course-footer {
                    margin-top: auto;
                }

                .view-detail-btn {
                    width: 100%;
                    padding: 10px;
                    background: var(--c-bg-app);
                    color: var(--c-text-primary);
                    border: 1px solid var(--c-border-subtle);
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .view-detail-btn:hover {
                    background: var(--c-accent-primary);
                    color: white;
                    border-color: var(--c-accent-primary);
                }

                .empty-state {
                    text-align: center;
                    padding: 5rem 2rem;
                    background: var(--c-surface);
                    border-radius: 24px;
                    border: 2px dashed var(--c-border-subtle);
                }

                .empty-icon {
                    color: var(--c-text-tertiary);
                    margin-bottom: 1.5rem;
                    opacity: 0.5;
                }

                .empty-state h3 {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--c-text-primary);
                    margin-bottom: 0.5rem;
                }

                .empty-state p {
                    color: var(--c-text-tertiary);
                }

                @media (max-width: 768px) {
                    .page-header-inline {
                        flex-direction: column;
                        gap: 1.5rem;
                    }
                    .search-box-container {
                        flex: 1;
                        width: 100%;
                    }
                }
            `}} />
        </div>
    )
}

export default MyCourses
