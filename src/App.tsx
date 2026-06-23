/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, QualityInspectionLog, ProcessAuditLog, UserRole } from './types';
import { generateSeedData } from './data';
import Login from './components/Login';
import TechnicianWorkspace from './components/TechnicianWorkspace';
import SupervisorWorkspace from './components/SupervisorWorkspace';
import ManagerWorkspace from './components/ManagerWorkspace';

export default function App() {
  // 1. Session Persistence state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // 2. Hydrate Inspections and Process Audits state with LocalStorage or seed data
  const [inspections, setInspections] = useState<QualityInspectionLog[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_inspections');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse inspections from localStorage', e);
    }
    // No prior storage, generate rich weekly historical seed data!
    const seed = generateSeedData();
    localStorage.setItem('elaraby_qa_inspections', JSON.stringify(seed.inspections));
    localStorage.setItem('elaraby_qa_process_audits', JSON.stringify(seed.audits));
    return seed.inspections;
  });

  const [processAudits, setProcessAudits] = useState<ProcessAuditLog[]>(() => {
    try {
      const stored = localStorage.getItem('elaraby_qa_process_audits');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse process audits from localStorage', e);
    }
    // Seed is generated above concurrently
    return [];
  });

  // Keep localStorage sync'd
  useEffect(() => {
    localStorage.setItem('elaraby_qa_inspections', JSON.stringify(inspections));
  }, [inspections]);

  useEffect(() => {
    localStorage.setItem('elaraby_qa_process_audits', JSON.stringify(processAudits));
  }, [processAudits]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('elaraby_qa_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('elaraby_qa_current_user');
    }
  }, [currentUser]);

  // Auth Operations
  const handleLogin = (role: UserRole, identifier: string, name: string) => {
    if (role === 'TECHNICIAN') {
      setCurrentUser({
        id: `USER-${identifier}`,
        name,
        role,
        sapNumber: identifier,
      });
    } else {
      setCurrentUser({
        id: `USER-${role}-${Date.now()}`,
        name,
        role,
        code: identifier,
      });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Inspections Operations
  const handleAddInspection = (log: QualityInspectionLog) => {
    setInspections((prev) => [log, ...prev]);
  };

  const handleUpdateInspection = (id: string, updates: Partial<QualityInspectionLog>) => {
    setInspections((prev) =>
      prev.map((log) => (log.id === id ? { ...log, ...updates } : log))
    );
  };

  // Process Audits Operations
  const handleAddProcessAudit = (audit: ProcessAuditLog) => {
    setProcessAudits((prev) => [audit, ...prev]);
  };

  return (
    <div className="bg-neutral-50 min-h-screen text-zinc-800 selection:bg-red-500 selection:text-white antialiased">
      {currentUser === null ? (
        <Login onLogin={handleLogin} />
      ) : currentUser.role === 'TECHNICIAN' ? (
        <TechnicianWorkspace
          user={currentUser}
          onLogout={handleLogout}
          inspections={inspections}
          onAddInspection={handleAddInspection}
        />
      ) : currentUser.role === 'SUPERVISOR' ? (
        <SupervisorWorkspace
          user={currentUser}
          onLogout={handleLogout}
          inspections={inspections}
          onUpdateInspection={handleUpdateInspection}
          processAudits={processAudits}
          onAddProcessAudit={handleAddProcessAudit}
        />
      ) : (
        <ManagerWorkspace
          user={currentUser}
          onLogout={handleLogout}
          inspections={inspections}
          processAudits={processAudits}
        />
      )}
    </div>
  );
}
