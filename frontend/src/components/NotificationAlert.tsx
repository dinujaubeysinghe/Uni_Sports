/**
 * Notification Alert Component
 * Displays real-time notifications for coaches and admins
 */

import React, { useState, useEffect, useCallback } from 'react';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedSport?: {
    name: string;
    _id: string;
  };
  relatedLocationBookingRequest?: {
    status: string;
    location: {
      name: string;
    };
  };
}

interface NotificationAlertProps {
  token: string;
  userId: string;
  role: 'admin' | 'coach' | 'student';
  onNotificationReceived?: (notification: Notification) => void;
}

const NotificationAlert: React.FC<NotificationAlertProps> = ({
  token,
  userId,
  role,
  onNotificationReceived,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

 const API_BASE = import.meta.env.VITE_API_URL ?? "https://unisports-8upjo.ondigitalocean.app/";


  /**
   * Fetch notifications
   */
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}notifications`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) return;

      const data = await response.json();
      setNotifications(data.data);
      setUnreadCount(data.data.filter((n: Notification) => !n.isRead).length);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, [token, API_BASE]);

  /**
   * Fetch notifications on mount and poll every 10 seconds
   */
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  /**
   * Mark notification as read
   */
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetch(`${API_BASE}notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  /**
   * Delete notification
   */
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      await fetch(`${API_BASE}notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      const deletedNotif = notifications.find((n) => n._id === notificationId);
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  /**
   * Get icon for notification type
   */
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'coach_assigned_to_sport':
        return '🎯';
      case 'location_booking_approved':
        return '✅';
      case 'location_booking_declined':
        return '❌';
      case 'location_booking_clash':
        return '⚠️';
      case 'location_booking_request_submitted':
        return '📝';
      case 'admin_location_booking_request':
        return '📋';
      case 'join_request_accepted':
        return '👍';
      case 'join_request_rejected':
        return '👎';
      case 'session_time_change':
        return '🔔';
      case 'session_cancelled':
        return '❌';
      default:
        return '📢';
    }
  };

  /**
   * Get color class for notification type
   */
  const getNotificationClass = (type: string) => {
    switch (type) {
      case 'coach_assigned_to_sport':
        return 'notification-info';
      case 'location_booking_approved':
        return 'notification-success';
      case 'location_booking_declined':
        return 'notification-error';
      case 'location_booking_clash':
        return 'notification-warning';
      case 'location_booking_request_submitted':
        return 'notification-info';
      case 'admin_location_booking_request':
        return 'notification-info';
      default:
        return 'notification-default';
    }
  };

  /**
   * Format time ago
   */
  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="notification-alert">
      {/* Notification Bell */}
      <div className="notification-bell">
        <button
          className="bell-button"
          onClick={() => setShowNotifications(!showNotifications)}
          title="Notifications"
        >
          🔔
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="notification-dropdown">
            <div className="notification-header">
              <h3>Notifications</h3>
              <button
                className="close-button"
                onClick={() => setShowNotifications(false)}
              >
                ✕
              </button>
            </div>

            {notifications.length === 0 ? (
              <div className="empty-notifications">
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`notification-item ${getNotificationClass(
                      notification.type
                    )} ${!notification.isRead ? 'unread' : ''}`}
                  >
                    <div className="notification-icon">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div
                      className="notification-content"
                      onClick={() => {
                        if (!notification.isRead) {
                          handleMarkAsRead(notification._id);
                        }
                      }}
                    >
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </div>

                    <button
                      className="delete-button"
                      onClick={() => handleDeleteNotification(notification._id)}
                      title="Delete notification"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {notifications.length > 0 && (
              <div className="notification-footer">
                <button
                  className="mark-all-read"
                  onClick={() => {
                    notifications
                      .filter((n) => !n.isRead)
                      .forEach((n) => handleMarkAsRead(n._id));
                  }}
                >
                  Mark all as read
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlay */}
      {showNotifications && (
        <div
          className="notification-overlay"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
};

export default NotificationAlert;
