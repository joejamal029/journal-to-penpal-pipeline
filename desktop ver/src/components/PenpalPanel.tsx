import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { createPenpal, updatePenpal, addCorrespondence, getCorrespondence } from '../services/penpalService';
import { Penpal, Correspondence } from '../types';
import { UserPlus, Edit, Mail, Send, Calendar, Globe, Tag, BookOpen, ChevronLeft, Save } from 'lucide-react';

export const PenpalPanel: React.FC = () => {
  const { penpals, loadPenpals, openNewLetter } = useAppStore();

  const [selectedPenpalId, setSelectedPenpalId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  
  // Form States
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [interests, setInterests] = useState('');
  const [topics, setTopics] = useState('');
  const [notes, setNotes] = useState('');

  // Correspondence States
  const [correspondenceList, setCorrespondenceList] = useState<Correspondence[]>([]);
  const [showAddCorr, setShowAddCorr] = useState(false);
  const [corrDirection, setCorrDirection] = useState<'sent' | 'received'>('received');
  const [corrContent, setCorrContent] = useState('');
  const [corrDate, setCorrDate] = useState('');

  // Load penpals on mount
  useEffect(() => {
    loadPenpals();
  }, []);

  const selectedPenpal = penpals.find((p) => p.id === selectedPenpalId);

  // Load correspondence whenever a penpal is selected/opened
  useEffect(() => {
    if (selectedPenpalId) {
      fetchCorrespondence(selectedPenpalId);
    }
  }, [selectedPenpalId]);

  const fetchCorrespondence = async (id: string) => {
    try {
      const data = await getCorrespondence(id);
      setCorrespondenceList(data);
    } catch (e) {
      console.error('Failed to fetch correspondence:', e);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Name is required');

    try {
      const newPenpal = await createPenpal(name, country, interests, topics, notes);
      await loadPenpals();
      setSelectedPenpalId(newPenpal.id);
      setViewMode('detail');
      resetForm();
    } catch (err: any) {
      alert(`Error creating penpal: ${err}`);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPenpalId || !name.trim()) return;

    try {
      await updatePenpal(selectedPenpalId, name, country, interests, topics, notes);
      await loadPenpals();
      setViewMode('detail');
      resetForm();
    } catch (err: any) {
      alert(`Error updating penpal: ${err}`);
    }
  };

  const handleAddCorrespondenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPenpalId || !corrContent.trim() || !corrDate) {
      return alert('Content and Letter Date are required.');
    }

    try {
      await addCorrespondence(selectedPenpalId, corrDirection, corrContent, corrDate);
      setCorrContent('');
      setCorrDate('');
      setShowAddCorr(false);
      fetchCorrespondence(selectedPenpalId);
    } catch (err: any) {
      alert(`Error logging letter: ${err}`);
    }
  };

  const startEdit = (penpal: Penpal) => {
    setName(penpal.name);
    setCountry(penpal.country);
    setInterests(penpal.interests);
    setTopics(penpal.topics);
    setNotes(penpal.notes);
    setViewMode('edit');
  };

  const resetForm = () => {
    setName('');
    setCountry('');
    setInterests('');
    setTopics('');
    setNotes('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel Header */}
      <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>Penpal Workspace</h2>
      </div>

      {/* Main Workspace Scroll Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)' }}>
        {viewMode === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <button
              onClick={() => {
                resetForm();
                setViewMode('create');
              }}
              style={{
                width: '100%',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
              onMouseOut={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
            >
              <UserPlus size={16} />
              Add New Penpal
            </button>

            {/* List View */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {penpals.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: 'var(--space-8)' }}>
                  No penpals added yet.
                </div>
              ) : (
                penpals.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPenpalId(p.id);
                      setViewMode('detail');
                    }}
                    style={{
                      background: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-3)',
                      cursor: 'pointer',
                      transition: 'border var(--transition-fast)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>{p.name}</div>
                      {p.letterCount !== undefined && p.letterCount > 0 && (
                        <span style={{ fontSize: '10px', background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '1px 6px', fontWeight: 'var(--weight-semibold)' }}>
                          {p.letterCount} letter{p.letterCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Globe size={10} />
                        {p.country || 'No Country'}
                      </div>
                      {p.lastLetterDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px' }}>
                          <Calendar size={10} />
                          {p.lastLetterDate}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Create Profile Form */}
        {(viewMode === 'create' || viewMode === 'edit') && (
          <form onSubmit={viewMode === 'create' ? handleCreate : handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <button
                type="button"
                onClick={() => setViewMode(viewMode === 'create' ? 'list' : 'detail')}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
              >
                <ChevronLeft size={16} />
              </button>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-semibold)' }}>
                {viewMode === 'create' ? 'Create Penpal Profile' : 'Edit Penpal Profile'}
              </h3>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 'var(--weight-semibold)' }}>NAME *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Penpal's Name"
                required
                style={{
                  width: '100%',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 'var(--weight-semibold)' }}>COUNTRY</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Country Location"
                style={{
                  width: '100%',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 'var(--weight-semibold)' }}>INTERESTS</label>
              <input
                type="text"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="e.g. Reading, Hiking, Cooking"
                style={{
                  width: '100%',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 'var(--weight-semibold)' }}>TOPICS</label>
              <input
                type="text"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="Topics to write about..."
                style={{
                  width: '100%',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginBottom: '4px', fontWeight: 'var(--weight-semibold)' }}>NOTES</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Personal notes, biography details, past discussions..."
                rows={4}
                style={{
                  width: '100%',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  color: 'var(--color-text-primary)',
                  fontSize: 'var(--text-sm)',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                background: 'var(--color-primary)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--weight-semibold)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-2)',
              }}
            >
              <Save size={16} />
              {viewMode === 'create' ? 'Save Profile' : 'Update Profile'}
            </button>
          </form>
        )}

        {/* Profile Detail View */}
        {viewMode === 'detail' && selectedPenpal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Navigation back and edit buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: 'var(--text-xs)',
                  padding: 0,
                }}
              >
                <ChevronLeft size={14} />
                Penpals List
              </button>

              <button
                onClick={() => startEdit(selectedPenpal)}
                style={{
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  fontSize: 'var(--text-xs)',
                  padding: 'var(--space-1) var(--space-2)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Edit size={10} />
                Edit Profile
              </button>
            </div>

            {/* Profile Summary Card */}
            <div style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: 'var(--color-text-primary)' }}>{selectedPenpal.name}</h3>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: '6px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Globe size={12} />
                    {selectedPenpal.country || 'No Country Registered'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Mail size={12} />
                    {selectedPenpal.letterCount || 0} letter{(selectedPenpal.letterCount || 0) !== 1 ? 's' : ''}
                  </div>
                  {selectedPenpal.lastLetterDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} />
                      Last: {selectedPenpal.lastLetterDate}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <button
                onClick={async () => {
                  try {
                    await openNewLetter(selectedPenpal.id);
                  } catch (e: any) {
                    alert(`Failed to open letter draft: ${e.message || e}`);
                  }
                }}
                style={{
                  width: '100%',
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 'var(--weight-semibold)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                onMouseOut={(e) => (e.currentTarget.style.background = 'var(--color-primary)')}
              >
                <Mail size={16} />
                Write Letter Draft
              </button>
            </div>

            {/* Structured details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Tag size={10} />
                  Interests
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', paddingLeft: '14px' }}>
                  {selectedPenpal.interests || 'None specified'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <BookOpen size={10} />
                  Discussable Topics
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', paddingLeft: '14px' }}>
                  {selectedPenpal.topics || 'None specified'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--weight-bold)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Globe size={10} />
                  Notes & Bio
                </div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', paddingLeft: '14px', whiteSpace: 'pre-wrap' }}>
                  {selectedPenpal.notes || 'No biographical notes recorded.'}
                </div>
              </div>
            </div>

            {/* Correspondence Section */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--color-text-primary)' }}>Letters Archive</h4>
                <button
                  onClick={() => setShowAddCorr(!showAddCorr)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--weight-semibold)',
                    padding: 0,
                  }}
                >
                  {showAddCorr ? 'Cancel' : 'Log Past Letter'}
                </button>
              </div>

              {/* Log Correspondence Form */}
              {showAddCorr && (
                <form onSubmit={handleAddCorrespondenceSubmit} style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={() => setCorrDirection('received')}
                      style={{
                        flex: 1,
                        background: corrDirection === 'received' ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: corrDirection === 'received' ? 'white' : 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 0',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--weight-semibold)',
                        cursor: 'pointer',
                      }}
                    >
                      Received
                    </button>
                    <button
                      type="button"
                      onClick={() => setCorrDirection('sent')}
                      style={{
                        flex: 1,
                        background: corrDirection === 'sent' ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: corrDirection === 'sent' ? 'white' : 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 0',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 'var(--weight-semibold)',
                        cursor: 'pointer',
                      }}
                    >
                      Sent
                    </button>
                  </div>

                  <div>
                    <input
                      type="date"
                      value={corrDate}
                      onChange={(e) => setCorrDate(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        color: 'var(--color-text-primary)',
                        fontSize: 'var(--text-xs)',
                      }}
                    />
                  </div>

                  <div>
                    <textarea
                      value={corrContent}
                      onChange={(e) => setCorrContent(e.target.value)}
                      placeholder="Letter content (plain text)"
                      rows={3}
                      required
                      style={{
                        width: '100%',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '4px 8px',
                        color: 'var(--color-text-primary)',
                        fontSize: 'var(--text-xs)',
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      background: 'var(--color-primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-1) 0',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--weight-semibold)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Send size={10} />
                    Log Record
                  </button>
                </form>
              )}

              {/* Correspondence history list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {correspondenceList.length === 0 ? (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-4)' }}>
                    No recorded correspondence.
                  </div>
                ) : (
                  correspondenceList.map((c) => (
                    <div key={c.id} style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-1)' }}>
                        <span
                          style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: 'var(--weight-bold)',
                            color: c.direction === 'sent' ? 'var(--color-primary)' : 'var(--color-success)',
                          }}
                        >
                          {c.direction === 'sent' ? 'Sent Letter' : 'Received Letter'}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Calendar size={10} />
                          {c.letterDate}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 'var(--leading-sm)' }}>
                        {c.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
