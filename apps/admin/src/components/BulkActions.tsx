'use client';

import { useState } from 'react';
import styles from './bulk.module.css';

interface Movie {
    id: string;
    title: string;
    status: 'draft' | 'published';
    encodeStatus: 'pending' | 'processing' | 'ready' | 'failed';
}

type BulkAction = 'publish' | 'unpublish' | 'delete';

interface BulkActionsProps {
    movies: Movie[];
    onAction?: (action: BulkAction, ids: string[]) => void;
}

export function BulkActions({ movies, onAction }: BulkActionsProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showConfirm, setShowConfirm] = useState<BulkAction | null>(null);

    const allSelected = selectedIds.size === movies.length;
    const someSelected = selectedIds.size > 0;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(movies.map(m => m.id)));
        }
    };

    const toggleOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleAction = (action: BulkAction) => {
        if (selectedIds.size === 0) return;
        setShowConfirm(action);
    };

    const confirmAction = () => {
        if (showConfirm && onAction) {
            onAction(showConfirm, Array.from(selectedIds));
        }
        setShowConfirm(null);
        setSelectedIds(new Set());
    };

    const getActionLabel = (action: BulkAction) => {
        switch (action) {
            case 'publish': return 'Publish';
            case 'unpublish': return 'Unpublish';
            case 'delete': return 'Delete';
        }
    };

    return (
        <div className={styles.container}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
                <div className={styles.selectAll}>
                    <label className={styles.checkbox}>
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            ref={el => {
                                if (el) el.indeterminate = someSelected && !allSelected;
                            }}
                        />
                        <span>Select All ({movies.length})</span>
                    </label>
                </div>

                {someSelected && (
                    <div className={styles.actions}>
                        <span className={styles.selectedCount}>
                            {selectedIds.size} selected
                        </span>
                        <button
                            className={`${styles.actionBtn} ${styles.publish}`}
                            onClick={() => handleAction('publish')}
                        >
                            ▶️ Publish
                        </button>
                        <button
                            className={`${styles.actionBtn} ${styles.unpublish}`}
                            onClick={() => handleAction('unpublish')}
                        >
                            ⏸️ Unpublish
                        </button>
                        <button
                            className={`${styles.actionBtn} ${styles.delete}`}
                            onClick={() => handleAction('delete')}
                        >
                            🗑️ Delete
                        </button>
                    </div>
                )}
            </div>

            {/* Movie List */}
            <div className={styles.list}>
                {movies.map(movie => (
                    <div
                        key={movie.id}
                        className={`${styles.item} ${selectedIds.has(movie.id) ? styles.itemSelected : ''}`}
                    >
                        <label className={styles.itemCheckbox}>
                            <input
                                type="checkbox"
                                checked={selectedIds.has(movie.id)}
                                onChange={() => toggleOne(movie.id)}
                            />
                        </label>
                        <div className={styles.itemInfo}>
                            <span className={styles.itemTitle}>{movie.title}</span>
                            <div className={styles.itemBadges}>
                                <span className={`${styles.badge} ${styles[movie.status]}`}>
                                    {movie.status}
                                </span>
                                <span className={`${styles.badge} ${styles[movie.encodeStatus]}`}>
                                    {movie.encodeStatus}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirm Modal */}
            {showConfirm && (
                <div className={styles.modalOverlay} onClick={() => setShowConfirm(null)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <h3>Confirm {getActionLabel(showConfirm)}</h3>
                        <p>
                            Are you sure you want to {getActionLabel(showConfirm).toLowerCase()}{' '}
                            <strong>{selectedIds.size}</strong> movie(s)?
                        </p>
                        {showConfirm === 'delete' && (
                            <p className={styles.warning}>⚠️ This action cannot be undone!</p>
                        )}
                        <div className={styles.modalActions}>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => setShowConfirm(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className={`${styles.confirmBtn} ${showConfirm === 'delete' ? styles.confirmDanger : ''}`}
                                onClick={confirmAction}
                            >
                                {getActionLabel(showConfirm)}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
