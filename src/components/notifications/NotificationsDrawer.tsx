import React, { useState } from 'react';
import { 
  Bell, 
  Check, 
  Clock, 
  ExternalLink, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { InAppNotification } from '../../types';
import { markNotificationAsRead } from '../../services/userService';

interface NotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onNavigateToEntity?: (entityId: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onNavigateToEntity
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.readAt).length;

  const handleMarkRead = async (id: string) => {
    await markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    for (const n of notifications) {
      if (!n.readAt) {
        await markNotificationAsRead(n.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div 
        id="notifications-drawer"
        className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Civic Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <Bell className="w-8 h-8 mx-auto text-slate-300" />
              <div className="text-xs font-medium">No notifications yet</div>
              <p className="text-[11px] text-slate-400">
                You will receive updates when submissions are approved or reports resolved.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isRead = !!notif.readAt;
              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!isRead) handleMarkRead(notif.id);
                    if (notif.relatedEntityId && onNavigateToEntity) {
                      onNavigateToEntity(notif.relatedEntityId);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isRead
                      ? 'bg-white border-slate-200/80 text-slate-600'
                      : 'bg-emerald-50/40 border-emerald-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                      {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0"></span>}
                      <span>{notif.title}</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    {notif.message}
                  </p>

                  {notif.relatedEntityId && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline">
                      <span>View Asset Reference</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
