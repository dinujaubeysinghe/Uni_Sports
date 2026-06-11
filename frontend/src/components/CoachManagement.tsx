/**
 * Coach Management Component
 * Complete React component for managing coaches assigned to a sport
 */

import React, { useState, useEffect, useCallback } from 'react';

interface Coach {
  _id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  isActive?: boolean;
  assignedSports?: string[];
}

interface Sport {
  _id: string;
  name: string;
  description: string;
  coaches: Coach[];
}

interface CoachManagementProps {
  sportId: string;
  token: string;
  onClose?: () => void;
}

const CoachManagement: React.FC<CoachManagementProps> = ({ 
  sportId, 
  token, 
  onClose 
}) => {
  // State
  const [assignedCoaches, setAssignedCoaches] = useState<Coach[]>([]);
  const [availableCoaches, setAvailableCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCoachId, setSelectedCoachId] = useState<string>('');
  const [sport, setSport] = useState<Sport | null>(null);

  // API Base URL (adjust as needed)
const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";


  /**
   * Load coaches data from API
   */
  const loadCoaches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch sport details
      const sportRes = await fetch(`${API_BASE}sports/${sportId}`);
      if (!sportRes.ok) throw new Error('Failed to fetch sport');
      const sportData = await sportRes.json();
      setSport(sportData.data);

      // Fetch assigned coaches
      const assignedRes = await fetch(`${API_BASE}sports/${sportId}/coaches`);
      if (!assignedRes.ok) throw new Error('Failed to fetch assigned coaches');
      const assignedData = await assignedRes.json();
      setAssignedCoaches(assignedData.data);

      // Fetch available coaches
      const availableRes = await fetch(
        `${API_BASE}sports/${sportId}/available-coaches`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (!availableRes.ok) throw new Error('Failed to fetch available coaches');
      const availableData = await availableRes.json();
      setAvailableCoaches(availableData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [sportId, token, API_BASE]);

  /**
   * Load coaches on component mount
   */
  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  /**
   * Assign coach to sport
   */
  const handleAssignCoach = async (coachId: string) => {
    setError(null);
    setSuccess(null);
    
    if (!coachId) {
      setError('Please select a coach');
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE}sports/${sportId}/coaches/${coachId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign coach');
      }

      const data = await response.json();
      setSuccess(`${data.data.coaches.find((c: Coach) => c._id === coachId)?.name} assigned successfully!`);
      setSelectedCoachId('');
      
      // Reload coaches
      await loadCoaches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign coach');
    }
  };

  /**
   * Remove coach from sport
   */
  const handleRemoveCoach = async (coachId: string, coachName: string) => {
    if (!window.confirm(`Remove ${coachName} from this sport?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(
        `${API_BASE}sports/${sportId}/coaches/${coachId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to remove coach');
      }

      setSuccess(`${coachName} removed successfully!`);
      
      // Reload coaches
      await loadCoaches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove coach');
    }
  };

  /**
   * Clear notifications
   */
  const clearNotifications = useCallback(() => {
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 3000);
  }, []);

  useEffect(() => {
    if (error || success) {
      clearNotifications();
    }
  }, [error, success, clearNotifications]);

  if (loading && !sport) {
    return (
      <div className="coach-management">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading coaches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="coach-management">
      {/* Header */}
      <div className="header">
        <h2>Coach Management for {sport?.name || 'Sport'}</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-error">
          <span className="icon">⚠️</span>
          <span>{error}</span>
          <button className="close-alert" onClick={() => setError(null)}>
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span className="icon">✓</span>
          <span>{success}</span>
          <button className="close-alert" onClick={() => setSuccess(null)}>
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="content">
        {/* Assigned Coaches Section */}
        <section className="assigned-section">
          <div className="section-header">
            <h3>Assigned Coaches</h3>
            <span className="count">{assignedCoaches.length}</span>
          </div>

          {assignedCoaches.length === 0 ? (
            <div className="empty-state">
              <p>No coaches assigned yet</p>
              <p className="hint">Use the form below to assign coaches to this sport</p>
            </div>
          ) : (
            <div className="coaches-list">
              {assignedCoaches.map((coach) => (
                <div key={coach._id} className="coach-card">
                  <div className="coach-info">
                    <h4>{coach.name}</h4>
                    <p className="specialization">{coach.specialization}</p>
                    <p className="contact-info">
                      <a href={`mailto:${coach.email}`}>{coach.email}</a>
                      {coach.phone && <span className="phone">{coach.phone}</span>}
                    </p>
                  </div>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRemoveCoach(coach._id, coach.name)}
                    disabled={loading}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Assignment Form */}
        <section className="assignment-section">
          <div className="section-header">
            <h3>Assign New Coach</h3>
          </div>

          {availableCoaches.length === 0 ? (
            <div className="empty-state">
              <p>All coaches are already assigned to this sport</p>
            </div>
          ) : (
            <div className="assignment-form">
              <div className="form-group">
                <label htmlFor="coach-select">Select Coach:</label>
                <select
                  id="coach-select"
                  value={selectedCoachId}
                  onChange={(e) => setSelectedCoachId(e.target.value)}
                  disabled={loading}
                >
                  <option value="">-- Choose a coach --</option>
                  {availableCoaches.map((coach) => (
                    <option key={coach._id} value={coach._id}>
                      {coach.name} ({coach.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleAssignCoach(selectedCoachId)}
                disabled={loading || !selectedCoachId}
              >
                {loading ? 'Assigning...' : 'Assign Coach'}
              </button>
            </div>
          )}
        </section>

        {/* Available Coaches List */}
        <section className="available-section">
          <div className="section-header">
            <h3>Available Coaches</h3>
            <span className="count">{availableCoaches.length}</span>
          </div>

          {availableCoaches.length === 0 ? (
            <div className="empty-state">
              <p>No available coaches</p>
            </div>
          ) : (
            <div className="coaches-list coaches-list-hover">
              {availableCoaches.map((coach) => (
                <div
                  key={coach._id}
                  className="coach-card"
                  onClick={() => {
                    setSelectedCoachId(coach._id);
                    setTimeout(() => handleAssignCoach(coach._id), 100);
                  }}
                >
                  <div className="coach-info">
                    <h4>{coach.name}</h4>
                    <p className="specialization">{coach.specialization}</p>
                    <p className="contact-info">
                      <a href={`mailto:${coach.email}`}>{coach.email}</a>
                      {coach.phone && <span className="phone">{coach.phone}</span>}
                    </p>
                  </div>
                  <div className="quick-assign">
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssignCoach(coach._id);
                      }}
                      disabled={loading}
                      title="Quick assign"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="footer">
        <button className="btn btn-secondary" onClick={() => loadCoaches()} disabled={loading}>
          Refresh
        </button>
        {onClose && (
          <button className="btn btn-tertiary" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
};

export default CoachManagement;
