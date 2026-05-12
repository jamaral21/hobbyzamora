import { useMemo, useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/design-system/Button';
import { Card } from '../../components/design-system/Card';
import { productsAPI } from '../../lib/api';
import { useStoreSections } from '../../hooks/useData';
import { buildSectionGroups } from '../../lib/sections';

export default function SectionsConfigPage() {
  const { data, isLoading, refetch } = useStoreSections();
  const [draftByParent, setDraftByParent] = useState<Record<string, string>>({});
  const [savingParent, setSavingParent] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const groups = useMemo(() => buildSectionGroups(data || []), [data]);

  const handleCreate = async (parentCategory: string) => {
    const value = String(draftByParent[parentCategory] || '').trim();
    if (!value) return;

    setError('');
    setSavingParent(parentCategory);
    try {
      await productsAPI.createSubsection(parentCategory, value);
      setDraftByParent((prev) => ({ ...prev, [parentCategory]: '' }));
      await refetch();
    } catch (err: any) {
      setError(err?.message || 'No se pudo crear la subsección');
    } finally {
      setSavingParent(null);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('¿Eliminar esta subsección? Los productos seguirán existiendo pero deberás reasignarlos manualmente si corresponde.');
    if (!confirmed) return;

    setError('');
    setDeletingId(id);
    try {
      await productsAPI.deleteSubsection(id);
      await refetch();
    } catch (err: any) {
      setError(err?.message || 'No se pudo eliminar la subsección');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl text-foreground mb-2">Configuración de secciones</h1>
          <p className="text-muted-foreground">
            Las secciones principales son fijas. Aquí puedes agregar o eliminar subsecciones hijas.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groups.map((group) => (
              <Card key={group.parentCategory} className="p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{group.parentCategory}</h2>
                  <p className="text-xs text-muted-foreground">Sección principal no editable</p>
                </div>

                <div className="space-y-2">
                  {group.children.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin subsecciones</p>
                  ) : (
                    group.children.map((child) => (
                      <div key={child.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                        <span className="text-sm text-foreground">{child.name}</span>
                        <button
                          onClick={() => handleDelete(child.id)}
                          disabled={deletingId === child.id}
                          className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 disabled:opacity-60"
                        >
                          {deletingId === child.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Eliminar
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    value={draftByParent[group.parentCategory] || ''}
                    onChange={(e) =>
                      setDraftByParent((prev) => ({
                        ...prev,
                        [group.parentCategory]: e.target.value,
                      }))
                    }
                    placeholder="Nueva subsección"
                    className="flex-1 rounded-lg border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <Button
                    onClick={() => handleCreate(group.parentCategory)}
                    disabled={savingParent === group.parentCategory}
                  >
                    {savingParent === group.parentCategory ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Agregar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
